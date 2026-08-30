-- Recurring plans repeat, while each student's completion state resets weekly.

alter table public.assignment_completions
  add column if not exists week_start date;

update public.assignment_completions
set week_start = date_trunc('week', completed_at)::date
where week_start is null;

alter table public.assignment_completions
  alter column week_start set default date_trunc('week', now())::date,
  alter column week_start set not null;

alter table public.assignment_completions
  drop constraint if exists assignment_completions_pkey;

alter table public.assignment_completions
  add primary key (assignment_id, user_id, week_start);

