-- Two visible demo assignments per school day for class 4A.

with context as (
  select
    school.id as school_id,
    plan.id as plan_id,
    plan.week_start
  from public.schooltowns school
  join public.classes class on class.school_id = school.id
  join public.weekly_plans plan on plan.class_id = class.id
  where school.schoolname = 'scholl'
    and class.class_level = 4
    and class.subclass = 'A'
    and plan.week_start = date_trunc('week', current_date)::date
), seed(id, title, subject, day_number, note, sort_order) as (
  values
    ('21000000-0000-0000-0000-000000000001'::uuid, 'Kopfrechnen', 'Mathematics', 1, 'Übungsblatt A vollständig bearbeiten.', 11),
    ('21000000-0000-0000-0000-000000000002'::uuid, 'Wörter mit ie', 'German', 1, 'Zehn Wörter finden und je einen Satz schreiben.', 12),
    ('21000000-0000-0000-0000-000000000003'::uuid, 'Reading practice', 'English', 2, 'Text zweimal laut lesen.', 21),
    ('21000000-0000-0000-0000-000000000004'::uuid, 'Einmaleins', 'Mathematics', 2, 'Die Reihen 7 und 8 wiederholen.', 22),
    ('21000000-0000-0000-0000-000000000005'::uuid, 'Buchvorstellung', 'German', 3, 'Drei Stichpunkte zum Lieblingsbuch vorbereiten.', 31),
    ('21000000-0000-0000-0000-000000000006'::uuid, 'Weather words', 'English', 3, 'Vokabeln im Heft abschreiben und lernen.', 32),
    ('21000000-0000-0000-0000-000000000007'::uuid, 'Wasserkreislauf', 'Physic', 4, 'Die Zeichnung farbig beschriften.', 41),
    ('21000000-0000-0000-0000-000000000008'::uuid, 'Sachaufgaben', 'Mathematics', 4, 'Buch Seite 35, Aufgaben 3 bis 5.', 42),
    ('21000000-0000-0000-0000-000000000009'::uuid, 'Wochenrückblick', 'German', 5, 'Fünf Sätze über die Schulwoche schreiben.', 51),
    ('21000000-0000-0000-0000-000000000010'::uuid, 'Vokabeltest üben', 'Tests', 5, 'Alle Vokabeln aus Unit 2 wiederholen.', 52)
)
insert into public.assignments (
  id, title, description, subject, teacher_id, deadline, class_level,
  subclass, note, school, teacher_full_name, teacher_url_avatar, student_count
)
select
  seed.id,
  seed.title,
  seed.note,
  seed.subject,
  '10000000-0000-0000-0000-000000000001'::uuid,
  context.week_start::timestamptz + (seed.day_number - 1) * interval '1 day' + interval '15 hours',
  4,
  'A',
  seed.note,
  context.school_id,
  'Frau Müller',
  'https://api.dicebear.com/9.x/initials/svg?seed=Frau%20Mueller',
  24
from context cross join seed
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  subject = excluded.subject,
  deadline = excluded.deadline,
  note = excluded.note;

with context as (
  select plan.id as plan_id
  from public.schooltowns school
  join public.classes class on class.school_id = school.id
  join public.weekly_plans plan on plan.class_id = class.id
  where school.schoolname = 'scholl'
    and class.class_level = 4
    and class.subclass = 'A'
    and plan.week_start = date_trunc('week', current_date)::date
), seed(id, sort_order) as (
  values
    ('21000000-0000-0000-0000-000000000001'::uuid, 11),
    ('21000000-0000-0000-0000-000000000002'::uuid, 12),
    ('21000000-0000-0000-0000-000000000003'::uuid, 21),
    ('21000000-0000-0000-0000-000000000004'::uuid, 22),
    ('21000000-0000-0000-0000-000000000005'::uuid, 31),
    ('21000000-0000-0000-0000-000000000006'::uuid, 32),
    ('21000000-0000-0000-0000-000000000007'::uuid, 41),
    ('21000000-0000-0000-0000-000000000008'::uuid, 42),
    ('21000000-0000-0000-0000-000000000009'::uuid, 51),
    ('21000000-0000-0000-0000-000000000010'::uuid, 52)
)
insert into public.weekly_plan_items (
  weekly_plan_id, item_type, title, description, subject, due_at,
  weekday, assignment_id, sort_order
)
select
  context.plan_id,
  'assignment',
  assignment.title,
  assignment.note,
  assignment.subject,
  assignment.deadline,
  extract(isodow from assignment.deadline)::integer,
  assignment.id,
  seed.sort_order
from context
cross join seed
join public.assignments assignment on assignment.id = seed.id
on conflict (assignment_id) do update set
  weekly_plan_id = excluded.weekly_plan_id,
  title = excluded.title,
  description = excluded.description,
  subject = excluded.subject,
  due_at = excluded.due_at,
  weekday = excluded.weekday,
  sort_order = excluded.sort_order;

