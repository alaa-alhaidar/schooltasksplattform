drop policy if exists "Class members can read assignment files" on storage.objects;
create policy "Class members can read assignment files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'assignment-files'
    and exists (
      select 1 from public.classes class_row
      where class_row.id = ((storage.foldername(storage.objects.name))[1])::uuid
        and (
          exists (
            select 1 from public.class_memberships membership
            where membership.class_id = class_row.id and membership.user_id = auth.uid()
          )
          or exists (
            select 1 from public.profiles profile
            where profile.id = auth.uid()
              and (profile.role = 'super_admin' or (profile.role = 'school_admin' and profile.school_id = class_row.school_id))
          )
        )
    )
  );

