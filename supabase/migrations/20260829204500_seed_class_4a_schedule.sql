-- Initial timetable for the 4A demo class. Admin changes can overwrite each slot.

with target_class as (
  select class.id
  from public.classes class
  join public.schooltowns school on school.id = class.school_id
  where school.schoolname = 'scholl'
    and class.class_level = 4
    and upper(class.subclass) = 'A'
  order by class.school_year desc
  limit 1
), schedule(day, start_time, end_time, subject) as (
  values
    ('Monday',    '08:00'::time, '10:00'::time, 'Mathematics'),
    ('Monday',    '10:00'::time, '12:00'::time, 'Science'),
    ('Monday',    '12:00'::time, '14:00'::time, 'History'),
    ('Tuesday',   '08:00'::time, '10:00'::time, 'Language Arts'),
    ('Tuesday',   '10:00'::time, '12:00'::time, 'Physical Education'),
    ('Tuesday',   '12:00'::time, '14:00'::time, 'Art'),
    ('Wednesday', '08:00'::time, '10:00'::time, 'Mathematics'),
    ('Wednesday', '10:00'::time, '12:00'::time, 'Music'),
    ('Wednesday', '12:00'::time, '14:00'::time, 'Computer Science'),
    ('Thursday',  '08:00'::time, '10:00'::time, 'Science'),
    ('Thursday',  '10:00'::time, '12:00'::time, 'Social Studies'),
    ('Thursday',  '12:00'::time, '14:00'::time, 'Language Arts'),
    ('Friday',    '08:00'::time, '10:00'::time, 'Mathematics'),
    ('Friday',    '10:00'::time, '12:00'::time, 'Science'),
    ('Friday',    '12:00'::time, '14:00'::time, 'Club Activities')
)
insert into public.class_schedule_entries (
  class_id,
  day,
  start_time,
  end_time,
  subject
)
select target_class.id, schedule.day, schedule.start_time,
  schedule.end_time, schedule.subject
from target_class
cross join schedule
on conflict (class_id, day, start_time) do nothing;

