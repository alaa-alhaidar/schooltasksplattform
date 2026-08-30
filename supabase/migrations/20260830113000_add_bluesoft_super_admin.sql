-- BlueSoft emergency support role. This account is separate from school admins.

alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'parent', 'teacher', 'school_admin', 'super_admin'));

create table if not exists public.super_admin_allowlist (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.super_admin_allowlist enable row level security;

insert into public.super_admin_allowlist (email)
values ('superadmin@bluesoft.com')
on conflict (email) do nothing;

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
  if exists (
    select 1 from public.super_admin_allowlist allowlist
    where lower(allowlist.email) = lower(new.email)
  ) then
    user_role := 'super_admin';
    select mapping.school_id into matched_school_id
    from public.school_email_domains mapping
    where lower(mapping.domain) = email_domain
    limit 1;
  else
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
  elsif user_role in ('teacher', 'school_admin', 'super_admin') then
    insert into public.teachers (id, email, full_name)
    values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', 'دعم BlueSoft'))
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

-- Upgrade an already registered allowlisted account.
update public.profiles profile
set role = 'super_admin', updated_at = now()
from public.super_admin_allowlist allowlist
where lower(profile.email) = lower(allowlist.email);

create or replace function public.can_manage_class(target_class_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles profile
    where profile.id = auth.uid() and profile.role = 'super_admin'
  ) or exists (
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
    where profile.id = auth.uid() and profile.role = 'super_admin'
  ) or exists (
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

drop policy if exists "Members and school admins can view classes" on public.classes;
create policy "Members and admins can view classes"
  on public.classes for select to authenticated
  using (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid() and profile.role = 'super_admin'
    )
    or exists (
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

-- Rebuild assignment writes through the shared scope function.
drop policy if exists "Class teachers and school admins can create assignments" on public.assignments;
create policy "Assigned staff and support can create assignments"
  on public.assignments for insert to authenticated
  with check (
    teacher_id = auth.uid()
    and public.can_manage_class_values(assignments.school, assignments.class_level, assignments.subclass)
  );

drop policy if exists "Class teachers and school admins can update assignments" on public.assignments;
create policy "Assigned staff and support can update assignments"
  on public.assignments for update to authenticated
  using (public.can_manage_class_values(assignments.school, assignments.class_level, assignments.subclass))
  with check (public.can_manage_class_values(assignments.school, assignments.class_level, assignments.subclass));

drop policy if exists "Class teachers and school admins can delete assignments" on public.assignments;
create policy "Assigned staff and support can delete assignments"
  on public.assignments for delete to authenticated
  using (public.can_manage_class_values(assignments.school, assignments.class_level, assignments.subclass));

