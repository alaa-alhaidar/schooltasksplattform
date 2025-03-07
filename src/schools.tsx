import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import {
  Bell,
  Settings,
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
  ChevronDown,
  Map,
  Languages,
  School,
  Square,
  BookCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase, signIn, signUp, signOut } from './lib/supabase';
import { Pencil, Trash2, X, Info } from 'lucide-react';

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
  teacher: string;
  student_count: number;
  class_level: string;
  subclass: string;
  note: string;
  school: string;
}
interface SchoolTownData {
  id: String;
  schoolname: string;
  address: string;
  website: string;
  school_full_name: string;
}
function App() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const location = useLocation();
  const { classLevel, subclass, email } = location.state || {};
  const schoolName = state?.schoolName;
  const emailPrefix_class_level = state?.classLevel;
  const emailPrefix_subclass = state?.subclass;
  const [schoolTownData, setSchoolTownData] = useState<SchoolTownData | null>(
    null
  );
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teachers, setTeachers] = useState<Teacher | null>(null);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    fullName: '',
  });

  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);

  const [getInfoSelectedAssignment, setGetInfoSelectedAssignment] =
    useState<Assignment | null>(null);

  const subjectColors: { [key: string]: string } = {
    Mathematics: 'bg-blue-100',
    German: 'bg-orange-100',
    English: 'bg-green-100',
    Physic: 'bg-purple-100',
    Chemie: 'bg-yellow-100',
    Tests: 'bg-red-200',
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchSchoolTownData = async () => {
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

  const fetchTeachers = async () => {
    if (!getInfoSelectedAssignment?.teacher) {
      console.log('No assignment ID provided');
      return;
    }

    try {
      console.log(
        'Fetching data for Teacher ID:',
        getInfoSelectedAssignment.teacher
      );

      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('id', getInfoSelectedAssignment?.teacher?.id);

      if (error) {
        console.error('Error fetching teachers:', error);
        return;
      }

      console.log('Teachers:', data[0]);

      if (data && data.length > 0) {
        setTeachers(data[0]);
      } else {
        setTeachers(data[0]);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  };

  useEffect(() => {
    if (schoolName) {
      fetchSchoolTownData();
    }
  }, [schoolName]);

  useEffect(() => {
    if (getInfoSelectedAssignment?.teacher) {
      fetchTeachers();
    }
  }, [getInfoSelectedAssignment?.teacher]);

  useEffect(() => {
    if (user) {
      fetchAssignments();
    }
  }, [selectedCategory, selectedClass, user]);

  const fetchAssignments = async () => {
    if (!schoolTownData?.id) return;

    const { data, error } = await supabase
      .from('assignments')
      .select(
        `
        *,
        teacher:teachers(id, full_name, avatar_url)
      `
      )
      .eq('school', schoolTownData.id)
      .eq('class_level'.toLowerCase(), emailPrefix_class_level)
      .eq('subclass', emailPrefix_subclass.toUpperCase());

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

  useEffect(() => {
    if (schoolTownData?.id) {
      fetchAssignments();
    }
  }, [schoolTownData?.id]);

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

  const filteredAssignments = assignments.filter((assignment) => {
    const matchesCategory =
      selectedCategory === 'All' || assignment.subject === selectedCategory;

    const matchesClass =
      selectedClass === null ||
      Number(assignment.class_level) === Number(selectedClass);

    return matchesCategory && matchesClass;
  });

  const clearClassFilter = () => {
    setSelectedClass(null);
  };

  return (
    <div className="flex min-h-screen bg-[#FAF7F7]">
      {/* Sidebar */}
      <aside className="w-20 bg-white flex flex-col items-center py-8 space-y-8">
        <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
          <Book className="text-white" />
        </div>
        <nav className="flex flex-col items-center space-y-6 flex-1">
          <button className="p-3 text-black bg-gray-100 rounded-xl">
            <Home size={24} />
          </button>
          <button className="p-3 text-gray-400 hover:bg-gray-100 rounded-xl">
            <Calendar size={24} />
          </button>
          <button className="p-3 text-gray-400 hover:bg-gray-100 rounded-xl">
            <Book size={24} />
          </button>
          <button 
            onClick={() => navigate('/notifications', { 
              state: { 
                schoolName, 
                email, 
                classLevel: emailPrefix_class_level, 
                subclass: emailPrefix_subclass 
              } 
            })}
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
        <header className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold">
            {''}
            <Map /> School: {schoolTownData?.school_full_name}, Class:
            {emailPrefix_class_level}
            {emailPrefix_subclass.toUpperCase()},
          </h1>
          <h2>Login email: {email}</h2>
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full hover:bg-gray-100">
              <Bell size={24} />
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100">
              <Settings size={24} />
            </button>
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
              <p className="text-gray-700"> Teachers: {teachers?.full_name}</p>
              <p className="text-gray-700">
                {' '}
                Deadline: {getInfoSelectedAssignment.deadline}
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
      </main>
    </div>
  );
}

export default App;