-- Idempotent demo data for the school platform.
-- The synthetic teacher has no password and cannot be used to sign in.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'demo.teacher@scholl.invalid',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Frau Müller"}'::jsonb,
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.teachers (id, email, full_name, avatar_url)
values (
  '10000000-0000-0000-0000-000000000001',
  'demo.teacher@scholl.invalid',
  'Frau Müller',
  'https://api.dicebear.com/9.x/initials/svg?seed=Frau%20Mueller'
)
on conflict (id) do update set
  full_name = excluded.full_name,
  avatar_url = excluded.avatar_url;

update public.students
set full_name = case email
  when '4a@scholl.com' then 'Demo Schüler 4A'
  when '5a@scholl.com' then 'Demo Schüler 5A'
  else full_name
end
where email in ('4a@scholl.com', '5a@scholl.com');

insert into public.assignments (
  id,
  title,
  description,
  subject,
  teacher_id,
  deadline,
  class_level,
  subclass,
  note,
  school,
  teacher_full_name,
  teacher_url_avatar,
  student_count
)
select
  seed.id,
  seed.title,
  seed.description,
  seed.subject,
  '10000000-0000-0000-0000-000000000001'::uuid,
  seed.deadline,
  seed.class_level,
  seed.subclass,
  seed.note,
  school.id,
  'Frau Müller',
  'https://api.dicebear.com/9.x/initials/svg?seed=Frau%20Mueller',
  seed.student_count
from public.schooltowns school
cross join (
  values
    ('20000000-0000-0000-0000-000000000001'::uuid, 'Mathe-Arbeitsblatt', 'Addition und Subtraktion üben', 'Mathematics', now() + interval '2 days', 4, 'A', 'Bitte die Aufgaben 1 bis 10 lösen.', 24),
    ('20000000-0000-0000-0000-000000000002'::uuid, 'Lesetagebuch', 'Kapitel 3 zusammenfassen', 'German', now() + interval '4 days', 4, 'A', 'Mindestens zehn vollständige Sätze.', 24),
    ('20000000-0000-0000-0000-000000000003'::uuid, 'My favourite animal', 'Kurzen englischen Text schreiben', 'English', now() + interval '6 days', 4, 'A', 'Schreibe acht Sätze und male ein Bild.', 24),
    ('20000000-0000-0000-0000-000000000004'::uuid, 'Sachkunde: Wasser', 'Den Wasserkreislauf beschriften', 'Physic', now() + interval '8 days', 4, 'A', 'Arbeitsblatt aus dem Unterricht verwenden.', 24),
    ('20000000-0000-0000-0000-000000000005'::uuid, 'Mathe-Test vorbereiten', 'Einmaleins wiederholen', 'Tests', now() + interval '10 days', 4, 'A', 'Übe besonders die Reihen 6, 7 und 8.', 24),
    ('20000000-0000-0000-0000-000000000006'::uuid, 'Bruchrechnung', 'Einfache Brüche vergleichen', 'Mathematics', now() + interval '5 days', 5, 'A', 'Buch Seite 42, Aufgaben 2 bis 6.', 27)
) as seed(id, title, description, subject, deadline, class_level, subclass, note, student_count)
where school.schoolname = 'scholl'
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  subject = excluded.subject,
  deadline = excluded.deadline,
  class_level = excluded.class_level,
  subclass = excluded.subclass,
  note = excluded.note,
  school = excluded.school,
  teacher_full_name = excluded.teacher_full_name,
  teacher_url_avatar = excluded.teacher_url_avatar,
  student_count = excluded.student_count;

insert into public.notifications (
  id,
  title,
  message,
  teacher_id,
  school_id,
  class_level,
  subclass,
  read,
  teacher_full_name,
  teacher_avatar_url,
  created_at
)
select
  seed.id,
  seed.title,
  seed.message,
  '10000000-0000-0000-0000-000000000001'::uuid,
  school.id,
  seed.class_level,
  seed.subclass,
  seed.is_read,
  'Frau Müller',
  'https://api.dicebear.com/9.x/initials/svg?seed=Frau%20Mueller',
  seed.created_at
from public.schooltowns school
cross join (
  values
    ('30000000-0000-0000-0000-000000000001'::uuid, 'Elternabend', 'Der Elternabend findet am kommenden Donnerstag um 18 Uhr statt.', '4', 'A', false, now() - interval '1 hour'),
    ('30000000-0000-0000-0000-000000000002'::uuid, 'Sport fällt aus', 'Bitte am Freitag die normalen Schulsachen mitbringen.', '4', 'A', false, now() - interval '1 day'),
    ('30000000-0000-0000-0000-000000000003'::uuid, 'Ausflug bestätigt', 'Die Einverständniserklärung bitte bis Montag abgeben.', '4', 'A', true, now() - interval '3 days'),
    ('30000000-0000-0000-0000-000000000004'::uuid, 'Klasseninformation', 'Neue Informationen für die Klasse 5A sind verfügbar.', '5', 'A', false, now() - interval '2 hours')
) as seed(id, title, message, class_level, subclass, is_read, created_at)
where school.schoolname = 'scholl'
on conflict (id) do update set
  title = excluded.title,
  message = excluded.message,
  school_id = excluded.school_id,
  class_level = excluded.class_level,
  subclass = excluded.subclass,
  read = excluded.read,
  created_at = excluded.created_at;

