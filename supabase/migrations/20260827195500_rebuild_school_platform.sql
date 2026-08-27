-- Rebuild the database schema expected by the current frontend.
-- This migration is idempotent and can be applied to a fresh Supabase project.

create extension if not exists pgcrypto;

create table if not exists public.schooltowns (
  id uuid primary key default gen_random_uuid(),
  schoolname text not null unique,
  school_full_name text not null,
  address text not null default '',
  website text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.teachers (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default 'Teacher',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default 'Student',
  created_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  subject text not null,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  deadline timestamptz not null,
  class_level integer not null default 1 check (class_level between 1 and 13),
  subclass text not null default 'A',
  note text not null default '',
  school uuid not null references public.schooltowns(id) on delete cascade,
  teacher_full_name text not null default 'Teacher',
  teacher_url_avatar text not null default '',
  student_count integer not null default 0 check (student_count >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  school_id uuid not null references public.schooltowns(id) on delete cascade,
  class_level text,
  subclass text,
  read boolean not null default false,
  teacher_full_name text not null default 'Teacher',
  teacher_avatar_url text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists assignments_school_class_idx
  on public.assignments (school, class_level, subclass);
create index if not exists assignments_teacher_idx
  on public.assignments (teacher_id);
create index if not exists notifications_school_class_idx
  on public.notifications (school_id, class_level, subclass);

alter table public.schooltowns enable row level security;
alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.assignments enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Authenticated users can view schools" on public.schooltowns;
create policy "Authenticated users can view schools"
  on public.schooltowns for select to authenticated using (true);

drop policy if exists "Users can view teacher profiles" on public.teachers;
create policy "Users can view teacher profiles"
  on public.teachers for select to authenticated using (true);
drop policy if exists "Teachers can insert their profile" on public.teachers;
create policy "Teachers can insert their profile"
  on public.teachers for insert to authenticated with check (auth.uid() = id);
drop policy if exists "Teachers can update their profile" on public.teachers;
create policy "Teachers can update their profile"
  on public.teachers for update to authenticated using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Students can view their profile" on public.students;
create policy "Students can view their profile"
  on public.students for select to authenticated using (auth.uid() = id);
drop policy if exists "Students can update their profile" on public.students;
create policy "Students can update their profile"
  on public.students for update to authenticated using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Authenticated users can view assignments" on public.assignments;
create policy "Authenticated users can view assignments"
  on public.assignments for select to authenticated using (true);
drop policy if exists "Teachers can create assignments" on public.assignments;
create policy "Teachers can create assignments"
  on public.assignments for insert to authenticated
  with check (auth.uid() = teacher_id);
drop policy if exists "Teachers can update assignments" on public.assignments;
create policy "Teachers can update assignments"
  on public.assignments for update to authenticated
  using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);
drop policy if exists "Teachers can delete assignments" on public.assignments;
create policy "Teachers can delete assignments"
  on public.assignments for delete to authenticated
  using (auth.uid() = teacher_id);

drop policy if exists "Authenticated users can view notifications" on public.notifications;
create policy "Authenticated users can view notifications"
  on public.notifications for select to authenticated using (true);
drop policy if exists "Teachers can create notifications" on public.notifications;
create policy "Teachers can create notifications"
  on public.notifications for insert to authenticated
  with check (auth.uid() = teacher_id);
drop policy if exists "Authenticated users can mark notifications read" on public.notifications;
create policy "Authenticated users can mark notifications read"
  on public.notifications for update to authenticated using (true)
  with check (true);
drop policy if exists "Teachers can delete notifications" on public.notifications;
create policy "Teachers can delete notifications"
  on public.notifications for delete to authenticated
  using (auth.uid() = teacher_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Student addresses follow the pattern 1a@school.example.
  if split_part(new.email, '@', 1) ~ '^[0-9]+[A-Za-z]$' then
    insert into public.students (id, email, full_name)
    values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', 'Student'))
    on conflict (id) do nothing;
  else
    insert into public.teachers (id, email, full_name)
    values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', 'Teacher'))
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The frontend derives the school slug from the email domain.
insert into public.schooltowns (schoolname, school_full_name)
values ('scholl', 'Scholl')
on conflict (schoolname) do nothing;

