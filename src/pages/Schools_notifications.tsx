import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bell,
  Settings,
  Home,
  Calendar,
  Book,
  Grid,
  LogOut,
  Map,
  MessageSquare,
  Clock,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase, signOut } from '../lib/supabase';

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
  const location = useLocation();
  const { schoolName, email, classLevel, subclass } = location.state || {};

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [schoolTownData, setSchoolTownData] = useState<SchoolTownData | null>(
    null
  );
  const [user, setUser] = useState<any>(null);
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

  // Fetch SchoolTown Data - only runs once when component mounts
  useEffect(() => {
    const getSchoolData = async () => {
      if (!schoolName) {
        setError('No school name provided');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching school data for:', schoolName);
        const { data, error } = await supabase
          .from('schooltowns')
          .select('*')
          .ilike('schoolname', schoolName)
          .single();

        if (error) throw error;

        console.log('School data received:', data);
        setSchoolTownData(data);
        setSchoolDataLoaded(true);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching school data:', err);
      } finally {
        // We don't set loading to false here, as we still need to fetch notifications
      }
    };

    getSchoolData();
    // Removed schoolName from dependencies to prevent loops
    // This effect should only run once on component mount
  }, []);

  // Fetch notifications only when schoolTownData is available
  useEffect(() => {
    const getNotifications = async () => {
      if (!schoolDataLoaded || !schoolTownData?.id) {
        // Don't try to fetch notifications until school data is loaded
        return;
      }
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

        console.log('Notifications received:', data);
        setNotifications(data || []);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    getNotifications();
    // We're now explicitly dependent on schoolDataLoaded to prevent premature fetching
  }, [schoolDataLoaded, schoolTownData?.id]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prevNotifications) =>
        prevNotifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      setError(error.message);
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
            Missing Required Data
          </h2>
          <p className="text-gray-600">
            Please return to the home page and try again.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F7]">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={handleHomeNavigation}
            className="mt-4 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            Return Home
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
        <header className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold">
            <Map className="inline-block mr-2" />
            Notifications - {schoolTownData?.school_full_name || schoolName}
            <span className="ml-4 text-lg text-gray-600">
            Login Email: {email} Class {classLevel}
              {subclass?.toUpperCase()}
            </span>
          </h1>
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full hover:bg-gray-100">
              <Settings size={24} />
            </button>
          </div>
        </header>

        {/* Notifications Grid */}
        <section>
          <h2 className="text-xl font-semibold mb-6">
            Messages{' '}
            {notifications.length > 0 ? `(${notifications.length})` : ''}
          </h2>

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
                    !notification.read ? 'border-l-4 border-blue-500' : ''
                  }`}
                  onClick={() =>
                    !notification.read && handleMarkAsRead(notification.id)
                  }
                >
                  <div className="flex items-start space-x-4">
                    <img
                      src={
                        notification.teacher_avatar_url ||
                        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
                      }
                      alt={notification.teacher_full_name}
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">
                          {notification.title}
                        </h3>
                        <span className="text-sm text-gray-500">
                          {format(
                            new Date(notification.created_at),
                            'MMM dd, yyyy HH:mm'
                          )}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center mt-4 text-sm text-gray-500">
                        <User size={16} className="mr-1" />
                        <span>{notification.teacher_full_name}</span>
                        <Clock size={16} className="ml-4 mr-1" />
                        <span>
                          {format(new Date(notification.created_at), 'HH:mm')}
                        </span>
                        {!notification.read && (
                          <span className="ml-auto text-blue-500 text-sm">
                            New
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
                  <p className="text-gray-600">No notifications yet</p>
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
              <p className="text-sm text-gray-500">Student</p>
            </div>
          </div>
        </div>

        {user && (
          <>
            {/* Statistics */}
            <div className="mb-8">
              <h3 className="font-semibold mb-4">Statistics</h3>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Messages</span>
                    <span className="font-semibold">
                      {notifications.length}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Unread Messages</span>
                    <span className="font-semibold">
                      {notifications.filter((n) => !n.read).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="font-semibold mb-4">Recent Activity</h3>
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
                    <p className="text-sm text-gray-500">No recent activity</p>
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
