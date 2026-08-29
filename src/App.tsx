import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Bell,
  Home,
  Calendar,
  Book,
  Grid,
  Box,
  Video,
  Plus,
  LogIn,
  LogOut,
  UserPlus,
  Atom,
  Beaker,
  Languages,
  School,
  Square,
  BookCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase, signIn, signUp, signOut } from './lib/supabase';
import { Pencil, Trash2, Info } from 'lucide-react';
import { useAppIdentity } from './layout/AppLayout';

interface Teacher {
  id: string;
  full_name: string;
  avatar_url: string;
}

interface Assignment {
  id: string;
  title: string;
  subject: string;
  deadline: string;
  teacher_full_name: string;
  teacher_url_avatar: string;
  student_count: number;
  class_level: string;
  subclass: string;
  note: string;
  school: string;
  teacher_id: string;
}
interface SchoolTownData {
  id: string;
  schoolname: string;
  address: string;
  website: string;
  school_full_name: string;
}
function App() {
  const navigate = useNavigate();
  const { schoolName, classLevel, subclass, email } = useAppIdentity();
  const emailPrefix_class_level = classLevel;
  const emailPrefix_subclass = subclass;
  const [schoolTownData, setSchoolTownData] = useState<SchoolTownData | null>(
    null
  );
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedClass, setSelectedClass] = useState<number | null>(null); // State for selected class level
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [teacherData, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(
    null
  );

  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);

  const [getInfoSelectedAssignment, setGetInfoSelectedAssignment] =
    useState<Assignment | null>(null);

  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    fullName: '',
  });

  // Initialize state with a function that will be called when the component mounts
  // This is cleaner but still has the same timing issue
  const [newAssignment, setNewAssignment] = useState(() => ({
    title: '',
    subject: 'Mathematics',
    class_level: 1,
    subclass: 'A',
    deadline: format(new Date(), 'yyyy-MM-dd'),
    note: '',
    school: schoolTownData?.id,
    teacher_id: user?.id,
    teacher_full_name: 'Teacher', // Still default value initially
    teacher_url_avatar: 'blank', // Still default value initially
  }));

  // Still need the useEffect to update once data is available
  useEffect(() => {
    if (teacherData) {
      setNewAssignment((prev) => ({
        ...prev,
        teacher_full_name: teacherData.full_name || 'Teacher',
        teacher_url_avatar: teacherData.avatar_url || 'blank',
      }));
    }
  }, [teacherData]);
  useEffect(() => {
    if (schoolTownData?.id) {
      setNewAssignment((prev) => ({
        ...prev,
        school: schoolTownData.id,
      }));
    }
  }, [schoolTownData?.id]);

  const subjectColors: { [key: string]: string } = {
    Mathematics: 'bg-blue-100',
    German: 'bg-orange-100',
    English: 'bg-green-100',
    Physic: 'bg-purple-100',
    Chemie: 'bg-yellow-100',
    Tests: 'bg-red-200',
  };
  const subjectLabels: Record<string, string> = {
    Mathematics: 'الرياضيات',
    German: 'اللغة الألمانية',
    English: 'اللغة الإنجليزية',
    Physic: 'العلوم',
    Chemie: 'الكيمياء',
    Tests: 'الاختبارات',
  };

  useEffect(() => {
    // Check current auth status
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Inside your component function

  useEffect(() => {
    let isMounted = true;

    const fetchTeacherData = async () => {
      try {
        setLoading(true);

        // Get current user
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;

        if (!authData.user) {
          throw new Error('Not authenticated');
        }

        // Fetch teacher data
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .select('*')
          .eq('id', authData.user.id)
          .single();
        if (teacherError) throw teacherError;
        if (!teacherData) throw new Error('Teacher profile not found');

        // Update state if component is still mounted
        if (isMounted) {
          setTeacher(teacherData);
          setError(null);
        }
      } catch (err: unknown) {
        console.error('Error fetching teacher data:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setTeacher(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTeacherData();

    // Set up auth state listener for changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchTeacherData();
      } else if (event === 'SIGNED_OUT') {
        setTeacher(null);
      }
    });

    // Cleanup function
    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Then in your render code, you can use:
  // if (loading) return <LoadingComponent />;
  // if (error) return <ErrorComponent error={error} />;
  // return <YourComponent teacher={teacher} />;

  // Fetch SchoolTown Data
  const fetchSchoolTownData = async () => {
    // Make sure schoolName is available and not empty
    if (!schoolName) {
      console.log('No school name provided');
      return;
    }

    try {
      console.log('Fetching data for school:', schoolName);

      const { data, error } = await supabase
        .from('schooltowns')
        .select('*')
        .ilike('schoolname', schoolName);

      console.log('Data:', data);

      if (data && data.length > 0) {
        setSchoolTownData(data[0] as SchoolTownData);
      } else {
        setSchoolTownData(null);
      }
    } catch (error) {
    } finally {
    }
  };

  // Effect hook to trigger the fetch
  useEffect(() => {
    if (schoolName) {
      fetchSchoolTownData();
    }
  }, [schoolName]); // Only re-run when schoolName changes

  useEffect(() => {
    if (user) {
      fetchAssignments();
    }
  }, [selectedCategory, selectedClass, user]); // Add selectedClass to dependencies

  // Fetch assignments from the database
  const fetchAssignments = async () => {
    if (!schoolTownData?.id) return; // Don't fetch if school ID is missing

    const { data, error } = await supabase
      .from('assignments')
      .select(
        `
        *,
        teacher:teachers(id, full_name, avatar_url)
      `
      )
      .eq('school', schoolTownData.id);

    if (error) {
      console.error('Error fetching assignments:', error);
      return;
    }

    const formattedData =
      data?.map((item) => ({
        ...item,
        class_level: Number(item.class_level),
      })) || [];

    setAssignments(formattedData);
  };

  // Fetch assignments when `schoolTownData.id` changes
  useEffect(() => {
    if (schoolTownData?.id) {
      fetchAssignments();
    }
  }, [schoolTownData?.id]); // Runs only when school ID is set

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    try {
      if (isSignUp) {
        const { error } = await signUp(
          authForm.email,
          authForm.password,
          authForm.fullName
        );
        if (error) throw error;
      } else {
        const { error } = await signIn(authForm.email, authForm.password);
        if (error) throw error;
      }
      setShowAuthForm(false);
      setAuthForm({ email: '', password: '', fullName: '' });
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setShowAuthForm(true);
      return;
    }

    try {
      if (!schoolTownData?.id) {
        throw new Error('لم يتم العثور على المدرسة المرتبطة بحساب المدير.');
      }

      const assignmentPayload = {
        title: newAssignment.title.trim(),
        subject: newAssignment.subject,
        class_level: Number(newAssignment.class_level),
        subclass: newAssignment.subclass.trim().toUpperCase(),
        deadline: newAssignment.deadline,
        note: newAssignment.note.trim(),
        school: schoolTownData.id,
        teacher_id: user.id,
        teacher_full_name: teacherData?.full_name || 'مدير المدرسة',
        teacher_url_avatar: teacherData?.avatar_url || '',
      };

      if (!assignmentPayload.title) {
        throw new Error('يرجى إدخال عنوان المهمة.');
      }

      if (editingAssignment) {
        // Update existing assignment
        const { error } = await supabase
          .from('assignments')
          .update(assignmentPayload)
          .eq('id', editingAssignment.id);

        if (error) throw error;
      } else {
        // Create new assignment
        const { error } = await supabase
          .from('assignments')
          .insert([assignmentPayload]);

        if (error) throw error;
      }

      setShowAddForm(false);
      setEditingAssignment(null);
      setNewAssignment({
        title: '',
        subject: 'Mathematics',
        class_level: 1,
        subclass: 'A',
        deadline: format(new Date(), 'yyyy-MM-dd'),
        note: '',
        school: schoolTownData?.id,
        teacher_id: user?.id,
        teacher_full_name: teacherData?.full_name || 'Annalina',
        teacher_url_avatar: teacherData?.avatar_url || '',
      });
      fetchAssignments();
    } catch (error: any) {
      console.error('Error saving assignment:', error);
      alert(
        `تعذر حفظ المهمة: ${
          error instanceof Error ? error.message : 'خطأ غير معروف'
        }`
      );
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!user) {
      alert('You must be logged in to delete an assignment.');
      return;
    }

    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      console.error('Error deleting assignment:', error);
      alert('Failed to delete assignment');
      return;
    }

    // Update the state to remove the deleted assignment
    setAssignments((prevAssignments) =>
      prevAssignments.filter((assignment) => assignment.id !== assignmentId)
    );
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setNewAssignment({
      title: assignment.title,
      subject: assignment.subject,
      class_level: assignment.class_level,
      subclass: assignment.subclass,
      deadline: format(new Date(assignment.deadline), 'yyyy-MM-dd'),
      note: assignment.note,
      school: schoolTownData?.id,
      teacher_id: user?.id,
      teacher_full_name: teacherData?.full_name || 'Teacher',
      teacher_url_avatar: teacherData?.avatar_url || '',
    });
    setShowAddForm(true);
  };

  // Fixed filtering function that correctly checks class_level
  const filteredAssignments = assignments.filter((assignment) => {
    // Filter by category
    const matchesCategory =
      selectedCategory === 'All' || assignment.subject === selectedCategory;

    // Filter by class_level - ensure both are numbers for consistent comparison
    const matchesClass =
      selectedClass === null ||
      Number(assignment.class_level) === Number(selectedClass);

    return matchesCategory && matchesClass;
  });

  // Clear class filter function
  // Add these state variables to your component
  const [showAddNotificationForm, setShowAddNotificationForm] = useState(false);
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    class_level: '',
    subclass: '',
    teacher_id: user?.id,
    school_id: user?.school_id,
    teacher_full_name: '',
    teacher_avatar_url: '',
  });

  // Add this handler function to your component
  const handleNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Create a new notification using Supabase
      const { data, error } = await supabase
        .from('notifications')
        .insert([
          {
            title: newNotification.title,
            message: newNotification.message,
            teacher_id: user?.id,
            school_id: schoolTownData?.id,
            class_level: newNotification.class_level,
            subclass: newNotification.subclass,
            teacher_full_name: teacherData?.full_name || '',
            teacher_avatar_url: teacherData?.avatar_url || '',
          },
        ]);

      if (error) throw error;

      // Reset form
      setShowAddNotificationForm(false);
      setNewNotification({
        title: '',
        message: '',
        class_level: '',
        subclass: '',
        teacher_id: user?.id,
        school_id: schoolTownData?.id,
        teacher_full_name: '',
        teacher_avatar_url: '',
      });

      // Show success message
      alert('Notification created successfully!');
    } catch (error) {
      console.error('Error creating notification:', error);
      alert('Failed to create notification. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#FAF7F7]">
      {/* Sidebar */}
      <aside className="w-20 bg-white flex flex-col items-center py-8 space-y-8">
        <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
          <Book className="text-white" />
        </div>
        <nav className="flex flex-col items-center space-y-6 flex-1">
          <button className="p-3 text-gray-400 hover:bg-gray-100 rounded-xl">
            <Home size={24} />
          </button>
          <button
            onClick={() =>
              navigate('/Schedule', {
                state: {
                  schoolName,
                  email,
                  classLevel: emailPrefix_class_level,
                  subclass: emailPrefix_subclass,
                },
              })
            }
            className="p-3 text-gray-400 hover:bg-gray-100 rounded-xl"
          >
            <Calendar size={24} />
          </button>
          <button className="p-3 text-gray-400 hover:bg-gray-100 rounded-xl">
            <Book size={24} />
          </button>
          <button className="p-3 text-gray-400 hover:bg-gray-100 rounded-xl">
            <Grid size={24} />
          </button>
          <button
            onClick={() =>
              navigate('/notifications', {
                state: {
                  schoolName,
                  email,
                  classLevel: emailPrefix_class_level,
                  subclass: emailPrefix_subclass,
                },
              })
            }
            className="p-3 text-gray-400 hover:bg-gray-100 rounded-xl"
          >
            <Bell size={24} />
          </button>
        </nav>
        <div className="mt-auto">
          {user ? (
            <button
              onClick={handleSignOut}
              className="p-3 text-gray-400 hover:text-black hover:bg-red-100 rounded-xl"
            >
              <LogOut size={24} />
            </button>
          ) : (
            <button
              onClick={() => setShowAuthForm(true)}
              className="p-3 text-gray-400 hover:bg-gray-100 rounded-xl"
            >
              <LogIn size={24} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <header className="mb-10 flex flex-col gap-5 border-b border-gray-200 pb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-500">إدارة المدرسة</p>
            <h1 className="text-3xl font-bold">{schoolTownData?.school_full_name || 'مدرستي'}</h1>
            <p className="mt-2 text-sm text-gray-500">لوحة المهام والإشعارات</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {user && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-white hover:bg-gray-800"
              >
                <Plus size={20} />
                <span>إضافة مهمة</span>
              </button>
            )}
            {user && (
              <button
                onClick={() => setShowAddNotificationForm(true)}
                className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-black hover:bg-gray-50"
              >
                <Plus size={20} />
                <span>إضافة إشعار</span>
              </button>
            )}
          </div>
        </header>

        {/* Auth Form Modal */}
        {showAuthForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 w-[400px]">
              <h2 className="text-2xl font-bold mb-6">
                {isSignUp ? 'Create Account' : 'Sign In'}
              </h2>
              {authError && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
                  {authError}
                </div>
              )}
              <form onSubmit={handleAuth} className="space-y-4">
                {isSignUp && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={authForm.fullName}
                      onChange={(e) =>
                        setAuthForm({ ...authForm, fullName: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={authForm.email}
                    onChange={(e) =>
                      setAuthForm({ ...authForm, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={authForm.password}
                    onChange={(e) =>
                      setAuthForm({ ...authForm, password: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div className="flex justify-between items-center mt-6">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    {isSignUp ? 'Already have an account?' : 'Need an account?'}
                  </button>
                  <div className="space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowAuthForm(false)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-black text-white rounded-lg"
                    >
                      {isSignUp ? 'Sign Up' : 'Sign In'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Info Assignment Form Modal */}
        {selectedAssignment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 w-[900px] max-h-96 overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">
                {selectedAssignment.subject}, Class{' '}
                {selectedAssignment.class_level} {selectedAssignment.subclass},{' '}
                {selectedAssignment.title}.
              </h2>
              <p className="text-gray-700">{selectedAssignment.note}</p>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="px-4 py-2 bg-black text-white rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Assignment Form Modal */}
        {getInfoSelectedAssignment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-purple-200 rounded-2xl p-8 w-[900px] max-h-96 overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">
                {getInfoSelectedAssignment.subject}, Class{' '}
                {getInfoSelectedAssignment.class_level}{' '}
                {getInfoSelectedAssignment.subclass},{' '}
                {getInfoSelectedAssignment.title}.
              </h2>
              <p className="text-gray-700">
                Tasks: {getInfoSelectedAssignment.title}
              </p>
              <p className="text-gray-700">
                Topic: {getInfoSelectedAssignment.subject}
              </p>
              <p className="text-gray-700">
                {' '}
                Class:{getInfoSelectedAssignment.class_level}
                {getInfoSelectedAssignment.subclass}
              </p>
              <p className="text-gray-700">
                {' '}
                School: {schoolTownData?.school_full_name}
              </p>
              <p className="text-gray-700">
                {' '}
                Teachers: {getInfoSelectedAssignment.teacher_full_name}
              </p>
              <p className="text-gray-700">
                {' '}
                Deadline: {getInfoSelectedAssignment.deadline}
              </p>
              <p className="text-gray-700">
                {' '}
                Teacher ID: {getInfoSelectedAssignment.teacher_id}
              </p>
              <p className="text-gray-700">
                {' '}
                Task ID: {getInfoSelectedAssignment.id}
              </p>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setGetInfoSelectedAssignment(null)}
                  className="px-4 py-2 bg-black text-white rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Assignment Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 w-[500px]">
              <h2 className="text-2xl font-bold mb-6">
                {editingAssignment ? 'Edit Assignment' : 'Add New Assignment'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newAssignment.title}
                    onChange={(e) =>
                      setNewAssignment({
                        ...newAssignment,
                        title: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <select
                    value={newAssignment.subject}
                    onChange={(e) =>
                      setNewAssignment({
                        ...newAssignment,
                        subject: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="Mathematics">الرياضيات</option>
                    <option value="German">اللغة الألمانية</option>
                    <option value="English">اللغة الإنجليزية</option>
                    <option value="Physic">العلوم</option>
                    <option value="Chemie">الكيمياء</option>
                    <option value="Tests">الاختبارات</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Class Level
                  </label>
                  <select
                    value={newAssignment.class_level}
                    onChange={(e) =>
                      setNewAssignment({
                        ...newAssignment,
                        class_level: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {[1, 2, 3, 4, 5, 6].map((level) => (
                      <option key={level} value={level}>
                        Class {level}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sub Class Level
                  </label>
                  <select
                    value={newAssignment.subclass}
                    onChange={(e) =>
                      setNewAssignment({
                        ...newAssignment,
                        subclass: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {['A', 'B', 'C'].map((level) => (
                      <option key={level} value={level}>
                        SUB Class {level}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={newAssignment.deadline}
                    onChange={(e) =>
                      setNewAssignment({
                        ...newAssignment,
                        deadline: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note
                  </label>
                  <input
                    type="text"
                    value={newAssignment.note}
                    onChange={(e) =>
                      setNewAssignment({
                        ...newAssignment,
                        note: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingAssignment(null);
                      setNewAssignment((prev) => ({
                        ...prev,
                        title: '',
                        subject: 'Mathematics',
                        class_level: 1,
                        subclass: '',
                        deadline: format(new Date(), 'yyyy-MM-dd'),
                        note: '',
                        teacher_id: user?.id,
                      }));
                    }}
                    
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-black text-white rounded-lg"
                  >
                    {editingAssignment ? 'Update Assignment' : 'Create Assignment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Add Notification Form Modal */}
        {showAddNotificationForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 w-[500px]">
              <h2 className="text-2xl font-bold mb-6">إضافة إشعار جديد</h2>
              <form onSubmit={handleNotificationSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newNotification.title}
                    onChange={(e) =>
                      setNewNotification({
                        ...newNotification,
                        title: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    value={newNotification.message}
                    onChange={(e) =>
                      setNewNotification({
                        ...newNotification,
                        message: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    rows="4"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Class Level
                  </label>
                  <select
                    value={newNotification.class_level}
                    onChange={(e) =>
                      setNewNotification({
                        ...newNotification,
                        class_level: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="">اختر الصف</option>
                    {[1, 2, 3, 4, 5, 6].map((level) => (
                      <option key={level} value={level}>
                        Class {level}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sub Class Level
                  </label>
                  <select
                    value={newNotification.subclass}
                    onChange={(e) =>
                      setNewNotification({
                        ...newNotification,
                        subclass: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="">اختر الشعبة</option>
                    {['A', 'B', 'C'].map((level) => (
                      <option key={level} value={level}>
                        SUB Class {level}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddNotificationForm(false);
                      setNewNotification({
                        title: '',
                        message: '',
                        class_level: '',
                        subclass: '',
                        teacher_id: user?.id,
                        school_id: user?.school_id,
                        teacher_full_name: '',
                        teacher_avatar_url: '',
                      });
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-black text-white rounded-lg"
                  >
                    Send Notification
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Simple filters */}
        <div className="mb-8 flex flex-wrap items-end gap-4 rounded-2xl border border-gray-200 bg-white p-4">
          <label className="min-w-48 text-sm font-medium text-gray-600">
            الصف
            <select
              value={selectedClass ?? ''}
              onChange={(event) => setSelectedClass(event.target.value ? Number(event.target.value) : null)}
              className="mt-2 block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-black outline-none focus:border-black"
            >
              <option value="">كل الصفوف</option>
              {[1, 2, 3, 4, 5, 6].map((level) => <option key={level} value={level}>الصف {level}</option>)}
            </select>
          </label>
          <label className="min-w-56 text-sm font-medium text-gray-600">
            المادة
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="mt-2 block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-black outline-none focus:border-black"
            >
              <option value="All">كل المواد</option>
              <option value="Tests">الاختبارات</option>
              <option value="Mathematics">الرياضيات</option>
              <option value="German">اللغة الألمانية</option>
              <option value="English">اللغة الإنجليزية</option>
              <option value="Physic">العلوم</option>
              <option value="Chemie">الكيمياء</option>
            </select>
          </label>
          {(selectedClass !== null || selectedCategory !== 'All') && (
            <button
              type="button"
              onClick={() => { setSelectedClass(null); setSelectedCategory('All'); }}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              مسح التصفية
            </button>
          )}
        </div>

        {/* Assignments Grid */}
        <section>
          <h2 className="text-xl font-semibold mb-6">
            المهام{' '}
            {filteredAssignments.length > 0
              ? `(${filteredAssignments.length})`
              : ''}
          </h2>
          {user ? (
            filteredAssignments.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {filteredAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className={`rounded-3xl p-6 hover:shadow-lg transition-shadow ${
                      subjectColors[assignment.subject] || 'bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-4">
                      <span
                        className={`p-2 rounded-xl ${
                          subjectColors[assignment.subject]
                        }`}
                      >
                        {assignment.subject === 'Mathematics' && (
                          <Box size={20} />
                        )}
                        {assignment.subject === 'German' && <Book size={20} />}
                        {assignment.subject === 'English' && (
                          <Languages size={20} />
                        )}
                        {assignment.subject === 'Physic' && <Atom size={20} />}
                        {assignment.subject === 'Chemie' && (
                          <Beaker size={20} />
                        )}
                        {assignment.subject === 'Tests' && (
                          <BookCheck size={20} />
                        )}
                      </span>
                      <span className="rounded-full bg-white/80 px-3 py-1 text-sm">
                        {subjectLabels[assignment.subject] || assignment.subject} · الصف {assignment.class_level}{assignment.subclass}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold mb-4">
                      {assignment.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        التسليم:{' '}
                        {format(new Date(assignment.deadline), 'MMM dd, yyyy')}
                        <span className="flex text-sm text-gray-600">
                          <User size={16} className="flex mr-1" /> المعلم:{' '}
                          {assignment?.teacher_full_name}
                        </span>
                      </span>

                      <div className="flex items-center space-x-2">
                        {assignment.teacher_full_name && (
                          <img
                            src={
                              assignment?.teacher_url_avatar ||
                              'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
                            }
                            alt={
                              selectedAssignment?.teacher_full_name || 'Teacher'
                            }
                            className="w-8 h-8 rounded-full border-2 border-white"
                          />
                        )}
                      </div>
                    </div>
                    {/* Edit and Delete Buttons */}
                    <div className="flex justify-end space-x-2 mt-4">
                      {assignment.teacher_id === user.id && (
                        <>
                          <button
                            onClick={() => handleEditAssignment(assignment)}
                            className="px-3 py-1 bg-green-300 text-white rounded-lg hover:bg-green-600"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteAssignment(assignment.id)
                            }
                            className="px-3 py-1 bg-red-300 text-white rounded-lg hover:bg-red-600"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setSelectedAssignment(assignment)}
                        className="px-3 py-1 bg-blue-300 text-white rounded-lg hover:bg-blue-600"
                      >
                        <Info className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setGetInfoSelectedAssignment(assignment)}
                        className="px-3 py-1 bg-purple-300 text-white rounded-lg hover:bg-purple-600"
                      >
                        <Square className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-600 mb-4">
                  No assignments found matching your filters
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('All');
                    setSelectedClass(null);
                  }}
                  className="px-4 py-2 bg-black text-white rounded-lg"
                >
                  Clear Filters
                </button>
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">
                Please sign in to view assignments
              </p>
              <button
                onClick={() => setShowAuthForm(true)}
                className="px-6 py-3 bg-black text-white rounded-full inline-flex items-center space-x-2"
              >
                <LogIn size={20} />
                <span>تسجيل الدخول</span>
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Right Sidebar */}
      <aside className="w-80 bg-white p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <img
              src={teacherData?.avatar_url}
              alt="Profile"
              className="w-12 h-12 rounded-full"
            />
            <div>
              <h3 className="font-semibold">
                {user ? user.email || 'Teacher' : 'Guest'}
              </h3>
              <p className="text-sm text-gray-500">
                {teacherData ? 'Teacher' : 'Please sign in'}
              </p>
            </div>
          </div>
        </div>

        {user && (
          <>
            {/* Activity Chart */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">النشاط</h3>
                <select className="text-sm bg-transparent">
                  <option>السنة</option>
                  <option>الشهر</option>
                  <option>الأسبوع</option>
                </select>
              </div>
              <div className="h-40 bg-gray-50 rounded-xl"></div>
            </div>

            {/* Recent Assignments */}
            <div>
              <h3 className="font-semibold mb-4">أحدث المهام</h3>
              <div className="space-y-4">
                {assignments.slice(0, 5).map((assignment) => (
                  <div
                    key={assignment.id}
                    className="bg-gray-50 rounded-xl p-4"
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="p-2 bg-white rounded-xl">
                        {assignment.subject === 'Mathematics' && (
                          <Box size={20} />
                        )}
                        {assignment.subject === 'German' && <Book size={20} />}
                        {assignment.subject === 'English' && (
                          <Languages size={20} />
                        )}
                        {assignment.subject === 'Physic' && <Atom size={20} />}
                        {assignment.subject === 'Chemie' && (
                          <Beaker size={20} />
                        )}
                        {assignment.subject === 'Tests' && (
                          <BookCheck size={20} />
                        )}
                      </span>
                      <span className="text-sm">{assignment.subject}</span>
                      <span className="ml-auto">
                        Class {assignment.class_level}
                      </span>
                    </div>
                    <h4 className="font-semibold">{assignment.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Due:{' '}
                      {format(new Date(assignment.deadline), 'MMM dd, yyyy')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

export default App;
