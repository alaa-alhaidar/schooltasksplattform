import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, addWeeks, format, getISOWeek, startOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Home,
  LogOut,
  Map,
  Megaphone,
  RefreshCw,
  School,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signOut, supabase } from './lib/supabase';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'parent' | 'teacher' | 'school_admin';
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
}

const weekdays = [
  { value: 1, label: 'Montag' },
  { value: 2, label: 'Dienstag' },
  { value: 3, label: 'Mittwoch' },
  { value: 4, label: 'Donnerstag' },
  { value: 5, label: 'Freitag' },
];

const subjectStyles: Record<string, string> = {
  Mathematics: 'border-blue-300 bg-blue-50 text-blue-900',
  German: 'border-orange-300 bg-orange-50 text-orange-900',
  English: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  Physic: 'border-violet-300 bg-violet-50 text-violet-900',
  Chemie: 'border-yellow-300 bg-yellow-50 text-yellow-900',
  Tests: 'border-red-300 bg-red-50 text-red-900',
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

function WeeklyPlanCard({ item }: { item: WeeklyPlanItem }) {
  const isAnnouncement = item.item_type === 'announcement';
  const cardStyle = isAnnouncement
    ? 'border-amber-300 bg-amber-50 text-amber-950'
    : subjectStyles[item.subject || ''] ||
      'border-slate-200 bg-white text-slate-900';

  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${cardStyle}`}>
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
            {item.subject}
          </span>
        )}
      </div>
      {item.description && (
        <p className="text-sm leading-6 opacity-80">{item.description}</p>
      )}
      {item.due_at && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium opacity-70">
          <Clock3 size={14} />
          Abgabe {format(new Date(item.due_at), 'dd.MM.yyyy, HH:mm', { locale: de })}
        </div>
      )}
    </article>
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

  const loadIdentity = useCallback(async () => {
    setLoadingProfile(true);
    setError(null);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Bitte melde dich erneut an.');

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
          'Profil und Klasse konnten nicht geladen werden.'
        )
      );
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const loadWeek = useCallback(async () => {
    if (!classData) return;
    setLoadingPlan(true);
    setError(null);
    try {
      const { data: planRow, error: planError } = await supabase
        .from('weekly_plans')
        .select('id, title, week_start, status')
        .eq('class_id', classData.id)
        .eq('week_start', format(weekStart, 'yyyy-MM-dd'))
        .eq('status', 'published')
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
        .select('id, item_type, title, description, subject, due_at, weekday, sort_order')
        .eq('weekly_plan_id', planRow.id)
        .order('sort_order', { ascending: true });
      if (itemsError) throw itemsError;
      setItems((planItems || []) as WeeklyPlanItem[]);
    } catch (loadError: unknown) {
      setError(
        getErrorMessage(loadError, 'Der Wochenplan konnte nicht geladen werden.')
      );
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
          <button className="rounded-2xl bg-slate-100 p-3" title="Wochenplan">
            <Home size={23} />
          </button>
          <button
            className="rounded-2xl p-3 text-slate-400 hover:bg-slate-100 hover:text-black"
            title="Stundenplan"
            onClick={() => navigate('/Schedule', { state: navigationState })}
          >
            <CalendarDays size={23} />
          </button>
          <button
            className="rounded-2xl p-3 text-slate-400 hover:bg-slate-100 hover:text-black"
            title="Mitteilungen"
            onClick={() => navigate('/schools_notifications', { state: navigationState })}
          >
            <Bell size={23} />
          </button>
        </nav>
        <button
          onClick={handleSignOut}
          className="rounded-2xl p-3 text-slate-400 hover:bg-red-50 hover:text-red-600"
          title="Abmelden"
        >
          <LogOut size={23} />
        </button>
      </aside>

      <main className="ml-20 min-w-0 flex-1 px-6 py-8 md:px-10 lg:px-14">
        <header className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <School size={17} />
              {schoolData?.school_full_name || 'Meine Schule'}
              {classData && <><span>·</span><span>{classData.name}</span></>}
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Wochenplan</h1>
            {profile && (
              <p className="mt-2 text-sm text-slate-500">
                Angemeldet als {profile.full_name} ({profile.email})
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <button onClick={() => setWeekStart((date) => addWeeks(date, -1))} className="rounded-xl p-2 hover:bg-slate-100" aria-label="Vorherige Woche">
              <ChevronLeft size={21} />
            </button>
            <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="min-w-48 rounded-xl px-3 py-2 text-center hover:bg-slate-50">
              <div className="font-semibold">Kalenderwoche {getISOWeek(weekStart)}</div>
              <div className="text-xs text-slate-500">
                {format(weekStart, 'dd. MMM', { locale: de })} – {format(addDays(weekStart, 6), 'dd. MMM yyyy', { locale: de })}
              </div>
            </button>
            <button onClick={() => setWeekStart((date) => addWeeks(date, 1))} className="rounded-xl p-2 hover:bg-slate-100" aria-label="Nächste Woche">
              <ChevronRight size={21} />
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
            <p className="font-semibold">Der Wochenplan konnte nicht angezeigt werden.</p>
            <p className="mt-1 text-sm">{error}</p>
            <button onClick={loadIdentity} className="mt-4 rounded-xl bg-red-800 px-4 py-2 text-sm font-medium text-white">Erneut versuchen</button>
          </div>
        )}

        {!error && !classData && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Map className="mx-auto mb-4 text-slate-400" size={40} />
            <h2 className="text-xl font-semibold">Noch keiner Klasse zugeordnet</h2>
            <p className="mx-auto mt-2 max-w-lg text-slate-500">Bitte lasse dein Konto von der Schule mit einer Klasse oder einem Kind verbinden.</p>
          </div>
        )}

        {classData && loadingPlan && (
          <div className="flex min-h-72 items-center justify-center"><RefreshCw className="animate-spin text-slate-400" size={30} /></div>
        )}

        {classData && !loadingPlan && !error && !plan && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <CalendarDays className="mx-auto mb-4 text-slate-400" size={40} />
            <h2 className="text-xl font-semibold">Für KW {getISOWeek(weekStart)} ist noch kein Plan veröffentlicht</h2>
            <p className="mt-2 text-slate-500">Wechsle zu einer anderen Woche oder schaue später erneut vorbei.</p>
          </div>
        )}

        {classData && !loadingPlan && plan && (
          <div className="space-y-8">
            {announcements.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2"><Megaphone size={20} /><h2 className="text-lg font-bold">Wichtige Mitteilungen</h2></div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {announcements.map((item) => <WeeklyPlanCard key={item.id} item={item} />)}
                </div>
              </section>
            )}

            <section>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2"><CalendarDays size={20} /><h2 className="text-lg font-bold">Aufgaben nach Wochentag</h2></div>
                <span className="text-sm text-slate-500">{items.filter((item) => item.item_type !== 'announcement').length} Einträge</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {itemsByDay.map((day) => (
                  <div key={day.value} className="min-h-52 rounded-3xl border border-slate-200 bg-white/60 p-3">
                    <div className="mb-3 flex items-center justify-between px-1">
                      <h3 className="font-bold">{day.label}</h3>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">{day.items.length}</span>
                    </div>
                    <div className="space-y-3">
                      {day.items.map((item) => <WeeklyPlanCard key={item.id} item={item} />)}
                      {day.items.length === 0 && <p className="px-1 py-8 text-center text-sm text-slate-400">Keine Einträge</p>}
                    </div>
                  </div>
                ))}
              </div>
              {otherItems.length > 0 && (
                <div className="mt-4 rounded-3xl border border-slate-200 bg-white/60 p-4">
                  <h3 className="mb-3 font-bold">Weitere Einträge</h3>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {otherItems.map((item) => (
                      <WeeklyPlanCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
