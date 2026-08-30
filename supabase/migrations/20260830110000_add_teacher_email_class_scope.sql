-- Map teacher{class}{subclass}@domain accounts to one school and one class.

create table if not exists public.school_email_domains (
  domain text primary key,
  school_id uuid not null references public.schooltowns(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.school_email_domains enable row level security;

insert into public.school_email_domains (domain, school_id)
select 'bluesoft.com', id
from public.schooltowns
where schoolname = 'scholl'
on conflict (domain) do update set school_id = excluded.school_id;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_role text;
  matched_school_id uuid;
  local_part text := lower(split_part(new.email, '@', 1));
  email_domain text := lower(split_part(new.email, '@', 2));
  level_number integer;
  subclass_letter text;
  matched_class_id uuid;
  teacher_pattern boolean := local_part ~ '^teacher[0-9]{1,2}[a-z]$';
begin
  select allowlist.school_id into matched_school_id
  from public.admin_allowlist allowlist
  where lower(allowlist.email) = lower(new.email)
  limit 1;

  if matched_school_id is not null then
    user_role := 'school_admin';
  elsif teacher_pattern then
    user_role := 'teacher';
    select mapping.school_id into matched_school_id
    from public.school_email_domains mapping
    where lower(mapping.domain) = email_domain
    limit 1;
  elsif local_part ~ '^[0-9]+[a-z]$' then
    user_role := 'student';
    select id into matched_school_id from public.schooltowns
      where schoolname = split_part(email_domain, '.', 1) limit 1;
  else
    user_role := case
      when new.raw_user_meta_data ->> 'role' = 'parent' then 'parent'
      else 'teacher'
    end;
    select id into matched_school_id from public.schooltowns
      where schoolname = split_part(email_domain, '.', 1) limit 1;
  end if;

  insert into public.profiles (id, email, full_name, role, school_id)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'مستخدم'),
    user_role, matched_school_id
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
    level_number := substring(local_part from '^([0-9]+)')::integer;
    subclass_letter := upper(substring(local_part from '[a-z]$'));
  elsif user_role in ('teacher', 'school_admin') then
    insert into public.teachers (id, email, full_name)
    values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', 'معلم'))
    on conflict (id) do update set full_name = excluded.full_name;
    if teacher_pattern then
      level_number := substring(local_part from '^teacher([0-9]+)')::integer;
      subclass_letter := upper(substring(local_part from '[a-z]$'));
    end if;
  end if;

  if level_number is not null and subclass_letter is not null then
    select class.id into matched_class_id
    from public.classes class
    where class.school_id = matched_school_id
      and class.class_level = level_number
      and upper(class.subclass) = subclass_letter
    order by class.school_year desc
    limit 1;

    if matched_class_id is not null then
      insert into public.class_memberships (user_id, class_id, membership_role)
      values (new.id, matched_class_id, user_role)
      on conflict (user_id, class_id, membership_role) do nothing;
    end if;
  end if;

  return new;
end;
$$;

-- Existing matching accounts receive the same mapping.
update public.profiles profile
set role = 'teacher', school_id = mapping.school_id, updated_at = now()
from public.school_email_domains mapping
where lower(split_part(profile.email, '@', 2)) = lower(mapping.domain)
  and lower(split_part(profile.email, '@', 1)) ~ '^teacher[0-9]{1,2}[a-z]$';

insert into public.class_memberships (user_id, class_id, membership_role)
select profile.id, class.id, 'teacher'
from public.profiles profile
join public.school_email_domains mapping
  on lower(mapping.domain) = lower(split_part(profile.email, '@', 2))
join public.classes class
  on class.school_id = mapping.school_id
 and class.class_level = substring(lower(split_part(profile.email, '@', 1)) from '^teacher([0-9]+)')::integer
 and upper(class.subclass) = upper(substring(split_part(profile.email, '@', 1) from '[A-Za-z]$'))
where lower(split_part(profile.email, '@', 1)) ~ '^teacher[0-9]{1,2}[a-z]$'
on conflict (user_id, class_id, membership_role) do nothing;

-- Teachers see only assigned classes; school admins see their school.
drop policy if exists "Members can view their classes" on public.classes;
create policy "Members and school admins can view classes"
  on public.classes for select to authenticated
  using (
    exists (
      select 1 from public.class_memberships membership
      where membership.class_id = classes.id and membership.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.role = 'school_admin'
        and profile.school_id = classes.school_id
    )
  );

-- Assignment write access: school admins for the school, teachers for memberships.
drop policy if exists "School staff can create assignments" on public.assignments;
create policy "Class teachers and school admins can create assignments"
  on public.assignments for insert to authenticated
  with check (
    teacher_id = auth.uid() and (
      exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='school_admin' and p.school_id=assignments.school)
      or exists (
        select 1 from public.class_memberships m join public.classes c on c.id=m.class_id
        where m.user_id=auth.uid() and m.membership_role='teacher'
          and c.school_id=assignments.school and c.class_level=assignments.class_level
          and upper(c.subclass)=upper(assignments.subclass)
      )
    )
  );

drop policy if exists "School staff can update assignments" on public.assignments;
create policy "Class teachers and school admins can update assignments"
  on public.assignments for update to authenticated
  using (
    exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='school_admin' and p.school_id=assignments.school)
    or exists (
      select 1 from public.class_memberships m join public.classes c on c.id=m.class_id
      where m.user_id=auth.uid() and m.membership_role='teacher'
        and c.school_id=assignments.school and c.class_level=assignments.class_level
        and upper(c.subclass)=upper(assignments.subclass)
    )
  ) with check (
    exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='school_admin' and p.school_id=assignments.school)
    or exists (
      select 1 from public.class_memberships m join public.classes c on c.id=m.class_id
      where m.user_id=auth.uid() and m.membership_role='teacher'
        and c.school_id=assignments.school and c.class_level=assignments.class_level
        and upper(c.subclass)=upper(assignments.subclass)
    )
  );

drop policy if exists "School staff can delete assignments" on public.assignments;
create policy "Class teachers and school admins can delete assignments"
  on public.assignments for delete to authenticated
  using (
    exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='school_admin' and p.school_id=assignments.school)
    or exists (
      select 1 from public.class_memberships m join public.classes c on c.id=m.class_id
      where m.user_id=auth.uid() and m.membership_role='teacher'
        and c.school_id=assignments.school and c.class_level=assignments.class_level
        and upper(c.subclass)=upper(assignments.subclass)
    )
  );

create or replace function public.can_manage_class(target_class_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.classes class
    join public.profiles profile on profile.school_id = class.school_id
    where class.id = target_class_id
      and profile.id = auth.uid()
      and profile.role = 'school_admin'
  ) or exists (
    select 1 from public.class_memberships membership
    where membership.class_id = target_class_id
      and membership.user_id = auth.uid()
      and membership.membership_role = 'teacher'
  );
$$;

create or replace function public.can_manage_class_values(
  target_school_id uuid,
  target_class_level integer,
  target_subclass text
)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'school_admin'
      and profile.school_id = target_school_id
  ) or exists (
    select 1
    from public.class_memberships membership
    join public.classes class on class.id = membership.class_id
    where membership.user_id = auth.uid()
      and membership.membership_role = 'teacher'
      and class.school_id = target_school_id
      and class.class_level = target_class_level
      and upper(class.subclass) = upper(target_subclass)
  );
$$;

drop policy if exists "Class members and school staff can view assignments" on public.assignments;
create policy "Class members and assigned staff can view assignments"
  on public.assignments for select to authenticated
  using (
    public.can_manage_class_values(assignments.school, assignments.class_level, assignments.subclass)
    or exists (
      select 1 from public.class_memberships membership
      join public.classes class on class.id = membership.class_id
      where membership.user_id = auth.uid()
        and class.school_id = assignments.school
        and class.class_level = assignments.class_level
        and upper(class.subclass) = upper(assignments.subclass)
    )
  );

drop policy if exists "Class members and school staff can view notifications" on public.notifications;
create policy "Class members and assigned staff can view notifications"
  on public.notifications for select to authenticated
  using (
    public.can_manage_class_values(
      notifications.school_id,
      notifications.class_level::integer,
      notifications.subclass
    )
    or exists (
      select 1 from public.class_memberships membership
      join public.classes class on class.id = membership.class_id
      where membership.user_id = auth.uid()
        and class.school_id = notifications.school_id
        and class.class_level::text = notifications.class_level
        and upper(class.subclass) = upper(notifications.subclass)
    )
  );

drop policy if exists "School staff can create notifications" on public.notifications;
create policy "Class teachers and school admins can create notifications"
  on public.notifications for insert to authenticated
  with check (
    teacher_id = auth.uid()
    and public.can_manage_class_values(
      notifications.school_id,
      notifications.class_level::integer,
      notifications.subclass
    )
  );

drop policy if exists "School staff can update notifications" on public.notifications;
create policy "Class teachers and school admins can update notifications"
  on public.notifications for update to authenticated
  using (public.can_manage_class_values(notifications.school_id, notifications.class_level::integer, notifications.subclass))
  with check (public.can_manage_class_values(notifications.school_id, notifications.class_level::integer, notifications.subclass));

drop policy if exists "School staff can delete notifications" on public.notifications;
create policy "Class teachers and school admins can delete notifications"
  on public.notifications for delete to authenticated
  using (public.can_manage_class_values(notifications.school_id, notifications.class_level::integer, notifications.subclass));

drop policy if exists "School staff can manage weekly plans" on public.weekly_plans;
create policy "Assigned staff can manage weekly plans"
  on public.weekly_plans for all to authenticated
  using (public.can_manage_class(weekly_plans.class_id))
  with check (public.can_manage_class(weekly_plans.class_id));

drop policy if exists "School staff can manage weekly plan items" on public.weekly_plan_items;
create policy "Assigned staff can manage weekly plan items"
  on public.weekly_plan_items for all to authenticated
  using (
    exists (
      select 1 from public.weekly_plans plan
      where plan.id = weekly_plan_items.weekly_plan_id
        and public.can_manage_class(plan.class_id)
    )
  )
  with check (
    exists (
      select 1 from public.weekly_plans plan
      where plan.id = weekly_plan_items.weekly_plan_id
        and public.can_manage_class(plan.class_id)
    )
  );

drop policy if exists "Class members and school staff can view schedules" on public.class_schedule_entries;
create policy "Class members and assigned staff can view schedules"
  on public.class_schedule_entries for select to authenticated
  using (
    public.can_manage_class(class_schedule_entries.class_id)
    or exists (
      select 1 from public.class_memberships membership
      where membership.class_id = class_schedule_entries.class_id
        and membership.user_id = auth.uid()
    )
  );

drop policy if exists "School staff can create schedules" on public.class_schedule_entries;
create policy "Assigned staff can create schedules"
  on public.class_schedule_entries for insert to authenticated
  with check (public.can_manage_class(class_schedule_entries.class_id));

drop policy if exists "School staff can update schedules" on public.class_schedule_entries;
create policy "Assigned staff can update schedules"
  on public.class_schedule_entries for update to authenticated
  using (public.can_manage_class(class_schedule_entries.class_id))
  with check (public.can_manage_class(class_schedule_entries.class_id));

drop policy if exists "School staff can delete schedules" on public.class_schedule_entries;
create policy "Assigned staff can delete schedules"
  on public.class_schedule_entries for delete to authenticated
  using (public.can_manage_class(class_schedule_entries.class_id));
