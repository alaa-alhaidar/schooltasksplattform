-- School-scoped admin access and read-only student permissions.

alter table public.profiles
  add column if not exists school_id uuid references public.schooltowns(id) on delete set null;

create table if not exists public.admin_allowlist (
  email text primary key,
  school_id uuid not null references public.schooltowns(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_allowlist enable row level security;

insert into public.admin_allowlist (email, school_id)
select 'konsens.admin.scholl@bluesoft.com', id
from public.schooltowns
where schoolname = 'scholl'
on conflict (email) do update set school_id = excluded.school_id;

-- Connect existing profiles to their school.
update public.profiles profile
set school_id = class.school_id
from public.class_memberships membership
join public.classes class on class.id = membership.class_id
where membership.user_id = profile.id
  and profile.school_id is null;

update public.profiles profile
set school_id = school.id
from public.schooltowns school
where profile.school_id is null
  and school.schoolname = split_part(split_part(profile.email, '@', 2), '.', 1);

update public.profiles profile
set role = 'school_admin', school_id = allowlist.school_id, updated_at = now()
from public.admin_allowlist allowlist
where lower(profile.email) = lower(allowlist.email);

create index if not exists profiles_school_role_idx
  on public.profiles (school_id, role);

-- Students may only read assignments for their own classes. Staff are school-scoped.
drop policy if exists "Anyone can view assignments" on public.assignments;
drop policy if exists "Schools can view assignments for their class" on public.assignments;
drop policy if exists "Students can view assignments for their class" on public.assignments;
drop policy if exists "Authenticated users can view assignments" on public.assignments;
drop policy if exists "Teachers can create assignments" on public.assignments;
drop policy if exists "Teachers can update their own assignments" on public.assignments;
drop policy if exists "Teachers can update assignments" on public.assignments;
drop policy if exists "Teachers can delete assignments" on public.assignments;

create policy "Class members and school staff can view assignments"
  on public.assignments for select to authenticated
  using (
    exists (
      select 1
      from public.profiles profile
      where profile.id = auth.uid()
        and profile.school_id = assignments.school
        and profile.role in ('teacher', 'school_admin')
    )
    or exists (
      select 1
      from public.class_memberships membership
      join public.classes class on class.id = membership.class_id
      where membership.user_id = auth.uid()
        and class.school_id = assignments.school
        and class.class_level = assignments.class_level
        and class.subclass = assignments.subclass
    )
  );

create policy "School staff can create assignments"
  on public.assignments for insert to authenticated
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.school_id = assignments.school
        and profile.role in ('teacher', 'school_admin')
    )
  );

create policy "School staff can update assignments"
  on public.assignments for update to authenticated
  using (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.school_id = assignments.school
        and profile.role in ('teacher', 'school_admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.school_id = assignments.school
        and profile.role in ('teacher', 'school_admin')
    )
  );

create policy "School staff can delete assignments"
  on public.assignments for delete to authenticated
  using (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.school_id = assignments.school
        and profile.role in ('teacher', 'school_admin')
    )
  );

-- Notifications follow the same school/class boundary; students cannot update them.
drop policy if exists "Teachers can create notifications" on public.notifications;
drop policy if exists "Teachers can read their own notifications" on public.notifications;
drop policy if exists "Students can read notifications for their class" on public.notifications;
drop policy if exists "Authenticated users can view notifications" on public.notifications;
drop policy if exists "Authenticated users can mark notifications read" on public.notifications;
drop policy if exists "Teachers can delete notifications" on public.notifications;

create policy "Class members and school staff can view notifications"
  on public.notifications for select to authenticated
  using (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.school_id = notifications.school_id
        and profile.role in ('teacher', 'school_admin')
    )
    or exists (
      select 1
      from public.class_memberships membership
      join public.classes class on class.id = membership.class_id
      where membership.user_id = auth.uid()
        and class.school_id = notifications.school_id
        and class.class_level::text = notifications.class_level
        and class.subclass = notifications.subclass
    )
  );

create policy "School staff can create notifications"
  on public.notifications for insert to authenticated
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.school_id = notifications.school_id
        and profile.role in ('teacher', 'school_admin')
    )
  );

create policy "School staff can update notifications"
  on public.notifications for update to authenticated
  using (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.school_id = notifications.school_id
        and profile.role in ('teacher', 'school_admin')
    )
  );

create policy "School staff can delete notifications"
  on public.notifications for delete to authenticated
  using (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.school_id = notifications.school_id
        and profile.role in ('teacher', 'school_admin')
    )
  );

-- Future registrations receive role and school on the database side.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_role text;
  matched_school_id uuid;
  school_slug text;
  level_number integer;
  subclass_letter text;
  matched_class_id uuid;
begin
  select allowlist.school_id into matched_school_id
  from public.admin_allowlist allowlist
  where lower(allowlist.email) = lower(new.email)
  limit 1;

  if matched_school_id is not null then
    user_role := 'school_admin';
  elsif split_part(new.email, '@', 1) ~ '^[0-9]+[A-Za-z]$' then
    user_role := 'student';
    school_slug := split_part(split_part(new.email, '@', 2), '.', 1);
    select id into matched_school_id from public.schooltowns
      where schoolname = school_slug limit 1;
  else
    user_role := case
      when new.raw_user_meta_data ->> 'role' = 'parent' then 'parent'
      else 'teacher'
    end;
    school_slug := split_part(split_part(new.email, '@', 2), '.', 1);
    select id into matched_school_id from public.schooltowns
      where schoolname = school_slug limit 1;
  end if;

  insert into public.profiles (id, email, full_name, role, school_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'مستخدم'),
    user_role,
    matched_school_id
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    school_id = excluded.school_id,
    updated_at = now();

  if user_role = 'student' then
    insert into public.students (id, email, full_name)
    values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', 'طالب'))
    on conflict (id) do nothing;

    level_number := substring(split_part(new.email, '@', 1) from '^([0-9]+)')::integer;
    subclass_letter := upper(substring(split_part(new.email, '@', 1) from '[A-Za-z]$'));
    select class.id into matched_class_id
    from public.classes class
    where class.school_id = matched_school_id
      and class.class_level = level_number
      and class.subclass = subclass_letter
    limit 1;

    if matched_class_id is not null then
      insert into public.class_memberships (user_id, class_id, membership_role)
      values (new.id, matched_class_id, 'student')
      on conflict (user_id, class_id, membership_role) do nothing;
    end if;
  elsif user_role in ('teacher', 'school_admin') then
    insert into public.teachers (id, email, full_name)
    values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', 'مدير المدرسة'))
    on conflict (id) do update set full_name = excluded.full_name;
  end if;

  return new;
end;
$$;

-- Restrict weekly-plan editing to staff from the same school.
drop policy if exists "Teachers can manage weekly plans" on public.weekly_plans;
create policy "School staff can manage weekly plans"
  on public.weekly_plans for all to authenticated
  using (
    exists (
      select 1
      from public.classes class
      join public.profiles profile on profile.school_id = class.school_id
      where class.id = weekly_plans.class_id
        and profile.id = auth.uid()
        and profile.role in ('teacher', 'school_admin')
    )
  )
  with check (
    exists (
      select 1
      from public.classes class
      join public.profiles profile on profile.school_id = class.school_id
      where class.id = weekly_plans.class_id
        and profile.id = auth.uid()
        and profile.role in ('teacher', 'school_admin')
    )
  );

drop policy if exists "Teachers can manage weekly plan items" on public.weekly_plan_items;
create policy "School staff can manage weekly plan items"
  on public.weekly_plan_items for all to authenticated
  using (
    exists (
      select 1
      from public.weekly_plans plan
      join public.classes class on class.id = plan.class_id
      join public.profiles profile on profile.school_id = class.school_id
      where plan.id = weekly_plan_items.weekly_plan_id
        and profile.id = auth.uid()
        and profile.role in ('teacher', 'school_admin')
    )
  )
  with check (
    exists (
      select 1
      from public.weekly_plans plan
      join public.classes class on class.id = plan.class_id
      join public.profiles profile on profile.school_id = class.school_id
      where plan.id = weekly_plan_items.weekly_plan_id
        and profile.id = auth.uid()
        and profile.role in ('teacher', 'school_admin')
    )
  );

-- Keep the parent/student weekly view synchronized with admin writes.
create or replace function public.sync_assignment_to_weekly_plan()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_class_id uuid;
  target_plan_id uuid;
  target_week date;
begin
  select id into target_class_id
  from public.classes
  where school_id = new.school
    and class_level = new.class_level
    and subclass = new.subclass
  order by created_at desc
  limit 1;

  if target_class_id is null then return new; end if;
  target_week := date_trunc('week', new.deadline)::date;

  insert into public.weekly_plans (class_id, week_start, title, status, created_by)
  values (
    target_class_id,
    target_week,
    'الخطة الأسبوعية - الأسبوع ' || to_char(target_week, 'IW'),
    'published',
    new.teacher_id
  )
  on conflict (class_id, week_start) do update set updated_at = now()
  returning id into target_plan_id;

  insert into public.weekly_plan_items (
    weekly_plan_id, item_type, title, description, subject, due_at,
    weekday, assignment_id, sort_order
  )
  values (
    target_plan_id, 'assignment', new.title,
    coalesce(new.note, new.description, ''), new.subject, new.deadline,
    extract(isodow from new.deadline)::integer, new.id,
    extract(isodow from new.deadline)::integer * 10
  )
  on conflict (assignment_id) do update set
    weekly_plan_id = excluded.weekly_plan_id,
    title = excluded.title,
    description = excluded.description,
    subject = excluded.subject,
    due_at = excluded.due_at,
    weekday = excluded.weekday;
  return new;
end;
$$;

drop trigger if exists sync_assignment_weekly_plan on public.assignments;
create trigger sync_assignment_weekly_plan
  after insert or update on public.assignments
  for each row execute function public.sync_assignment_to_weekly_plan();

create or replace function public.sync_notification_to_weekly_plan()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_class_id uuid;
  target_plan_id uuid;
  target_week date := date_trunc('week', current_date)::date;
begin
  select id into target_class_id
  from public.classes
  where school_id = new.school_id
    and class_level::text = new.class_level
    and subclass = new.subclass
  order by created_at desc
  limit 1;

  if target_class_id is null then return new; end if;
  insert into public.weekly_plans (class_id, week_start, title, status, created_by)
  values (
    target_class_id, target_week,
    'الخطة الأسبوعية - الأسبوع ' || to_char(target_week, 'IW'),
    'published', new.teacher_id
  )
  on conflict (class_id, week_start) do update set updated_at = now()
  returning id into target_plan_id;

  insert into public.weekly_plan_items (
    weekly_plan_id, item_type, title, description, notification_id, sort_order
  )
  values (target_plan_id, 'announcement', new.title, new.message, new.id, 100)
  on conflict (notification_id) do update set
    weekly_plan_id = excluded.weekly_plan_id,
    title = excluded.title,
    description = excluded.description;
  return new;
end;
$$;

drop trigger if exists sync_notification_weekly_plan on public.notifications;
create trigger sync_notification_weekly_plan
  after insert or update on public.notifications
  for each row execute function public.sync_notification_to_weekly_plan();
