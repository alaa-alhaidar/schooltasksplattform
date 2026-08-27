-- Arabic demo content for the parent/student experience.

update public.schooltowns
set school_full_name = 'مدرسة الأمل'
where schoolname in ('scholl', 'hotmail');

update public.classes
set name = case class_level
  when 4 then 'الصف الرابع أ'
  when 5 then 'الصف الخامس أ'
  else name
end
where subclass = 'A';

update public.teachers
set full_name = 'المعلمة مريم'
where id = '10000000-0000-0000-0000-000000000001';

update public.assignments
set
  title = translated.title,
  description = translated.note,
  note = translated.note,
  teacher_full_name = 'المعلمة مريم'
from (
  values
    ('20000000-0000-0000-0000-000000000001'::uuid, 'ورقة عمل الرياضيات', 'حل التمارين من 1 إلى 10.'),
    ('20000000-0000-0000-0000-000000000002'::uuid, 'دفتر القراءة', 'تلخيص الفصل الثالث في عشر جمل.'),
    ('20000000-0000-0000-0000-000000000003'::uuid, 'حيواني المفضل', 'كتابة ثماني جمل ورسم صورة.'),
    ('20000000-0000-0000-0000-000000000004'::uuid, 'دورة الماء', 'تسمية مراحل دورة الماء في ورقة العمل.'),
    ('20000000-0000-0000-0000-000000000005'::uuid, 'الاستعداد لاختبار الرياضيات', 'مراجعة جداول الضرب 6 و7 و8.'),
    ('20000000-0000-0000-0000-000000000006'::uuid, 'مقارنة الكسور', 'حل تمارين الصفحة 42 من 2 إلى 6.'),
    ('21000000-0000-0000-0000-000000000001'::uuid, 'الحساب الذهني', 'إكمال ورقة التمارين أ.'),
    ('21000000-0000-0000-0000-000000000002'::uuid, 'تدريب الإملاء', 'كتابة عشر كلمات ووضع كل كلمة في جملة.'),
    ('21000000-0000-0000-0000-000000000003'::uuid, 'تدريب القراءة', 'قراءة النص بصوت مرتفع مرتين.'),
    ('21000000-0000-0000-0000-000000000004'::uuid, 'جداول الضرب', 'مراجعة جدولي 7 و8.'),
    ('21000000-0000-0000-0000-000000000005'::uuid, 'عرض كتاب', 'تحضير ثلاث نقاط عن الكتاب المفضل.'),
    ('21000000-0000-0000-0000-000000000006'::uuid, 'كلمات الطقس', 'كتابة مفردات الطقس وحفظها.'),
    ('21000000-0000-0000-0000-000000000007'::uuid, 'دورة الماء', 'تلوين الرسم وكتابة أسماء المراحل.'),
    ('21000000-0000-0000-0000-000000000008'::uuid, 'مسائل حسابية', 'حل تمارين الصفحة 35 من 3 إلى 5.'),
    ('21000000-0000-0000-0000-000000000009'::uuid, 'مراجعة الأسبوع', 'كتابة خمس جمل عن الأسبوع الدراسي.'),
    ('21000000-0000-0000-0000-000000000010'::uuid, 'الاستعداد لاختبار المفردات', 'مراجعة مفردات الوحدة الثانية.')
) as translated(id, title, note)
where assignments.id = translated.id;

update public.notifications
set
  title = translated.title,
  message = translated.message,
  teacher_full_name = 'المعلمة مريم'
from (
  values
    ('30000000-0000-0000-0000-000000000001'::uuid, 'اجتماع أولياء الأمور', 'سيُعقد الاجتماع يوم الخميس القادم الساعة السادسة مساءً.'),
    ('30000000-0000-0000-0000-000000000002'::uuid, 'إلغاء حصة الرياضة', 'يرجى إحضار الكتب الدراسية المعتادة يوم الجمعة.'),
    ('30000000-0000-0000-0000-000000000003'::uuid, 'تأكيد الرحلة المدرسية', 'يرجى تسليم موافقة ولي الأمر قبل يوم الاثنين.'),
    ('30000000-0000-0000-0000-000000000004'::uuid, 'معلومات الصف', 'تتوفر معلومات جديدة للصف الخامس أ.')
) as translated(id, title, message)
where notifications.id = translated.id;

update public.weekly_plans
set title = 'الخطة الأسبوعية - الأسبوع ' || to_char(week_start, 'IW');

update public.weekly_plan_items item
set
  title = assignment.title,
  description = coalesce(assignment.note, assignment.description, '')
from public.assignments assignment
where item.assignment_id = assignment.id;

update public.weekly_plan_items item
set
  title = notification.title,
  description = notification.message
from public.notifications notification
where item.notification_id = notification.id;

