-- Timetables repeat weekly. Publish changes so open student views update instantly.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'class_schedule_entries'
  ) then
    alter publication supabase_realtime
      add table public.class_schedule_entries;
  end if;
end
$$;

