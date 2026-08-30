import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDays,
  addWeeks,
  format,
  getISOWeek,
  startOfWeek,
} from 'date-fns';
import { arSA } from 'date-fns/locale';
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flag,
  Home,
  LogOut,
  Map,
  Megaphone,
  RefreshCw,
  School,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signOut, supabase } from './lib/supabase';
import { getDayColor } from './lib/dayColors';
import { markAppSynced } from './lib/syncStatus';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'parent' | 'teacher' | 'school_admin' | 'super_admin';
}

interface ClassData {
  id: string;
  name: string;
  class_level: number;
  subclass: string;
  school_id: string;
}

interface SchoolData {
  id: string;
  schoolname: string;
  school_full_name: string;
}

interface WeeklyPlan {
  id: string;
  title: string;
  week_start: string;
  status: 'draft' | 'published' | 'archived';
}

interface WeeklyPlanItem {
  id: string;
  item_type: 'assignment' | 'announcement' | 'event' | 'schedule';
  title: string;
  description: string;
  subject: string | null;
  due_at: string | null;
  weekday: number | null;
  sort_order: number;
  assignment_id: string | null;
  notification_id: string | null;
}

const weekdays = [
  { value: 1, label: 'الاثنين' },
  { value: 2, label: 'الثلاثاء' },
  { value: 3, label: 'الأربعاء' },
  { value: 4, label: 'الخميس' },
  { value: 5, label: 'الجمعة' },
];

const subjectLabels: Record<string, string> = {
  Assignments: 'مهمة',
  Mathematics: 'الرياضيات',
  German: 'اللغة الألمانية',
  English: 'اللغة الإنجليزية',
  Physic: 'العلوم',
  Chemie: 'الكيمياء',
  Tests: 'اختبار',
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

function WeeklyPlanCard({
  item,
  onClick,
  completed = false,
}: {
  item: WeeklyPlanItem;
  onClick: () => void;
  completed?: boolean;
}) {
  const isAnnouncement = item.item_type === 'announcement';
  const dayColor = getDayColor(item.weekday);
  const cardStyle = isAnnouncement
    ? 'bg-amber-50 text-amber-950'
    : dayColor.card;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-black/30 ${cardStyle}`}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {isAnnouncement ? (
            <Megaphone className="shrink-0" size={18} />
          ) : (
            <BookOpen className="shrink-0" size={18} />
          )}
          <h3 className="font-semibold leading-tight">{item.title}</h3>
        </div>
        {item.subject && (
          <span className="shrink-0 rounded-full bg-white/70 px-2 py-1 text-xs font-medium">
            {subjectLabels[item.subject] || item.subject}
          </span>
        )}
      </div>
      {item.description && (
        <p className="text-sm leading-6 opacity-80">{item.description}</p>
      )}
      {item.due_at && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium opacity-70">
          <Clock3 size={14} />
          التسليم {format(new Date(item.due_at), 'dd.MM.yyyy، HH:mm', { locale: arSA })}
        </div>
      )}
      {completed && (
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm">
          <Flag size={14} fill="currentColor" />
          منجزة
        </span>
      )}
      <span className="mt-3 block text-xs font-semibold opacity-60">عرض التفاصيل</span>
    </button>
  );
}

export default function Schools() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [items, setItems] = useState<WeeklyPlanItem[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<WeeklyPlanItem | null>(null);
  const [completedAssignments, setCompletedAssignments] = useState<Set<string>>(new Set());

  const loadIdentity = useCallback(async () => {
    setLoadingProfile(true);
    setError(null);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('يرجى تسجيل الدخول مرة أخرى.');

      const { data: profileRow, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', user.id)
        .single();
      if (profileError) throw profileError;
      setProfile(profileRow as Profile);

      const { data: membership, error: membershipError } = await supabase
        .from('class_memberships')
        .select('class_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (membershipError) throw membershipError;
      if (!membership) {
        setClassData(null);
        setSchoolData(null);
        return;
      }

      const { data: classRow, error: classError } = await supabase
        .from('classes')
        .select('id, name, class_level, subclass, school_id')
        .eq('id', membership.class_id)
        .single();
      if (classError) throw classError;
      setClassData(classRow as ClassData);

      const { data: schoolRow, error: schoolError } = await supabase
        .from('schooltowns')
        .select('id, schoolname, school_full_name')
        .eq('id', classRow.school_id)
        .single();
      if (schoolError) throw schoolError;
      setSchoolData(schoolRow as SchoolData);
    } catch (loadError: unknown) {
      setError(
        getErrorMessage(
          loadError,
          'تعذر تحميل الملف الشخصي والصف.'
        )
      );
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const loadWeek = useCallback(async () => {
    if (!classData) return;
    const weekCacheKey = `schooltasks:week:${classData.id}:${format(weekStart, 'yyyy-MM-dd')}`;
    setLoadingPlan(true);
    setError(null);
    try {
      const { data: planRow, error: planError } = await supabase
        .from('weekly_plans')
        .select('id, title, week_start, status')
        .eq('class_id', classData.id)
        .eq('week_start', format(weekStart, 'yyyy-MM-dd'))
        .eq('status', 'published')
        .limit(1)
        .maybeSingle();
      if (planError) throw planError;
      if (!planRow) {
        setPlan(null);
        setItems([]);
        return;
      }
      setPlan(planRow as WeeklyPlan);

      const { data: planItems, error: itemsError } = await supabase
        .from('weekly_plan_items')
        .select('id, item_type, title, description, subject, due_at, weekday, sort_order, assignment_id, notification_id')
        .eq('weekly_plan_id', planRow.id)
        .order('sort_order', { ascending: true });
      if (itemsError) throw itemsError;
      const currentWeekItems = (planItems || []) as WeeklyPlanItem[];
      setItems(currentWeekItems);
      window.localStorage.setItem(
        weekCacheKey,
        JSON.stringify({ plan: planRow, items: currentWeekItems })
      );
      markAppSynced();
    } catch (loadError: unknown) {
      const cachedWeek = window.localStorage.getItem(weekCacheKey);
      if (!navigator.onLine && cachedWeek) {
        const cached = JSON.parse(cachedWeek) as {
          plan: WeeklyPlan;
          items: WeeklyPlanItem[];
        };
        setPlan(cached.plan);
        setItems(cached.items);
        setError(null);
      } else {
        setError(
          getErrorMessage(loadError, 'تعذر تحميل الخطة الأسبوعية.')
        );
      }
    } finally {
      setLoadingPlan(false);
    }
  }, [classData, weekStart]);

  useEffect(() => {
    loadIdentity();
  }, [loadIdentity]);

  useEffect(() => {
    loadWeek();
  }, [loadWeek]);

  useEffect(() => {
    if (!plan?.id) return;
    const planChannel = supabase
      .channel(`weekly-plan-${plan.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'weekly_plan_items',
          filter: `weekly_plan_id=eq.${plan.id}`,
        },
        () => loadWeek()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(planChannel);
    };
  }, [loadWeek, plan?.id]);

  useEffect(() => {
    if (!profile) return;
    const loadCompletions = async () => {
      const { data } = await supabase
        .from('assignment_completions')
        .select('assignment_id')
        .eq('user_id', profile.id)
        .eq('week_start', format(weekStart, 'yyyy-MM-dd'));
      setCompletedAssignments(
        new Set((data || []).map((row) => row.assignment_id as string))
      );
    };
    loadCompletions();
  }, [profile, weekStart]);

  const toggleAssignmentCompletion = async (assignmentId: string) => {
    if (!profile) return;
    const completed = completedAssignments.has(assignmentId);
    setCompletedAssignments((current) => {
      const next = new Set(current);
      if (completed) next.delete(assignmentId);
      else next.add(assignmentId);
      return next;
    });

    const { error: completionError } = completed
      ? await supabase
          .from('assignment_completions')
          .delete()
          .eq('assignment_id', assignmentId)
          .eq('user_id', profile.id)
          .eq('week_start', format(weekStart, 'yyyy-MM-dd'))
      : await supabase.from('assignment_completions').insert({
          assignment_id: assignmentId,
          user_id: profile.id,
          week_start: format(weekStart, 'yyyy-MM-dd'),
        });

    if (completionError) {
      setCompletedAssignments((current) => {
        const next = new Set(current);
        if (completed) next.add(assignmentId);
        else next.delete(assignmentId);
        return next;
      });
      setError('تعذر حفظ حالة المهمة.');
    }
  };

  useEffect(() => {
    if (!selectedItem) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedItem(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedItem]);

  const announcements = useMemo(
    () => items.filter((item) => item.item_type === 'announcement'),
    [items]
  );
  const itemsByDay = useMemo(
    () =>
      weekdays.map((day) => ({
        ...day,
        items: items.filter(
          (item) => item.item_type !== 'announcement' && item.weekday === day.value
        ),
      })),
    [items]
  );
  const otherItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.item_type !== 'announcement' &&
          (item.weekday === null || item.weekday < 1 || item.weekday > 5)
      ),
    [items]
  );

  const navigationState = {
    schoolName: schoolData?.schoolname,
    email: profile?.email,
    classLevel: classData?.class_level,
    subclass: classData?.subclass,
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf8f8]">
        <RefreshCw className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#faf8f8] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-10 flex w-20 flex-col items-center border-r border-slate-100 bg-white py-8">
        <div className="mb-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
          <BookOpen size={24} />
        </div>
        <nav className="flex flex-1 flex-col items-center gap-5">
          <button className="rounded-2xl bg-slate-100 p-3" title="الخطة الأسبوعية">
            <Home size={23} />
          </button>
          <button
            className="rounded-2xl p-3 text-slate-400 hover:bg-slate-100 hover:text-black"
            title="الجدول الدراسي"
            onClick={() => navigate('/Schedule', { state: navigationState })}
          >
            <CalendarDays size={23} />
          </button>
          <button
            className="rounded-2xl p-3 text-slate-400 hover:bg-slate-100 hover:text-black"
            title="الإشعارات"
            onClick={() => navigate('/schools_notifications', { state: navigationState })}
          >
            <Bell size={23} />
          </button>
        </nav>
        <button
          onClick={handleSignOut}
          className="rounded-2xl p-3 text-slate-400 hover:bg-red-50 hover:text-red-600"
          title="تسجيل الخروج"
        >
          <LogOut size={23} />
        </button>
      </aside>

      <main className="ml-20 min-w-0 flex-1 px-6 py-8 md:px-10 lg:px-14">
        <header className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <School size={17} />
              {schoolData?.school_full_name || 'مدرستي'}
              {classData && <><span>·</span><span>{classData.name}</span></>}
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">الخطة الأسبوعية</h1>
            {profile && (
              <p className="mt-2 text-sm text-slate-500">
                مسجل باسم {profile.full_name} ({profile.email})
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <button onClick={() => setWeekStart((date) => addWeeks(date, -1))} className="rounded-xl p-2 hover:bg-slate-100" aria-label="الأسبوع السابق">
              <ChevronRight size={21} />
            </button>
            <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="min-w-48 rounded-xl px-3 py-2 text-center hover:bg-slate-50">
              <div className="font-semibold">الأسبوع {getISOWeek(weekStart)}</div>
              <div className="text-xs text-slate-500">
                {format(weekStart, 'dd MMM', { locale: arSA })} – {format(addDays(weekStart, 6), 'dd MMM yyyy', { locale: arSA })}
              </div>
            </button>
            <button onClick={() => setWeekStart((date) => addWeeks(date, 1))} className="rounded-xl p-2 hover:bg-slate-100" aria-label="الأسبوع التالي">
              <ChevronLeft size={21} />
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
            <p className="font-semibold">تعذر عرض الخطة الأسبوعية.</p>
            <p className="mt-1 text-sm">{error}</p>
            <button onClick={loadIdentity} className="mt-4 rounded-xl bg-red-800 px-4 py-2 text-sm font-medium text-white">إعادة المحاولة</button>
          </div>
        )}

        {!error && !classData && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Map className="mx-auto mb-4 text-slate-400" size={40} />
            <h2 className="text-xl font-semibold">لم يتم ربط الحساب بصف بعد</h2>
            <p className="mx-auto mt-2 max-w-lg text-slate-500">يرجى التواصل مع المدرسة لربط حسابك بصف أو بطفل.</p>
          </div>
        )}

        {classData && loadingPlan && (
          <div className="flex min-h-72 items-center justify-center"><RefreshCw className="animate-spin text-slate-400" size={30} /></div>
        )}

        {classData && !loadingPlan && !error && !plan && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <CalendarDays className="mx-auto mb-4 text-slate-400" size={40} />
            <h2 className="text-xl font-semibold">لم تُنشر خطة للأسبوع {getISOWeek(weekStart)} بعد</h2>
            <p className="mt-2 text-slate-500">انتقل إلى أسبوع آخر أو عد لاحقاً.</p>
          </div>
        )}

        {classData && !loadingPlan && plan && (
          <div className="space-y-8">
            {announcements.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2"><Megaphone size={20} /><h2 className="text-lg font-bold">إشعارات مهمة</h2></div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {announcements.map((item) => <WeeklyPlanCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />)}
                </div>
              </section>
            )}

            <section>
              <div className="mb-5 flex items-center">
                <div className="flex items-center gap-2"><CalendarDays size={20} /><h2 className="text-lg font-bold">المهام حسب أيام الأسبوع</h2></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {itemsByDay.map((day) => (
                  <div key={day.value} className="min-h-52 px-1">
                    <div className={`mb-4 rounded-2xl border px-4 py-3 text-center ${getDayColor(day.value).border} ${getDayColor(day.value).soft}`}>
                      <h3 className="text-xl font-black tracking-wide">{day.label}</h3>
                    </div>
                    <div className="space-y-3">
                      {day.items.map((item) => (
                        <WeeklyPlanCard
                          key={item.id}
                          item={item}
                          completed={Boolean(
                            item.assignment_id &&
                              completedAssignments.has(item.assignment_id)
                          )}
                          onClick={() => setSelectedItem(item)}
                        />
                      ))}
                      {day.items.length === 0 && <p className="px-1 py-8 text-center text-sm text-slate-400">لا توجد مهام</p>}
                    </div>
                  </div>
                ))}
              </div>
              {otherItems.length > 0 && (
                <div className="mt-4 rounded-3xl border border-slate-200 bg-white/60 p-4">
                  <h3 className="mb-3 font-bold">مهام أخرى</h3>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {otherItems.map((item) => (
                      <WeeklyPlanCard
                        key={item.id}
                        item={item}
                        completed={Boolean(
                          item.assignment_id &&
                            completedAssignments.has(item.assignment_id)
                        )}
                        onClick={() => setSelectedItem(item)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {selectedItem && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedItem(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-item-title"
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl md:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {selectedItem.item_type === 'assignment' ? 'مهمة' : selectedItem.item_type === 'announcement' ? 'إشعار' : selectedItem.item_type === 'event' ? 'موعد' : 'جدول دراسي'}
                </span>
                <h2 id="plan-item-title" className="mt-3 text-2xl font-bold">
                  {selectedItem.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-black"
                aria-label="إغلاق التفاصيل"
              >
                <X size={22} />
              </button>
            </div>

            <dl className="mt-6 space-y-4">
              {selectedItem.subject && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">المادة</dt>
                  <dd className="mt-1 font-medium">{subjectLabels[selectedItem.subject] || selectedItem.subject}</dd>
                </div>
              )}
              {selectedItem.weekday && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">اليوم</dt>
                  <dd className="mt-1 font-medium">
                    {weekdays.find((day) => day.value === selectedItem.weekday)?.label || 'عطلة نهاية الأسبوع'}
                  </dd>
                </div>
              )}
              {selectedItem.due_at && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">موعد التسليم</dt>
                  <dd className="mt-1 flex items-center gap-2 font-medium">
                    <Clock3 size={17} />
                    {format(new Date(selectedItem.due_at), 'EEEE، dd MMMM yyyy · HH:mm', { locale: arSA })}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">الوصف</dt>
                <dd className="mt-2 whitespace-pre-wrap leading-7 text-slate-700">
                  {selectedItem.description || 'لا يوجد وصف إضافي.'}
                </dd>
              </div>
            </dl>
            {selectedItem.assignment_id && (
              <button
                type="button"
                onClick={() => toggleAssignmentCompletion(selectedItem.assignment_id!)}
                className={`mt-6 w-full rounded-xl px-5 py-3 font-semibold transition ${
                  completedAssignments.has(selectedItem.assignment_id)
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    : 'bg-black text-white hover:bg-slate-800'
                }`}
              >
                {completedAssignments.has(selectedItem.assignment_id)
                  ? 'تم إنجاز المهمة'
                  : 'تحديد كمهمة منجزة'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="mt-8 w-full rounded-xl bg-black px-5 py-3 font-semibold text-white hover:bg-slate-800"
            >
              إغلاق
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
