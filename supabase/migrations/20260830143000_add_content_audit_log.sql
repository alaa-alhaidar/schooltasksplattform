create table if not exists public.content_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_email text,
  actor_name text,
  action text not null check (action in ('create', 'update', 'delete')),
  entity_type text not null,
  entity_id text not null,
  entity_title text,
  class_id uuid references public.classes(id) on delete set null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists content_audit_log_created_idx
  on public.content_audit_log (created_at desc);
create index if not exists content_audit_log_class_idx
  on public.content_audit_log (class_id, created_at desc);

alter table public.content_audit_log enable row level security;

create policy "Only super admins can view the content audit log"
  on public.content_audit_log for select to authenticated
  using (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid() and profile.role = 'super_admin'
    )
  );

create or replace function public.record_content_audit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  row_data jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  previous_data jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  following_data jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  resolved_class_id uuid;
  resolved_title text;
  current_actor public.profiles%rowtype;
begin
  select * into current_actor from public.profiles where id = auth.uid();

  if tg_table_name = 'class_schedule_entries' then
    resolved_class_id := (row_data ->> 'class_id')::uuid;
    resolved_title := row_data ->> 'subject';
  elsif tg_table_name = 'weekly_plans' then
    resolved_class_id := (row_data ->> 'class_id')::uuid;
    resolved_title := row_data ->> 'title';
  elsif tg_table_name = 'weekly_plan_items' then
    select plan.class_id into resolved_class_id
    from public.weekly_plans plan
    where plan.id = (row_data ->> 'weekly_plan_id')::uuid;
    resolved_title := row_data ->> 'title';
  elsif tg_table_name = 'assignments' then
    resolved_class_id := public.class_id_for_values(
      (row_data ->> 'school')::uuid,
      (row_data ->> 'class_level')::integer,
      row_data ->> 'subclass'
    );
    resolved_title := row_data ->> 'title';
  elsif tg_table_name = 'notifications' then
    resolved_class_id := public.class_id_for_values(
      (row_data ->> 'school_id')::uuid,
      (row_data ->> 'class_level')::integer,
      row_data ->> 'subclass'
    );
    resolved_title := row_data ->> 'title';
  end if;

  insert into public.content_audit_log (
    actor_id, actor_email, actor_name, action, entity_type, entity_id,
    entity_title, class_id, old_data, new_data
  ) values (
    auth.uid(), current_actor.email, current_actor.full_name,
    case tg_op when 'INSERT' then 'create' when 'UPDATE' then 'update' else 'delete' end,
    tg_table_name, row_data ->> 'id', resolved_title, resolved_class_id,
    previous_data, following_data
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'assignments', 'notifications', 'class_schedule_entries',
    'weekly_plans', 'weekly_plan_items'
  ] loop
    execute format('drop trigger if exists audit_content_changes on public.%I', table_name);
    execute format(
      'create trigger audit_content_changes after insert or update or delete on public.%I for each row execute function public.record_content_audit()',
      table_name
    );
  end loop;
end;
$$;

