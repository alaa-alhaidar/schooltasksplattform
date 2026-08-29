-- Flexible class structure: grades 1-13, subclasses A-D.

insert into public.classes (school_id, name, class_level, subclass)
select
  school.id,
  'الصف ' || grade.level || ' ' || section.letter,
  grade.level,
  section.letter
from public.schooltowns school
cross join generate_series(1, 13) as grade(level)
cross join (values ('A'), ('B'), ('C'), ('D')) as section(letter)
where school.schoolname = 'scholl'
on conflict (school_id, class_level, subclass, school_year) do update
set name = excluded.name;

-- Attach existing student profiles again in case their class was previously absent.
insert into public.class_memberships (user_id, class_id, membership_role)
select profile.id, class.id, 'student'
from public.profiles profile
join public.schooltowns school on school.id = profile.school_id
join public.classes class
  on class.school_id = school.id
 and class.class_level = substring(split_part(profile.email, '@', 1) from '^([0-9]+)')::integer
 and class.subclass = upper(substring(split_part(profile.email, '@', 1) from '[A-Za-z]$'))
where profile.role = 'student'
  and split_part(profile.email, '@', 1) ~ '^[0-9]+[A-Za-z]$'
on conflict (user_id, class_id, membership_role) do nothing;

