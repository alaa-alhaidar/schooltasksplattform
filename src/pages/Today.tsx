import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarClock,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Paperclip,
  RefreshCw,
  School,
  X,
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
  teacher_full_name: string | null;
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
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
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
          .select('id, title, subject, deadline, note, attachment_path, attachment_name, external_link, teacher_full_name')
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

  useEffect(() => {
    let active = true;
    setAttachmentUrl(null);
    if (!selectedAssignment?.attachment_path) return;
    void supabase.storage
      .from('assignment-files')
      .createSignedUrl(selectedAssignment.attachment_path, 3600)
      .then(({ data }) => {
        if (active) setAttachmentUrl(data?.signedUrl || null);
      });
    return () => { active = false; };
  }, [selectedAssignment?.attachment_path]);

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
          <div className="today-section-card rounded-3xl bg-white p-6 shadow-sm dark:bg-[#1b222c]">
            <h2 className="flex items-center gap-2 text-xl font-black"><CalendarClock size={22} /> حصص اليوم</h2>
            <div className="mt-5 space-y-3">
              {schedule.map((item) => (
                <article key={item.id} className="today-lesson-card flex items-center gap-4 rounded-2xl bg-slate-50 p-4 text-slate-900 dark:bg-[#252d38] dark:text-slate-100">
                  <div className="min-w-24 text-center font-black">{formatTime(item.start_time)}–{formatTime(item.end_time)}</div>
                  <div className="h-10 w-px bg-slate-200 dark:bg-slate-600" />
                  <div><h3 className="font-bold">{subjectLabels[item.subject] || item.subject}</h3>{(item.room || item.teacher) && <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{[item.teacher, item.room].filter(Boolean).join(' · ')}</p>}</div>
                </article>
              ))}
              {schedule.length === 0 && <Empty text="لا توجد حصص مسجلة لهذا اليوم." />}
            </div>
          </div>

          <div className="today-section-card rounded-3xl bg-white p-6 shadow-sm dark:bg-[#1b222c]">
            <h2 className="flex items-center gap-2 text-xl font-black"><BookOpen size={22} /> مهام اليوم <Count value={assignments.length} /></h2>
            <div className="mt-5 space-y-3">
              {assignments.map((item) => <AssignmentRow key={item.id} item={item} onClick={() => setSelectedAssignment(item)} />)}
              {assignments.length === 0 && <Empty text="لا توجد مهام مستحقة اليوم." />}
            </div>
          </div>
        </section>

        {selectedAssignment && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4" onMouseDown={() => setSelectedAssignment(null)}>
            <section className="w-full max-w-lg rounded-3xl bg-white p-7 text-slate-950 shadow-2xl dark:bg-[#202833] dark:text-slate-100" onMouseDown={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-4">
                <div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-100">{subjectLabels[selectedAssignment.subject] || selectedAssignment.subject}</span><h2 className="mt-4 text-2xl font-black">{selectedAssignment.title}</h2></div>
                <button onClick={() => setSelectedAssignment(null)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="إغلاق"><X size={22} /></button>
              </div>
              <div className="mt-6 space-y-5">
                <div><p className="text-xs font-bold text-slate-400">موعد التسليم</p><p className="mt-2 flex items-center gap-2 font-bold"><Clock3 size={17} /> {format(new Date(selectedAssignment.deadline), 'EEEE، d MMMM yyyy', { locale: arSA })}</p></div>
                {selectedAssignment.note && <div><p className="text-xs font-bold text-slate-400">الوصف</p><p className="mt-2 whitespace-pre-wrap leading-7">{selectedAssignment.note}</p></div>}
                {selectedAssignment.teacher_full_name && <div><p className="text-xs font-bold text-slate-400">المعلم</p><p className="mt-2 font-semibold">{selectedAssignment.teacher_full_name}</p></div>}
                {selectedAssignment.attachment_path && (attachmentUrl ? <a href={attachmentUrl} target="_blank" rel="noreferrer" className="flex w-full items-center justify-between gap-3 rounded-2xl bg-red-50 p-4 font-bold text-red-700 dark:bg-red-950/50 dark:text-red-200"><span className="min-w-0 break-all">{selectedAssignment.attachment_name || 'فتح المرفق'}</span><Download className="shrink-0" size={19} /></a> : <div className="rounded-2xl bg-slate-100 p-4 text-center text-sm text-slate-500 dark:bg-slate-700 dark:text-slate-300">جارٍ تجهيز المرفق…</div>)}
                {selectedAssignment.external_link && <a href={selectedAssignment.external_link} target="_blank" rel="noreferrer" className="flex w-full items-center justify-between rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"><span>فتح الرابط الخارجي</span><ExternalLink size={19} /></a>}
              </div>
              <button onClick={() => setSelectedAssignment(null)} className="mt-7 w-full rounded-2xl bg-black py-3.5 font-bold text-white dark:bg-white dark:text-black">إغلاق</button>
            </section>
          </div>
        )}
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

function AssignmentRow({ item, onClick }: { item: Assignment; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="today-task-card w-full rounded-2xl bg-emerald-100 p-5 text-right text-emerald-950 transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black">{item.title}</h3><span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold">{subjectLabels[item.subject] || item.subject}</span></div></div>{(item.attachment_path || item.external_link) && <FileText className="today-task-file shrink-0 text-red-500" size={20} />}</div>{item.note && <p className="today-task-note mt-3 text-sm font-medium leading-6 text-emerald-900/75">{item.note}</p>}<p className="today-task-note mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-900/70"><Clock3 size={14} /> التسليم {format(new Date(item.deadline), 'dd.MM.yyyy', { locale: arSA })}</p>{(item.attachment_path || item.external_link) && <div className="mt-4 flex flex-wrap gap-2">{item.attachment_path && <span className="today-task-attachment inline-flex max-w-full items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-red-600"><Paperclip className="shrink-0" size={13} /><span className="truncate">{item.attachment_name || 'ورقة عمل'}</span></span>}{item.external_link && <span className="today-task-link inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-emerald-800"><ExternalLink size={13} /> رابط</span>}</div>}<span className="today-task-note mt-4 block text-xs font-bold text-emerald-900/60">عرض التفاصيل</span></button>;
}
