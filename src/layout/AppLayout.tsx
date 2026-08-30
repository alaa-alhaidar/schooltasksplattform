import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  CalendarDays,
  Home,
  LogOut,
  RefreshCw,
  Settings,
  WifiOff,
} from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { signOut, supabase } from '../lib/supabase';
import { LAST_SYNC_KEY, SYNC_EVENT } from '../lib/syncStatus';

export interface AppIdentity {
  userId: string | null;
  email: string | null;
  fullName: string | null;
  role: 'student' | 'parent' | 'teacher' | 'school_admin' | 'super_admin' | null;
  schoolName: string | null;
  schoolFullName: string | null;
  schoolId: string | null;
  classId: string | null;
  classLevel: number | null;
  subclass: string | null;
  loading: boolean;
}

const emptyIdentity: AppIdentity = {
  userId: null,
  email: null,
  fullName: null,
  role: null,
  schoolName: null,
  schoolFullName: null,
  schoolId: null,
  classId: null,
  classLevel: null,
  subclass: null,
  loading: true,
};

const AppIdentityContext = createContext<AppIdentity>(emptyIdentity);

export const useAppIdentity = () => useContext(AppIdentityContext);

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [identity, setIdentity] = useState<AppIdentity>(emptyIdentity);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [lastSync, setLastSync] = useState<string | null>(() =>
    window.localStorage.getItem(LAST_SYNC_KEY)
  );

  useEffect(() => {
    const updateOnlineStatus = () => setOnline(navigator.onLine);
    const updateLastSync = (event: Event) =>
      setLastSync((event as CustomEvent<string>).detail);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    window.addEventListener(SYNC_EVENT, updateLastSync);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener(SYNC_EVENT, updateLastSync);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadIdentity = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('لم يتم العثور على جلسة تسجيل دخول نشطة.');

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, school_id')
          .eq('id', user.id)
          .maybeSingle();
        if (profileError) throw profileError;

        const email = profile?.email || user.email || null;
        const inferredRole = /^\d+[a-z]@/i.test(email || '') ? 'student' : 'teacher';
        const role = (profile?.role || inferredRole) as AppIdentity['role'];
        let classId: string | null = null;
        let classLevel: number | null = null;
        let subclass: string | null = null;
        let schoolName: string | null = null;
        let schoolFullName: string | null = null;
        let schoolId: string | null = null;

        const { data: membership, error: membershipError } = await supabase
          .from('class_memberships')
          .select('class_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (membershipError) throw membershipError;

        if (membership) {
          const { data: classRow, error: classError } = await supabase
            .from('classes')
            .select('id, class_level, subclass, school_id')
            .eq('id', membership.class_id)
            .single();
          if (classError) throw classError;

          classId = classRow.id;
          classLevel = classRow.class_level;
          subclass = classRow.subclass;
          schoolId = classRow.school_id;

          const { data: school, error: schoolError } = await supabase
            .from('schooltowns')
            .select('schoolname, school_full_name')
            .eq('id', classRow.school_id)
            .single();
          if (schoolError) throw schoolError;
          schoolName = school.schoolname;
          schoolFullName = school.school_full_name;
        } else if (profile?.school_id) {
          schoolId = profile.school_id;
          const { data: school, error: schoolError } = await supabase
            .from('schooltowns')
            .select('schoolname, school_full_name')
            .eq('id', profile.school_id)
            .single();
          if (schoolError) throw schoolError;
          schoolName = school.schoolname;
          schoolFullName = school.school_full_name;
        } else if (email) {
          const emailSchool = email.split('@')[1]?.split('.')[0] || null;
          if (emailSchool) {
            const { data: school } = await supabase
              .from('schooltowns')
              .select('schoolname, school_full_name')
              .ilike('schoolname', emailSchool)
              .maybeSingle();
            schoolName = school?.schoolname || emailSchool;
            schoolFullName = school?.school_full_name || emailSchool;
          }
        }

        if (active) {
          setIdentity({
            userId: user.id,
            email,
            fullName: profile?.full_name || email,
            role,
            schoolName,
            schoolFullName,
            schoolId,
            classId,
            classLevel,
            subclass,
            loading: false,
          });
          setLoadError(null);
        }
      } catch (error: unknown) {
        if (active) {
          setLoadError(error instanceof Error ? error.message : 'تعذر تحميل الملف الشخصي.');
          setIdentity((current) => ({ ...current, loading: false }));
        }
      }
    };

    loadIdentity();
    return () => {
      active = false;
    };
  }, []);

  const isFamilyView = identity.role === 'student' || identity.role === 'parent';
  const homePath = isFamilyView ? '/schools' : '/dashboard';
  const notificationsPath = isFamilyView
    ? '/schools_notifications'
    : '/notifications';

  const navigation = useMemo(
    () => [
      { path: homePath, label: 'الرئيسية', icon: Home },
      { path: '/Schedule', label: 'الجدول الدراسي', icon: CalendarDays },
      { path: notificationsPath, label: 'الإشعارات', icon: Bell },
    ],
    [homePath, notificationsPath]
  );

  useEffect(() => {
    if (identity.loading) return;
    if (isFamilyView && location.pathname === '/dashboard') {
      navigate('/schools', { replace: true });
    } else if (!isFamilyView && location.pathname === '/schools') {
      navigate('/dashboard', { replace: true });
    } else if (isFamilyView && location.pathname === '/notifications') {
      navigate('/schools_notifications', { replace: true });
    } else if (!isFamilyView && location.pathname === '/schools_notifications') {
      navigate('/notifications', { replace: true });
    }
  }, [identity.loading, isFamilyView, location.pathname, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (identity.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf8f8]">
        <RefreshCw className="animate-spin" size={32} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf8f8] p-6">
        <div dir="rtl" className="max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold">تعذر تحميل الملف الشخصي</h1>
          <p className="mt-3 text-slate-500">{loadError}</p>
          <button onClick={handleSignOut} className="mt-6 rounded-xl bg-black px-5 py-3 text-white">
            العودة إلى تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppIdentityContext.Provider value={identity}>
      <div className="min-h-screen bg-[#faf8f8]">
        <aside className="fixed inset-y-0 right-0 z-50 flex w-20 flex-col items-center border-l border-slate-100 bg-white py-8">
          <button
            onClick={() => navigate(homePath)}
            className="mb-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white"
            title="الرئيسية"
          >
            <BookOpen size={24} />
          </button>

          <nav className="flex flex-1 flex-col items-center gap-5">
            {navigation.map(({ path, label, icon: Icon }) => {
              const active = location.pathname.toLowerCase() === path.toLowerCase();
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`rounded-2xl p-3 transition-colors ${
                    active
                      ? 'bg-slate-100 text-black'
                      : 'text-slate-400 hover:bg-slate-100 hover:text-black'
                  }`}
                  title={label}
                  aria-label={label}
                >
                  <Icon size={23} />
                </button>
              );
            })}
          </nav>

          <button
            onClick={() => navigate('/settings')}
            className={`mb-3 rounded-2xl p-3 transition-colors ${
              location.pathname === '/settings'
                ? 'bg-slate-100 text-black'
                : 'text-slate-400 hover:bg-slate-100 hover:text-black'
            }`}
            title="الإعدادات"
            aria-label="الإعدادات"
          >
            <Settings size={23} />
          </button>

          <button
            onClick={handleSignOut}
            className="rounded-2xl p-3 text-slate-400 hover:bg-red-50 hover:text-red-600"
            title="تسجيل الخروج"
            aria-label="تسجيل الخروج"
          >
            <LogOut size={23} />
          </button>
        </aside>

        <div className="app-shell-page mr-20 min-h-screen">
          <Outlet />
        </div>
        {!online && (
          <div className="fixed bottom-4 left-4 z-[80] flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-medium text-white shadow-lg">
            <WifiOff size={15} />
            <span>
              دون اتصال
              {lastSync && ` · آخر تحديث ${new Date(lastSync).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}`}
            </span>
          </div>
        )}
      </div>
    </AppIdentityContext.Provider>
  );
}
