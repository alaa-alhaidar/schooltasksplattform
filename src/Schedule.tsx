import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Home,
  Calendar,
  Book,
  LogOut,
  Map,
  MessageSquare,
  Clock,
  User,
  Grid,
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase, signOut } from './lib/supabase';
import { useAppIdentity } from './layout/AppLayout';

interface ScheduleItem {
  id: string;
  day: string;
  start_time: string;
  end_time: string;
  subject: string;
  teacher: string;
  room: string;
  color: string;
}

interface SchoolTownData {
  id: string;
  schoolname: string;
  school_full_name: string;
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const timeSlots = ['8:00 - 10:00', '10:00 - 12:00', '12:00 - 14:00'];
const dayLabels: Record<string, string> = {
  Monday: 'الاثنين', Tuesday: 'الثلاثاء', Wednesday: 'الأربعاء',
  Thursday: 'الخميس', Friday: 'الجمعة',
};
const scheduleLabels: Record<string, string> = {
  Mathematics: 'الرياضيات', Science: 'العلوم', History: 'التاريخ',
  'Language Arts': 'اللغة', 'Physical Education': 'الرياضة', Art: 'الفنون',
  Music: 'الموسيقى', 'Computer Science': 'الحاسوب',
  'Social Studies': 'الدراسات الاجتماعية', 'Club Activities': 'الأنشطة',
};

// Sample data - in production this would come from the database
const sampleSchedule: ScheduleItem[] = [
  {
    id: '1',
    day: 'Monday',
    start_time: '8:00',
    end_time: '10:00',
    subject: 'Mathematics',
    teacher: 'Mrs. Johnson',
    room: 'Room 101',
    color: 'bg-blue-100 border-blue-400',
  },
  {
    id: '2',
    day: 'Monday',
    start_time: '10:00',
    end_time: '12:00',
    subject: 'Science',
    teacher: 'Mr. Smith',
    room: 'Lab 3',
    color: 'bg-green-100 border-green-400',
  },
  {
    id: '3',
    day: 'Monday',
    start_time: '12:00',
    end_time: '14:00',
    subject: 'History',
    teacher: 'Dr. Williams',
    room: 'Room 205',
    color: 'bg-yellow-100 border-yellow-400',
  },
  {
    id: '4',
    day: 'Tuesday',
    start_time: '8:00',
    end_time: '10:00',
    subject: 'Language Arts',
    teacher: 'Ms. Davis',
    room: 'Room 103',
    color: 'bg-purple-100 border-purple-400',
  },
  {
    id: '5',
    day: 'Tuesday',
    start_time: '10:00',
    end_time: '12:00',
    subject: 'Physical Education',
    teacher: 'Coach Brown',
    room: 'Gymnasium',
    color: 'bg-red-100 border-red-400',
  },
  {
    id: '6',
    day: 'Tuesday',
    start_time: '12:00',
    end_time: '14:00',
    subject: 'Art',
    teacher: 'Mrs. Wilson',
    room: 'Art Studio',
    color: 'bg-pink-100 border-pink-400',
  },
  {
    id: '7',
    day: 'Wednesday',
    start_time: '8:00',
    end_time: '10:00',
    subject: 'Mathematics',
    teacher: 'Mrs. Johnson',
    room: 'Room 101',
    color: 'bg-blue-100 border-blue-400',
  },
  {
    id: '8',
    day: 'Wednesday',
    start_time: '10:00',
    end_time: '12:00',
    subject: 'Music',
    teacher: 'Mr. Taylor',
    room: 'Music Room',
    color: 'bg-indigo-100 border-indigo-400',
  },
  {
    id: '9',
    day: 'Wednesday',
    start_time: '12:00',
    end_time: '14:00',
    subject: 'Computer Science',
    teacher: 'Ms. Garcia',
    room: 'Computer Lab',
    color: 'bg-teal-100 border-teal-400',
  },
  {
    id: '10',
    day: 'Thursday',
    start_time: '8:00',
    end_time: '10:00',
    subject: 'Science',
    teacher: 'Mr. Smith',
    room: 'Lab 3',
    color: 'bg-green-100 border-green-400',
  },
  {
    id: '11',
    day: 'Thursday',
    start_time: '10:00',
    end_time: '12:00',
    subject: 'Social Studies',
    teacher: 'Mrs. Martinez',
    room: 'Room 202',
    color: 'bg-orange-100 border-orange-400',
  },
  {
    id: '12',
    day: 'Thursday',
    start_time: '12:00',
    end_time: '14:00',
    subject: 'Language Arts',
    teacher: 'Ms. Davis',
    room: 'Room 103',
    color: 'bg-purple-100 border-purple-400',
  },
  {
    id: '13',
    day: 'Friday',
    start_time: '8:00',
    end_time: '10:00',
    subject: 'Mathematics',
    teacher: 'Mrs. Johnson',
    room: 'Room 101',
    color: 'bg-blue-100 border-blue-400',
  },
  {
    id: '14',
    day: 'Friday',
    start_time: '10:00',
    end_time: '12:00',
    subject: 'Science',
    teacher: 'Mr. Smith',
    room: 'Lab 3',
    color: 'bg-green-100 border-green-400',
  },
  {
    id: '15',
    day: 'Friday',
    start_time: '12:00',
    end_time: '14:00',
    subject: 'Club Activities',
    teacher: 'Various Teachers',
    room: 'Various Rooms',
    color: 'bg-gray-100 border-gray-400',
  },
];

function WeeklySchedule() {
  const navigate = useNavigate();
  const { schoolName, schoolFullName, schoolId, email, classLevel, subclass } = useAppIdentity();

  const [schedule, setSchedule] = useState<ScheduleItem[]>(sampleSchedule);
  const [schoolTownData, setSchoolTownData] = useState<SchoolTownData | null>(
    null
  );
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    setSchoolTownData({
      id: schoolId,
      schoolname: schoolName,
      school_full_name: schoolFullName || schoolName,
    });
    setError(null);
    setLoading(false);
  }, [schoolFullName, schoolId, schoolName]);

  // In a real app, we would fetch the schedule from the database
  useEffect(() => {
    // This is a placeholder for the actual API call
    // In production, you would fetch the schedule from Supabase
    setLoading(false);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleHomeNavigation = () => {
    if (schoolName && email) {
      navigate('/dashboard', {
        state: {
          schoolName,
          email,
        },
      });
    } else {
      navigate('/login');
    }
  };

  const handleNotificationsNavigation = () => {
    if (schoolName && email) {
      navigate('/notifications', {
        state: {
          schoolName,
          email,
          classLevel,
          subclass,
        },
      });
    } else {
      navigate('/login');
    }
  };

  // Helper function to get schedule items for a specific day and time slot
  const getScheduleItem = (day: string, timeSlot: string) => {
    const [startTime] = timeSlot.split(' - ');
    return schedule.find(
      (item) => item.day === day && item.start_time === startTime
    );
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
          <button className="p-3 text-black bg-gray-100 rounded-xl">
            <Calendar size={24} />
          </button>
          <button className="p-3 text-gray-400 hover:bg-gray-100 rounded-xl">
            <Book size={24} />
          </button>
          <button
            onClick={handleNotificationsNavigation}
            className="p-3 text-gray-400 hover:bg-gray-100 rounded-xl"
          >
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
            <Calendar size={18} />
            <span>الجدول الدراسي</span>
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

        {/* Weekly Schedule Grid */}
        <section>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">الحصص الأسبوعية</h2>
            <span className="text-sm font-normal text-gray-500">جميع الأوقات بنظام 24 ساعة</span>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Time headers */}
              <div className="grid grid-cols-6 border-b">
                <div className="p-4 font-semibold text-gray-500 border-r">
                  الوقت / اليوم
                </div>
                {daysOfWeek.map((day) => (
                  <div
                    key={day}
                    className="p-4 font-semibold text-center border-r last:border-r-0"
                  >
                    {dayLabels[day] || day}
                  </div>
                ))}
              </div>

              {/* Schedule grid */}
              {timeSlots.map((timeSlot) => (
                <div
                  key={timeSlot}
                  className="grid grid-cols-6 border-b last:border-b-0"
                >
                  <div className="p-4 font-medium text-gray-500 border-r flex items-center">
                    <Clock className="inline-block mr-2" size={16} />
                    {timeSlot}
                  </div>

                  {daysOfWeek.map((day) => {
                    const item = getScheduleItem(day, timeSlot);
                    return (
                      <div
                        key={`${day}-${timeSlot}`}
                        className="p-4 border-r last:border-r-0"
                      >
                        {item ? (
                          <div
                            className={`rounded-lg p-3 ${item.color} border-l-4 h-full`}
                          >
                            <h3 className="font-semibold">{scheduleLabels[item.subject] || item.subject}</h3>
                            <div className="mt-2 text-sm text-gray-600">
                              <div className="flex items-center">
                                <User size={14} className="mr-1" />
                                {item.teacher}
                              </div>
                              <div className="mt-1">
                                <span className="inline-block bg-white px-2 py-1 rounded-md text-xs">
                                  {item.room}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-400">
                            حصة فارغة
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Right Sidebar */}
      <aside className="w-80 bg-white p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <img
              src= "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
              alt="الملف الشخصي"
              className="w-12 h-12 rounded-full"
            />
            <div>
              <h3 className="font-semibold">{user ? email : 'زائر'}</h3>
              <p className="text-sm text-gray-500">طالب</p>
            </div>
          </div>
        </div>

        {user && (
          <>
            {/* Today's Schedule */}
            <div className="mb-8">
              <h3 className="font-semibold mb-4">جدول اليوم</h3>
              <div className="space-y-4">
                {schedule
                  .filter(
                    (item) =>
                      item.day ===
                      daysOfWeek[
                        new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
                      ]
                  )
                  .map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-lg p-4 ${item.color} border-l-4`}
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold">{scheduleLabels[item.subject] || item.subject}</h4>
                        <span className="text-xs bg-white px-2 py-1 rounded-md">
                          {item.start_time} - {item.end_time}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {item.teacher}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{item.room}</p>
                    </div>
                  ))}

                {schedule.filter(
                  (item) =>
                    item.day ===
                    daysOfWeek[
                      new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
                    ]
                ).length === 0 && (
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-500">لا توجد حصص اليوم</p>
                  </div>
                )}
              </div>
            </div>

            {/* Subject Summary */}
            <div>
              <h3 className="font-semibold mb-4">ملخص الأسبوع</h3>
              <div className="space-y-3">
                {Array.from(new Set(schedule.map((item) => item.subject))).map(
                  (subject) => {
                    const count = schedule.filter(
                      (item) => item.subject === subject
                    ).length;
                    return (
                      <div
                        key={subject}
                        className="bg-gray-50 rounded-xl p-3 flex justify-between items-center"
                      >
                        <span className="text-gray-700">{scheduleLabels[subject] || subject}</span>
                        <span className="text-sm font-medium bg-white px-2 py-1 rounded-full">
                          {count} {count === 1 ? 'حصة' : 'حصص'}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

export default WeeklySchedule;
