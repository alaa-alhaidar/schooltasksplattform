-- Persistent timetable entries, scoped to one class and one time slot.

create table if not exists public.class_schedule_entries (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  day text not null check (day in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  start_time time not null,
  end_time time not null,
  subject text not null check (length(trim(subject)) > 0),
  teacher text not null default '',
  room text not null default '',
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, day, start_time)
);

create index if not exists class_schedule_entries_class_idx
  on public.class_schedule_entries (class_id, day, start_time);

alter table public.class_schedule_entries enable row level security;

drop policy if exists "Class members and school staff can view schedules"
  on public.class_schedule_entries;
create policy "Class members and school staff can view schedules"
  on public.class_schedule_entries for select to authenticated
  using (
    exists (
      select 1
      from public.class_memberships membership
      where membership.class_id = class_schedule_entries.class_id
        and membership.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.classes class
      join public.profiles profile on profile.school_id = class.school_id
      where class.id = class_schedule_entries.class_id
        and profile.id = auth.uid()
        and profile.role in ('teacher', 'school_admin')
    )
  );

drop policy if exists "School staff can create schedules"
  on public.class_schedule_entries;
create policy "School staff can create schedules"
  on public.class_schedule_entries for insert to authenticated
  with check (
    exists (
      select 1
      from public.classes class
      join public.profiles profile on profile.school_id = class.school_id
      where class.id = class_schedule_entries.class_id
        and profile.id = auth.uid()
        and profile.role in ('teacher', 'school_admin')
    )
  );

drop policy if exists "School staff can update schedules"
  on public.class_schedule_entries;
create policy "School staff can update schedules"
  on public.class_schedule_entries for update to authenticated
  using (
    exists (
      select 1
      from public.classes class
      join public.profiles profile on profile.school_id = class.school_id
      where class.id = class_schedule_entries.class_id
        and profile.id = auth.uid()
        and profile.role in ('teacher', 'school_admin')
    )
  )
  with check (
    exists (
      select 1
      from public.classes class
      join public.profiles profile on profile.school_id = class.school_id
      where class.id = class_schedule_entries.class_id
        and profile.id = auth.uid()
        and profile.role in ('teacher', 'school_admin')
    )
  );

drop policy if exists "School staff can delete schedules"
  on public.class_schedule_entries;
create policy "School staff can delete schedules"
  on public.class_schedule_entries for delete to authenticated
  using (
    exists (
      select 1
      from public.classes class
      join public.profiles profile on profile.school_id = class.school_id
      where class.id = class_schedule_entries.class_id
        and profile.id = auth.uid()
        and profile.role in ('teacher', 'school_admin')
    )
  );

