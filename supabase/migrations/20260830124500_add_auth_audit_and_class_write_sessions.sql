-- Audit authentication activity and allow only one active writer per class.

create table if not exists public.auth_activity_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  event_type text not null check (event_type in ('register', 'login', 'logout', 'write_blocked')),
  success boolean not null default true,
  reason text,
  school_id uuid references public.schooltowns(id) on delete set null,
  class_id uuid references public.classes(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists auth_activity_logs_user_created_idx
  on public.auth_activity_logs (user_id, created_at desc);
create index if not exists auth_activity_logs_class_created_idx
  on public.auth_activity_logs (class_id, created_at desc);

alter table public.auth_activity_logs enable row level security;

create policy "Users can view their own authentication activity"
  on public.auth_activity_logs for select to authenticated
  using (user_id = auth.uid());

create policy "Admins can view authentication activity"
  on public.auth_activity_logs for select to authenticated
  using (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and (
          profile.role = 'super_admin'
          or (profile.role = 'school_admin' and profile.school_id = auth_activity_logs.school_id)
        )
    )
  );

create or replace function public.log_auth_activity(
  requested_event text,
  requested_success boolean default true,
  requested_reason text default null,
  requested_email text default null,
  requested_class_id uuid default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  current_email text;
  current_school_id uuid;
begin
  if requested_event not in ('register', 'login', 'logout', 'write_blocked') then
    raise exception 'Unsupported audit event';
  end if;

  select coalesce(profile.email, requested_email), profile.school_id
    into current_email, current_school_id
  from public.profiles profile
  where profile.id = auth.uid();

  current_email := coalesce(current_email, requested_email, 'unknown');
  insert into public.auth_activity_logs (
    user_id, email, event_type, success, reason, school_id, class_id
  ) values (
    auth.uid(), lower(current_email), requested_event, requested_success,
    left(requested_reason, 500), current_school_id, requested_class_id
  );
end;
$$;

grant execute on function public.log_auth_activity(text, boolean, text, text, uuid)
  to anon, authenticated;

create or replace function public.audit_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.auth_activity_logs (user_id, email, event_type, success)
  values (new.id, lower(coalesce(new.email, 'unknown')), 'register', true);
  return new;
end;
$$;

drop trigger if exists audit_auth_user_registration on auth.users;
create trigger audit_auth_user_registration
  after insert on auth.users
  for each row execute function public.audit_new_auth_user();

create table if not exists public.class_write_sessions (
  class_id uuid primary key references public.classes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_token uuid not null,
  acquired_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 minutes')
);

alter table public.class_write_sessions enable row level security;

create policy "Writers can view their class session"
  on public.class_write_sessions for select to authenticated
  using (public.can_manage_class(class_id));

create or replace function public.acquire_class_write_session(
  requested_class_id uuid,
  requested_session_token uuid
)
returns table (acquired boolean, holder_name text, expires_at timestamptz)
language plpgsql
security definer set search_path = public
as $$
declare
  active_session public.class_write_sessions%rowtype;
begin
  if auth.uid() is null or not public.can_manage_class(requested_class_id) then
    raise exception 'Not permitted to manage this class';
  end if;

  insert into public.class_write_sessions (
    class_id, user_id, session_token, acquired_at, last_seen_at, expires_at
  ) values (
    requested_class_id, auth.uid(), requested_session_token, now(), now(), now() + interval '2 minutes'
  )
  on conflict (class_id) do update set
    user_id = excluded.user_id,
    session_token = excluded.session_token,
    acquired_at = case
      when class_write_sessions.user_id = excluded.user_id
       and class_write_sessions.session_token = excluded.session_token
      then class_write_sessions.acquired_at else now() end,
    last_seen_at = now(),
    expires_at = now() + interval '2 minutes'
  where class_write_sessions.expires_at <= now()
     or (class_write_sessions.user_id = excluded.user_id
         and class_write_sessions.session_token = excluded.session_token);

  select session.* into active_session
  from public.class_write_sessions session
  where session.class_id = requested_class_id;

  acquired := active_session.user_id = auth.uid()
    and active_session.session_token = requested_session_token;
  select coalesce(profile.full_name, profile.email, 'مستخدم آخر') into holder_name
  from public.profiles profile where profile.id = active_session.user_id;
  expires_at := active_session.expires_at;

  if not acquired then
    insert into public.auth_activity_logs (
      user_id, email, event_type, success, reason, school_id, class_id
    )
    select auth.uid(), coalesce(profile.email, 'unknown'), 'write_blocked', false,
      'Class already has an active writer', profile.school_id, requested_class_id
    from public.profiles profile where profile.id = auth.uid();
  end if;
  return next;
end;
$$;

create or replace function public.release_class_write_session(
  requested_class_id uuid,
  requested_session_token uuid
)
returns void
language sql
security definer set search_path = public
as $$
  delete from public.class_write_sessions
  where class_id = requested_class_id
    and user_id = auth.uid()
    and session_token = requested_session_token;
$$;

create or replace function public.release_all_class_write_sessions(
  requested_session_token uuid
)
returns void
language sql
security definer set search_path = public
as $$
  delete from public.class_write_sessions
  where user_id = auth.uid()
    and session_token = requested_session_token;
$$;

grant execute on function public.acquire_class_write_session(uuid, uuid) to authenticated;
grant execute on function public.release_class_write_session(uuid, uuid) to authenticated;
grant execute on function public.release_all_class_write_sessions(uuid) to authenticated;

create or replace function public.has_class_write_access(requested_class_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.can_manage_class(requested_class_id)
    and exists (
      select 1 from public.class_write_sessions session
      where session.class_id = requested_class_id
        and session.user_id = auth.uid()
        and session.expires_at > now()
    );
$$;

create or replace function public.class_id_for_values(
  requested_school_id uuid,
  requested_class_level integer,
  requested_subclass text
)
returns uuid
language sql stable security definer set search_path = public
as $$
  select class.id from public.classes class
  where class.school_id = requested_school_id
    and class.class_level = requested_class_level
    and upper(class.subclass) = upper(requested_subclass)
  order by class.school_year desc limit 1;
$$;

drop policy if exists "Assigned staff can create schedules" on public.class_schedule_entries;
create policy "Active class writer can create schedules"
  on public.class_schedule_entries for insert to authenticated
  with check (public.has_class_write_access(class_id));
drop policy if exists "Assigned staff can update schedules" on public.class_schedule_entries;
create policy "Active class writer can update schedules"
  on public.class_schedule_entries for update to authenticated
  using (public.has_class_write_access(class_id))
  with check (public.has_class_write_access(class_id));
drop policy if exists "Assigned staff can delete schedules" on public.class_schedule_entries;
create policy "Active class writer can delete schedules"
  on public.class_schedule_entries for delete to authenticated
  using (public.has_class_write_access(class_id));

drop policy if exists "Assigned staff and support can create assignments" on public.assignments;
create policy "Active class writer can create assignments"
  on public.assignments for insert to authenticated
  with check (
    teacher_id = auth.uid() and public.has_class_write_access(
      public.class_id_for_values(school, class_level, subclass)
    )
  );
drop policy if exists "Assigned staff and support can update assignments" on public.assignments;
create policy "Active class writer can update assignments"
  on public.assignments for update to authenticated
  using (public.has_class_write_access(public.class_id_for_values(school, class_level, subclass)))
  with check (public.has_class_write_access(public.class_id_for_values(school, class_level, subclass)));
drop policy if exists "Assigned staff and support can delete assignments" on public.assignments;
create policy "Active class writer can delete assignments"
  on public.assignments for delete to authenticated
  using (public.has_class_write_access(public.class_id_for_values(school, class_level, subclass)));

drop policy if exists "Class teachers and school admins can create notifications" on public.notifications;
create policy "Active class writer can create notifications"
  on public.notifications for insert to authenticated
  with check (
    teacher_id = auth.uid() and public.has_class_write_access(
      public.class_id_for_values(school_id, class_level::integer, subclass)
    )
  );
drop policy if exists "Class teachers and school admins can update notifications" on public.notifications;
create policy "Active class writer can update notifications"
  on public.notifications for update to authenticated
  using (public.has_class_write_access(public.class_id_for_values(school_id, class_level::integer, subclass)))
  with check (public.has_class_write_access(public.class_id_for_values(school_id, class_level::integer, subclass)));
drop policy if exists "Class teachers and school admins can delete notifications" on public.notifications;
create policy "Active class writer can delete notifications"
  on public.notifications for delete to authenticated
  using (public.has_class_write_access(public.class_id_for_values(school_id, class_level::integer, subclass)));
