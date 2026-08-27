-- Step 1: school -> class -> week -> plan items.
-- Existing tables remain available while the frontend is migrated gradually.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('student', 'parent', 'teacher', 'school_admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schooltowns(id) on delete cascade,
  name text not null,
  class_level integer not null check (class_level between 1 and 13),
  subclass text not null,
  school_year text not null default '2026/2027',
  created_at timestamptz not null default now(),
  unique (school_id, class_level, subclass, school_year)
);

create table if not exists public.class_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  membership_role text not null check (membership_role in ('student', 'parent', 'teacher')),
  created_at timestamptz not null default now(),
  unique (user_id, class_id, membership_role)
);

create table if not exists public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  week_start date not null,
  title text not null,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, week_start)
);

create table if not exists public.weekly_plan_items (
  id uuid primary key default gen_random_uuid(),
  weekly_plan_id uuid not null references public.weekly_plans(id) on delete cascade,
  item_type text not null check (item_type in ('assignment', 'announcement', 'event', 'schedule')),
  title text not null,
  description text not null default '',
  subject text,
  due_at timestamptz,
  weekday integer check (weekday between 1 and 7),
  assignment_id uuid unique references public.assignments(id) on delete cascade,
  notification_id uuid unique references public.notifications(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists class_memberships_user_idx
  on public.class_memberships (user_id);
create index if not exists weekly_plans_class_week_idx
  on public.weekly_plans (class_id, week_start desc);
create index if not exists weekly_plan_items_plan_idx
  on public.weekly_plan_items (weekly_plan_id, sort_order);

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_memberships enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.weekly_plan_items enable row level security;

drop policy if exists "Users can view their profile" on public.profiles;
create policy "Users can view their profile"
  on public.profiles for select to authenticated
  using (id = auth.uid());

drop policy if exists "Members can view their classes" on public.classes;
create policy "Members can view their classes"
  on public.classes for select to authenticated
  using (
    exists (
      select 1 from public.class_memberships membership
      where membership.class_id = classes.id
        and membership.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.role in ('teacher', 'school_admin')
    )
  );

drop policy if exists "Users can view their memberships" on public.class_memberships;
create policy "Users can view their memberships"
  on public.class_memberships for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Members can view published weekly plans" on public.weekly_plans;
create policy "Members can view published weekly plans"
  on public.weekly_plans for select to authenticated
  using (
    status = 'published'
    and exists (
      select 1 from public.class_memberships membership
      where membership.class_id = weekly_plans.class_id
        and membership.user_id = auth.uid()
    )
  );

drop policy if exists "Teachers can manage weekly plans" on public.weekly_plans;
create policy "Teachers can manage weekly plans"
  on public.weekly_plans for all to authenticated
  using (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.role in ('teacher', 'school_admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.role in ('teacher', 'school_admin')
    )
  );

drop policy if exists "Members can view weekly plan items" on public.weekly_plan_items;
create policy "Members can view weekly plan items"
  on public.weekly_plan_items for select to authenticated
  using (
    exists (
      select 1
      from public.weekly_plans plan
      join public.class_memberships membership on membership.class_id = plan.class_id
      where plan.id = weekly_plan_items.weekly_plan_id
        and plan.status = 'published'
        and membership.user_id = auth.uid()
    )
  );

drop policy if exists "Teachers can manage weekly plan items" on public.weekly_plan_items;
create policy "Teachers can manage weekly plan items"
  on public.weekly_plan_items for all to authenticated
  using (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.role in ('teacher', 'school_admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.role in ('teacher', 'school_admin')
    )
  );

-- Build profiles for existing authenticated users.
insert into public.profiles (id, email, full_name, role)
select
  user_account.id,
  user_account.email,
  coalesce(student.full_name, teacher.full_name, user_account.raw_user_meta_data ->> 'full_name', 'User'),
  case
    when student.id is not null then 'student'
    when teacher.id is not null then 'teacher'
    else 'parent'
  end
from auth.users user_account
left join public.students student on student.id = user_account.id
left join public.teachers teacher on teacher.id = user_account.id
where user_account.email is not null
on conflict (id) do update set
  email = excluded.email,
  full_name = excluded.full_name,
  role = excluded.role,
  updated_at = now();

-- Create the classes currently represented by the demo data.
insert into public.classes (school_id, name, class_level, subclass)
select school.id, seed.name, seed.class_level, seed.subclass
from public.schooltowns school
cross join (
  values ('Klasse 4A', 4, 'A'), ('Klasse 5A', 5, 'A')
) as seed(name, class_level, subclass)
where school.schoolname = 'scholl'
on conflict (school_id, class_level, subclass, school_year) do update
set name = excluded.name;

-- Assign existing student accounts using the address pattern 4a@school.example.
insert into public.class_memberships (user_id, class_id, membership_role)
select profile.id, class.id, 'student'
from public.profiles profile
join public.schooltowns school
  on school.schoolname = split_part(split_part(profile.email, '@', 2), '.', 1)
join public.classes class
  on class.school_id = school.id
 and class.class_level = substring(split_part(profile.email, '@', 1) from '^([0-9]+)')::integer
 and class.subclass = upper(substring(split_part(profile.email, '@', 1) from '[A-Za-z]$'))
where profile.role = 'student'
  and split_part(profile.email, '@', 1) ~ '^[0-9]+[A-Za-z]$'
on conflict (user_id, class_id, membership_role) do nothing;

-- Create one current weekly plan per class.
insert into public.weekly_plans (class_id, week_start, title, status)
select
  class.id,
  date_trunc('week', current_date)::date,
  'Wochenplan KW ' || to_char(current_date, 'IW'),
  'published'
from public.classes class
on conflict (class_id, week_start) do update set
  title = excluded.title,
  status = excluded.status,
  updated_at = now();

-- Link the existing assignments to their class weekly plans.
insert into public.weekly_plan_items (
  weekly_plan_id,
  item_type,
  title,
  description,
  subject,
  due_at,
  weekday,
  assignment_id,
  sort_order
)
select
  plan.id,
  'assignment',
  assignment.title,
  coalesce(assignment.note, assignment.description, ''),
  assignment.subject,
  assignment.deadline,
  extract(isodow from assignment.deadline)::integer,
  assignment.id,
  row_number() over (partition by plan.id order by assignment.deadline, assignment.title)::integer
from public.assignments assignment
join public.classes class
  on class.school_id = assignment.school
 and class.class_level = assignment.class_level
 and class.subclass = assignment.subclass
join public.weekly_plans plan
  on plan.class_id = class.id
 and plan.week_start = date_trunc('week', current_date)::date
on conflict (assignment_id) do update set
  weekly_plan_id = excluded.weekly_plan_id,
  title = excluded.title,
  description = excluded.description,
  subject = excluded.subject,
  due_at = excluded.due_at,
  weekday = excluded.weekday,
  sort_order = excluded.sort_order;

-- Link class announcements to the same weekly plan.
insert into public.weekly_plan_items (
  weekly_plan_id,
  item_type,
  title,
  description,
  notification_id,
  sort_order
)
select
  plan.id,
  'announcement',
  notification.title,
  notification.message,
  notification.id,
  100 + row_number() over (partition by plan.id order by notification.created_at desc)::integer
from public.notifications notification
join public.classes class
  on class.school_id = notification.school_id
 and class.class_level::text = notification.class_level
 and class.subclass = notification.subclass
join public.weekly_plans plan
  on plan.class_id = class.id
 and plan.week_start = date_trunc('week', current_date)::date
on conflict (notification_id) do update set
  weekly_plan_id = excluded.weekly_plan_id,
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order;

-- Keep automatic profile/class assignment in sync for future registrations.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_role text;
  school_slug text;
  level_number integer;
  subclass_letter text;
  matched_class_id uuid;
begin
  user_role := case
    when new.raw_user_meta_data ->> 'role' in ('student', 'parent', 'teacher', 'school_admin')
      then new.raw_user_meta_data ->> 'role'
    when split_part(new.email, '@', 1) ~ '^[0-9]+[A-Za-z]$' then 'student'
    else 'teacher'
  end;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', initcap(user_role)),
    user_role
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    updated_at = now();

  if user_role = 'student' then
    insert into public.students (id, email, full_name)
    values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', 'Student'))
    on conflict (id) do nothing;

    school_slug := split_part(split_part(new.email, '@', 2), '.', 1);
    level_number := substring(split_part(new.email, '@', 1) from '^([0-9]+)')::integer;
    subclass_letter := upper(substring(split_part(new.email, '@', 1) from '[A-Za-z]$'));

    select class.id into matched_class_id
    from public.classes class
    join public.schooltowns school on school.id = class.school_id
    where school.schoolname = school_slug
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
    values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', 'Teacher'))
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

