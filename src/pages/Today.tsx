import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  CalendarClock,
  Clock3,
  ExternalLink,
  FileText,
  PackageOpen,
  Paperclip,
  RefreshCw,
  School,
} from 'lucide-react';
import { addDays, format, isSameDay, parseISO, startOfDay } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { useAppIdentity } from '../layout/AppLayout';
import { markAppSynced } from '../lib/syncStatus';

interface ScheduleEntry {
  id: string;
  day: string;
  start_time: string;
  end_time: string;
  subject: string;
  teacher: string | null;
  room: string | null;
}

interface Assignment {
  id: string;
  title: string;
  subject: string;
  deadline: string;
  note: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  external_link: string | null;
}

interface Notice {
  id: string;
  title: string;
  message: string;
  created_at: string;
  expires_at: string | null;
}

const englishDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const subjectLabels: Record<string, string> = {
  Assignments: 'مهمة', Mathematics: 'الرياضيات', German: 'اللغة الألمانية',
  English: 'اللغة الإنجليزية', Physic: 'العلوم', Chemie: 'الكيمياء', Tests: 'اختبار',
  Science: 'العلوم', History: 'التاريخ', 'Language Arts': 'اللغة',
  'Physical Education': 'الرياضة', Art: 'الفنون', Music: 'الموسيقى',
  'Computer Science': 'الحاسوب', 'Social Studies': 'الدراسات الاجتماعية',
  'Club Activities': 'الأنشطة',
};

const formatTime = (value: string) => value.slice(0, 5);

export default function Today() {
  const identity = useAppIdentity();
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const today = useMemo(() => startOfDay(new Date()), []);
  const todayName = englishDays[today.getDay()];

  const loadToday = useCallback(async () => {
    if (!identity.classId || !identity.schoolId || !identity.classLevel || !identity.subclass) {
      setLoading(false);
      setError('لم يتم ربط هذا الحساب بصف دراسي.');
      return;
    }

    setLoading(true);
    const cacheKey = `schooltasks:today:${identity.classId}`;
    try {
      const [scheduleResult, assignmentsResult, noticesResult] = await Promise.all([
        supabase
          .from('class_schedule_entries')
          .select('id, day, start_time, end_time, subject, teacher, room')
          .eq('class_id', identity.classId)
          .eq('day', todayName)
          .order('start_time', { ascending: true }),
        supabase
          .from('assignments')
          .select('id, title, subject, deadline, note, attachment_path, attachment_name, external_link')
          .eq('school', identity.schoolId)
          .eq('class_level', String(identity.classLevel))
          .ilike('subclass', identity.subclass)
          .gte('deadline', format(today, 'yyyy-MM-dd'))
          .lte('deadline', format(addDays(today, 7), 'yyyy-MM-dd'))
          .order('deadline', { ascending: true }),
        supabase
          .from('notifications')
          .select('id, title, message, created_at, expires_at')
          .eq('school_id', identity.schoolId)
          .eq('class_level', String(identity.classLevel))
          .ilike('subclass', identity.subclass)
          .order('created_at', { ascending: false }),
      ]);

      if (scheduleResult.error) throw scheduleResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;
      if (noticesResult.error) throw noticesResult.error;

      const now = new Date();
      const activeNotices = (noticesResult.data || []).filter((notice) =>
        new Date(notice.created_at) <= now && (!notice.expires_at || new Date(notice.expires_at) >= now)
      );
      const payload = {
        schedule: scheduleResult.data || [],
        assignments: assignmentsResult.data || [],
        notices: activeNotices,
      };
      setSchedule(payload.schedule);
      setAssignments(payload.assignments);
      setNotices(payload.notices);
      window.localStorage.setItem(cacheKey, JSON.stringify(payload));
      markAppSynced();
      setError(null);
    } catch (loadError) {
      const cached = window.localStorage.getItem(cacheKey);
      if (cached) {
        const payload = JSON.parse(cached) as {
          schedule: ScheduleEntry[]; assignments: Assignment[]; notices: Notice[];
        };
        setSchedule(payload.schedule);
        setAssignments(payload.assignments);
        setNotices(payload.notices);
        setError(navigator.onLine ? 'تعذر التحديث. يتم عرض آخر نسخة محفوظة.' : null);
      } else {
        setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل ملخص اليوم.');
      }
    } finally {
      setLoading(false);
    }
  }, [identity.classId, identity.classLevel, identity.schoolId, identity.subclass, today, todayName]);

  useEffect(() => { void loadToday(); }, [loadToday]);

  const todayAssignments = assignments.filter((item) => isSameDay(parseISO(item.deadline), today));
  const upcomingAssignments = assignments.filter((item) => !isSameDay(parseISO(item.deadline), today));
  const materials = assignments.filter((item) => item.attachment_path || item.external_link);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><RefreshCw className="animate-spin" size={32} /></div>;
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#faf8f8] px-5 py-8 text-slate-950 dark:bg-[#11151b] dark:text-slate-100 md:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-8 dark:border-slate-700 md:flex-row md:items-end">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400"><School size={17} /> {identity.schoolFullName || identity.schoolName} · الصف {identity.classLevel} {identity.subclass?.toUpperCase()}</p>
            <h1 className="mt-3 text-4xl font-black">اليوم</h1>
            <p className="mt-2 text-lg text-slate-500 dark:text-slate-300">{format(today, 'EEEE، d MMMM yyyy', { locale: arSA })}</p>
          </div>
          <button onClick={() => void loadToday()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 font-bold text-white dark:bg-white dark:text-slate-950"><RefreshCw size={18} /> تحديث</button>
        </header>

        {error && <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-amber-900 dark:bg-amber-950 dark:text-amber-100">{error}</div>}

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-[#1b222c]">
            <h2 className="flex items-center gap-2 text-xl font-black"><CalendarClock size={22} /> حصص اليوم</h2>
            <div className="mt-5 space-y-3">
              {schedule.map((item) => (
                <article key={item.id} className="flex items-center gap-4 rounded-2xl bg-blue-50 p-4 dark:bg-blue-950/60">
                  <div className="min-w-24 text-center font-black">{formatTime(item.start_time)}–{formatTime(item.end_time)}</div>
                  <div className="h-10 w-px bg-blue-200 dark:bg-blue-800" />
                  <div><h3 className="font-bold">{subjectLabels[item.subject] || item.subject}</h3>{(item.room || item.teacher) && <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{[item.teacher, item.room].filter(Boolean).join(' · ')}</p>}</div>
                </article>
              ))}
              {schedule.length === 0 && <Empty text="لا توجد حصص مسجلة لهذا اليوم." />}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-[#1b222c]">
            <h2 className="flex items-center gap-2 text-xl font-black"><BookOpen size={22} /> مهام اليوم <Count value={todayAssignments.length} /></h2>
            <div className="mt-5 space-y-3">
              {todayAssignments.map((item) => <AssignmentRow key={item.id} item={item} />)}
              {todayAssignments.length === 0 && <Empty text="لا توجد مهام مستحقة اليوم." />}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <Panel icon={CalendarClock} title="قريباً" count={upcomingAssignments.length}>
            {upcomingAssignments.slice(0, 5).map((item) => <AssignmentRow key={item.id} item={item} showDate />)}
            {upcomingAssignments.length === 0 && <Empty text="لا توجد مهام قريبة." />}
          </Panel>
          <Panel icon={Bell} title="تنبيهات حالية" count={notices.length}>
            {notices.slice(0, 4).map((notice) => <article key={notice.id} className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/60"><h3 className="font-bold">{notice.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{notice.message}</p></article>)}
            {notices.length === 0 && <Empty text="لا توجد تنبيهات حالية." />}
          </Panel>
          <Panel icon={PackageOpen} title="المواد المطلوبة" count={materials.length}>
            {materials.slice(0, 5).map((item) => <article key={item.id} className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/60"><h3 className="font-bold">{item.title}</h3><div className="mt-3 flex flex-wrap gap-2">{item.attachment_path && <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-red-600 dark:bg-slate-800"><Paperclip size={13} /> {item.attachment_name || 'ورقة عمل'}</span>}{item.external_link && <a href={item.external_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-slate-800 dark:text-emerald-300"><ExternalLink size={13} /> رابط خارجي</a>}</div></article>)}
            {materials.length === 0 && <Empty text="لا توجد مواد إضافية مطلوبة." />}
          </Panel>
        </section>
      </div>
    </main>
  );
}

function Count({ value }: { value: number }) {
  return <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-black px-2 text-sm text-white dark:bg-white dark:text-black">{value}</span>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400 dark:border-slate-700">{text}</div>;
}

function AssignmentRow({ item, showDate = false }: { item: Assignment; showDate?: boolean }) {
  return <article className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/60"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{item.title}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{subjectLabels[item.subject] || item.subject}</p></div>{(item.attachment_path || item.external_link) && <FileText className="shrink-0 text-red-500" size={18} />}</div>{item.note && <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.note}</p>}{showDate && <p className="mt-3 flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-300"><Clock3 size={13} /> {format(parseISO(item.deadline), 'EEEE، d MMMM', { locale: arSA })}</p>}</article>;
}

function Panel({ icon: Icon, title, count, children }: { icon: typeof Bell; title: string; count: number; children: React.ReactNode }) {
  return <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-[#1b222c]"><h2 className="flex items-center gap-2 text-xl font-black"><Icon size={22} /> {title} <Count value={count} /></h2><div className="mt-5 space-y-3">{children}</div></div>;
}
