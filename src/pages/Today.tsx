import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarClock,
  ExternalLink,
  FileText,
  Paperclip,
  RefreshCw,
  School,
} from 'lucide-react';
import { format, startOfDay } from 'date-fns';
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
      const [scheduleResult, assignmentsResult] = await Promise.all([
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
          .eq('deadline', format(today, 'yyyy-MM-dd'))
          .order('deadline', { ascending: true }),
      ]);

      if (scheduleResult.error) throw scheduleResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;
      const payload = {
        schedule: scheduleResult.data || [],
        assignments: assignmentsResult.data || [],
      };
      setSchedule(payload.schedule);
      setAssignments(payload.assignments);
      window.localStorage.setItem(cacheKey, JSON.stringify(payload));
      markAppSynced();
      setError(null);
    } catch (loadError) {
      const cached = window.localStorage.getItem(cacheKey);
      if (cached) {
        const payload = JSON.parse(cached) as {
          schedule: ScheduleEntry[]; assignments: Assignment[];
        };
        setSchedule(payload.schedule);
        setAssignments(
          payload.assignments.filter((item) => item.deadline.slice(0, 10) === format(today, 'yyyy-MM-dd'))
        );
        setError(navigator.onLine ? 'تعذر التحديث. يتم عرض آخر نسخة محفوظة.' : null);
      } else {
        setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل ملخص اليوم.');
      }
    } finally {
      setLoading(false);
    }
  }, [identity.classId, identity.classLevel, identity.schoolId, identity.subclass, today, todayName]);

  useEffect(() => { void loadToday(); }, [loadToday]);

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

        <section className="mt-8 grid items-start gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-[#1b222c]">
            <h2 className="flex items-center gap-2 text-xl font-black"><CalendarClock size={22} /> حصص اليوم</h2>
            <div className="mt-5 space-y-3">
              {schedule.map((item) => (
                <article key={item.id} className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 text-slate-900 dark:bg-[#252d38] dark:text-slate-100">
                  <div className="min-w-24 text-center font-black">{formatTime(item.start_time)}–{formatTime(item.end_time)}</div>
                  <div className="h-10 w-px bg-slate-200 dark:bg-slate-600" />
                  <div><h3 className="font-bold">{subjectLabels[item.subject] || item.subject}</h3>{(item.room || item.teacher) && <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{[item.teacher, item.room].filter(Boolean).join(' · ')}</p>}</div>
                </article>
              ))}
              {schedule.length === 0 && <Empty text="لا توجد حصص مسجلة لهذا اليوم." />}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-[#1b222c]">
            <h2 className="flex items-center gap-2 text-xl font-black"><BookOpen size={22} /> مهام اليوم <Count value={assignments.length} /></h2>
            <div className="mt-5 space-y-3">
              {assignments.map((item) => <AssignmentRow key={item.id} item={item} />)}
              {assignments.length === 0 && <Empty text="لا توجد مهام مستحقة اليوم." />}
            </div>
          </div>
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

function AssignmentRow({ item }: { item: Assignment }) {
  return <article className="rounded-2xl bg-emerald-100 p-5 text-emerald-950 dark:bg-[#23483d] dark:text-emerald-50"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{item.title}</h3><p className="mt-1 text-xs text-emerald-800 dark:text-emerald-200">{subjectLabels[item.subject] || item.subject}</p></div>{(item.attachment_path || item.external_link) && <FileText className="shrink-0 text-red-500 dark:text-red-300" size={18} />}</div>{item.note && <p className="mt-3 text-sm leading-6 text-emerald-900/75 dark:text-emerald-100/80">{item.note}</p>}{(item.attachment_path || item.external_link) && <div className="mt-4 flex flex-wrap gap-2">{item.attachment_path && <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-red-600 dark:bg-black/20 dark:text-red-200"><Paperclip className="shrink-0" size={13} /><span className="truncate">{item.attachment_name || 'ورقة عمل'}</span></span>}{item.external_link && <a href={item.external_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-black/20 dark:text-emerald-100"><ExternalLink size={13} /> رابط</a>}</div>}</article>;
}
