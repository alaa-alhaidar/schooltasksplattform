alter table public.notifications add column if not exists expires_at timestamptz;
update public.notifications set expires_at = created_at + interval '30 days' where expires_at is null;
alter table public.notifications
  alter column expires_at set default (now() + interval '30 days'),
  alter column expires_at set not null;
create index if not exists notifications_class_expiry_idx
  on public.notifications (school_id, class_level, subclass, expires_at);
