import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Home,
  Calendar,
  Book,
  LogOut,
  MessageSquare,
  Clock,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { supabase, signOut } from '../lib/supabase';
import { useAppIdentity } from '../layout/AppLayout';
import { markAppSynced } from '../lib/syncStatus';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  teacher_full_name: string;
  teacher_avatar_url: string;
  class_level: string;
  subclass: string;
  read: boolean;
}

interface SchoolTownData {
  id: string;
  schoolname: string;
  school_full_name: string;
}

function Notifications() {
  const navigate = useNavigate();
  const { schoolName, schoolFullName, schoolId, userId, email, classLevel, subclass } = useAppIdentity();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [schoolTownData, setSchoolTownData] = useState<SchoolTownData | null>(
    null
  );
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolDataLoaded, setSchoolDataLoaded] = useState(false);

  // Auth effect
  useEffect(() => {
    const setupAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    };

    setupAuth();
  }, []);

  // School data comes from the shared, persistent app identity.
  useEffect(() => {
    if (!schoolId || !schoolName) {
      setError('لم يتم ربط الحساب بمدرسة.');
      setLoading(false);
      return;
    }
    setSchoolTownData({ id: schoolId, schoolname: schoolName, school_full_name: schoolFullName || schoolName });
    setSchoolDataLoaded(true);
    setError(null);
  }, [schoolFullName, schoolId, schoolName]);

  // Fetch notifications only when schoolTownData is available
  useEffect(() => {
    const getNotifications = async () => {
      if (!schoolDataLoaded || !schoolTownData?.id) {
        // Don't try to fetch notifications until school data is loaded
        return;
      }
      const notificationCacheKey = `schooltasks:notifications:${userId}`;
      console.log('Notifications received:', schoolTownData?.id);

      try {
        console.log('Fetching notifications with params:', {
          schoolId: schoolTownData.id,
        });

        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('school_id', schoolTownData.id)
          .eq('class_level', classLevel)
          .eq('subclass', subclass)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const { data: readRows, error: readsError } = await supabase
          .from('notification_reads')
          .select('notification_id')
          .eq('user_id', userId);
        if (readsError) throw readsError;
        const readIds = new Set((readRows || []).map((row) => row.notification_id));
        const loadedNotifications = (data || []).map((notification) => ({
            ...notification,
            read: readIds.has(notification.id),
          }));
        setNotifications(loadedNotifications);
        window.localStorage.setItem(
          notificationCacheKey,
          JSON.stringify(loadedNotifications)
        );
        markAppSynced();
        setError(null);
      } catch (err: unknown) {
        const cachedNotifications = window.localStorage.getItem(notificationCacheKey);
        if (!navigator.onLine && cachedNotifications) {
          setNotifications(JSON.parse(cachedNotifications) as Notification[]);
          setError(null);
        } else {
          setError(err instanceof Error ? err.message : 'تعذر تحميل الإشعارات.');
          console.error('Error fetching notifications:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    getNotifications();
    // We're now explicitly dependent on schoolDataLoaded to prevent premature fetching
  }, [classLevel, schoolDataLoaded, schoolTownData?.id, subclass, userId]);

  useEffect(() => {
    if (!schoolTownData?.id) return;
    const notificationChannel = supabase
      .channel(`student-notifications-${schoolTownData.id}-${classLevel}-${subclass}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `school_id=eq.${schoolTownData.id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setNotifications((current) =>
              current.filter((item) => item.id !== payload.old.id)
            );
            return;
          }

          const incoming = payload.new as Notification;
          if (
            String(incoming.class_level) !== String(classLevel) ||
            incoming.subclass?.toUpperCase() !== subclass?.toUpperCase()
          ) {
            return;
          }

          setNotifications((current) => {
            const existing = current.find((item) => item.id === incoming.id);
            const nextNotification = {
              ...incoming,
              read: existing?.read || false,
            };
            return existing
              ? current.map((item) =>
                  item.id === incoming.id ? nextNotification : item
                )
              : [nextNotification, ...current];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
    };
  }, [classLevel, schoolTownData?.id, subclass]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      if (!userId) return;
      const { error } = await supabase
        .from('notification_reads')
        .upsert(
          { notification_id: notificationId, user_id: userId },
          { onConflict: 'notification_id,user_id' }
        );

      if (error) throw error;

      setNotifications((prevNotifications) =>
        prevNotifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error: unknown) {
      console.error('Error marking notification as read:', error);
      setError(error instanceof Error ? error.message : 'تعذر حفظ حالة القراءة.');
    }
  };

  const handleHomeNavigation = () => {
    if (classLevel && subclass) {
      navigate('/schools', {
        state: {
          schoolName,
          email,
          classLevel,
          subclass,
        },
      });
    } else {
      // Fall back to login if we don't have the class data
      navigate('/login');
    }
  };

  if (!schoolName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F7]">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            بيانات مطلوبة مفقودة
          </h2>
          <p className="text-gray-600">
            يرجى العودة إلى الصفحة الرئيسية والمحاولة مرة أخرى.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            العودة إلى تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F7]">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">خطأ</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={handleHomeNavigation}
            className="mt-4 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            العودة إلى الرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#FAF7F7]">
      {/* Sidebar */}
      <aside className="w-20 bg-white flex flex-col items-center py-8 space-y-8">
        <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
          <MessageSquare className="text-white" />
        </div>
        <nav className="flex flex-col items-center space-y-6 flex-1">
          <button
            onClick={handleHomeNavigation}
            className="p-3 text-gray-400 hover:bg-gray-100 rounded-xl"
          >
            <Home size={24} />
          </button>
          <button className="p-3 text-gray-400 hover:bg-gray-100 rounded-xl">
            <Calendar size={24} />
          </button>
          <button className="p-3 text-gray-400 hover:bg-gray-100 rounded-xl">
            <Book size={24} />
          </button>
          <button className="p-3 text-black bg-gray-100 rounded-xl">
            <Bell size={24} />
          </button>
        </nav>
        <div className="mt-auto">
          {user && (
            <button
              onClick={handleSignOut}
              className="p-3 text-gray-400 hover:text-black hover:bg-red-100 rounded-xl"
            >
              <LogOut size={24} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <header className="mb-10 border-b border-gray-200 pb-8">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-500">
            <Bell size={18} />
            <span>الإشعارات</span>
          </div>
          <h1 className="text-3xl font-bold md:text-4xl">
            {schoolTownData?.school_full_name || schoolName}
          </h1>
          {(classLevel || subclass) && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700">
              {classLevel && <span>الصف {classLevel}</span>}
              {classLevel && subclass && <span className="text-gray-300">·</span>}
              {subclass && <span>الشعبة {subclass.toUpperCase()}</span>}
            </div>
          )}
        </header>

        {/* Notifications Grid */}
        <section>
          <div className="mb-6 flex items-center gap-3">
            <h2 className="text-xl font-semibold">الرسائل</h2>
            <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-black px-2 text-sm font-bold text-white">{notifications.length}</span>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow ${
                    !notification.read ? 'border-r-4 border-blue-500' : ''
                  }`}
                  onClick={() =>
                    !notification.read && handleMarkAsRead(notification.id)
                  }
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={
                        notification.teacher_avatar_url ||
                        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
                      }
                      alt={notification.teacher_full_name}
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{notification.title}</h3>
                      <p className="text-gray-600 mt-2">
                        {notification.message}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                        <User size={16} />
                        <span>{notification.teacher_full_name}</span>
                        <span className="text-gray-300">·</span>
                        <Clock size={16} />
                        <span>
                          {format(new Date(notification.created_at), 'dd MMMM yyyy، HH:mm', { locale: arSA })}
                        </span>
                        {!notification.read && (
                          <span className="ml-auto text-blue-500 text-sm">
                            جديد
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {notifications.length === 0 && !loading && (
                <div className="text-center py-12 bg-white rounded-lg">
                  <Bell size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">لا توجد إشعارات بعد</p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Right Sidebar */}
      <aside className="w-80 bg-white p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
              alt="Profile"
              className="w-12 h-12 rounded-full"
            />
            <div>
              <h3 className="font-semibold">{user ? email : 'Guest'}</h3>
              <p className="text-sm text-gray-500">طالب</p>
            </div>
          </div>
        </div>

        {user && (
          <>
            {/* Statistics */}
            <div className="mb-8">
              <h3 className="font-semibold mb-4">الإحصائيات</h3>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">إجمالي الرسائل</span>
                    <span className="font-semibold">
                      {notifications.length}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">الرسائل غير المقروءة</span>
                    <span className="font-semibold">
                      {notifications.filter((n) => !n.read).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="font-semibold mb-4">النشاط الأخير</h3>
              <div className="space-y-4">
                {notifications.slice(0, 3).map((notification) => (
                  <div
                    key={notification.id}
                    className={`bg-gray-50 rounded-xl p-4 ${
                      !notification.read ? 'border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <h4 className="font-semibold text-sm">
                      {notification.title}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {format(
                        new Date(notification.created_at),
                        'MMM dd, HH:mm'
                      )}
                    </p>
                  </div>
                ))}

                {notifications.length === 0 && !loading && (
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-500">لا يوجد نشاط حديث</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

export default Notifications;
