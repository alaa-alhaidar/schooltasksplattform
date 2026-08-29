-- Use the full company domain for the school administrator.

delete from public.admin_allowlist
where email in ('konsens.admin.scholl@con', 'konsens.admin.scholl@com');

insert into public.admin_allowlist (email, school_id)
select 'konsens.admin.scholl@bluesoft.com', id
from public.schooltowns
where schoolname = 'scholl'
on conflict (email) do update set school_id = excluded.school_id;

update public.profiles profile
set role = 'school_admin', school_id = allowlist.school_id, updated_at = now()
from public.admin_allowlist allowlist
where lower(profile.email) = lower(allowlist.email);

