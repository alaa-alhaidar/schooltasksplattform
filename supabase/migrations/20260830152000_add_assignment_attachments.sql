alter table public.assignments
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime_type text,
  add column if not exists external_link text;

alter table public.weekly_plan_items
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime_type text,
  add column if not exists external_link text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'assignment-files', 'assignment-files', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Class members can read assignment files" on storage.objects;
create policy "Class members can read assignment files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'assignment-files'
    and exists (
      select 1 from public.classes class
      where class.id = ((storage.foldername(name))[1])::uuid
        and (
          exists (select 1 from public.class_memberships membership where membership.class_id = class.id and membership.user_id = auth.uid())
          or exists (select 1 from public.profiles profile where profile.id = auth.uid() and (profile.role = 'super_admin' or (profile.role = 'school_admin' and profile.school_id = class.school_id)))
        )
    )
  );

drop policy if exists "Active class writers can upload assignment files" on storage.objects;
create policy "Active class writers can upload assignment files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'assignment-files'
    and public.has_class_write_access(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Active class writers can update assignment files" on storage.objects;
create policy "Active class writers can update assignment files"
  on storage.objects for update to authenticated
  using (bucket_id = 'assignment-files' and public.has_class_write_access(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'assignment-files' and public.has_class_write_access(((storage.foldername(name))[1])::uuid));

drop policy if exists "Active class writers can delete assignment files" on storage.objects;
create policy "Active class writers can delete assignment files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'assignment-files' and public.has_class_write_access(((storage.foldername(name))[1])::uuid));

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
  select id into target_class_id from public.classes
  where school_id = new.school and class_level = new.class_level and upper(subclass) = upper(new.subclass)
  order by created_at desc limit 1;
  if target_class_id is null then return new; end if;
  target_week := date_trunc('week', new.deadline)::date;

  insert into public.weekly_plans (class_id, week_start, title, status, created_by)
  values (target_class_id, target_week, 'الخطة الأسبوعية - الأسبوع ' || to_char(target_week, 'IW'), 'published', new.teacher_id)
  on conflict (class_id, week_start) do update set updated_at = now()
  returning id into target_plan_id;

  insert into public.weekly_plan_items (
    weekly_plan_id, item_type, title, description, subject, due_at, weekday,
    assignment_id, sort_order, attachment_path, attachment_name,
    attachment_mime_type, external_link
  ) values (
    target_plan_id, 'assignment', new.title, coalesce(new.note, new.description, ''),
    new.subject, new.deadline, extract(isodow from new.deadline)::integer,
    new.id, extract(isodow from new.deadline)::integer * 10,
    new.attachment_path, new.attachment_name, new.attachment_mime_type, new.external_link
  )
  on conflict (assignment_id) do update set
    weekly_plan_id = excluded.weekly_plan_id, title = excluded.title,
    description = excluded.description, subject = excluded.subject,
    due_at = excluded.due_at, weekday = excluded.weekday,
    attachment_path = excluded.attachment_path,
    attachment_name = excluded.attachment_name,
    attachment_mime_type = excluded.attachment_mime_type,
    external_link = excluded.external_link;
  return new;
end;
$$;

