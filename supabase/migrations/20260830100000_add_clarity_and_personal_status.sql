-- Personal read/completion state plus lightweight publishing metadata.

alter table public.assignments
  add column if not exists priority text not null default 'normal'
    check (priority in ('normal', 'important', 'urgent')),
  add column if not exists archived_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.notifications
  add column if not exists priority text not null default 'normal'
    check (priority in ('normal', 'important', 'urgent')),
  add column if not exists archived_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create table if not exists public.assignment_completions (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  completed_at timestamptz not null default now(),
  primary key (assignment_id, user_id)
);

alter table public.notification_reads enable row level security;
alter table public.assignment_completions enable row level security;

drop policy if exists "Users manage their notification reads" on public.notification_reads;
create policy "Users manage their notification reads"
  on public.notification_reads for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users manage their assignment completions" on public.assignment_completions;
create policy "Users manage their assignment completions"
  on public.assignment_completions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.touch_content_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_assignments_updated_at on public.assignments;
create trigger touch_assignments_updated_at
  before update on public.assignments
  for each row execute function public.touch_content_updated_at();

drop trigger if exists touch_notifications_updated_at on public.notifications;
create trigger touch_notifications_updated_at
  before update on public.notifications
  for each row execute function public.touch_content_updated_at();

grant select, insert, update, delete on public.notification_reads to authenticated;
grant select, insert, update, delete on public.assignment_completions to authenticated;

