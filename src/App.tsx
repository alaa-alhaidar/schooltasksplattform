import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
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
} from "lucide-react";
import { format } from "date-fns";
import { supabase, signIn, signUp, signOut } from "./lib/supabase";
import { Pencil, Trash2, X, Check, Loader2, Info } from "lucide-react";
import { se } from "date-fns/locale/se";

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
  class_level: number;
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
  const schoolName = state?.schoolName;
  const [schoolTownData, setSchoolTownData] = useState<SchoolTownData | null>(
    null
  );
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedClass, setSelectedClass] = useState<number | null>(null); // State for selected class level
  const [showClassDropdown, setShowClassDropdown] = useState(false); // State to toggle dropdown
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
    fullName: "",
  });

  const [newAssignment, setNewAssignment] = useState({
    title: "",
    subject: "Mathematics",
    class_level: 1,
    subclass: "A",
    deadline: format(new Date(), "yyyy-MM-dd"),
    note: "",
    school: schoolTownData?.id,
    teacher_id: user?.id,
    
  });
  useEffect(() => {
    if (schoolTownData?.id) {
      setNewAssignment((prev) => ({
        ...prev,
        school: schoolTownData.id,
      }));
    }
  }, [schoolTownData?.id]);

  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(
    null
  );

  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);

  const [getInfoSelectedAssignment, setGetInfoSelectedAssignment] =
    useState<Assignment | null>(null);  

  const subjectColors: { [key: string]: string } = {
    Mathematics: "bg-blue-100",
    German: "bg-orange-100",
    English: "bg-green-100",
    Physic: "bg-purple-100",
    Chemie: "bg-yellow-100",
    Tests: "bg-red-200",
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

  // Fetch SchoolTown Data
  const fetchSchoolTownData = async () => {
    // Make sure schoolName is available and not empty
    if (!schoolName) {
      console.log("No school name provided");
      return;
    }

    try {
      console.log("Fetching data for school:", schoolName);

      const { data, error } = await supabase
        .from("schooltowns")
        .select("*")
        .ilike("schoolname", schoolName);

      console.log("Data:", data);

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
    // Ensure getInfoSelectedAssignment.id is available
    if (!getInfoSelectedAssignment?.teacher) {
      console.log("No assignment ID provided");
      return;
    }
  
    try {
      console.log("Fetching data for Teacher ID:", getInfoSelectedAssignment.teacher);
  
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .eq("id", getInfoSelectedAssignment?.teacher?.id); // Use .eq() for exact match
  
      if (error) {
        console.error("Error fetching teachers:", error);
        return;
      }
  
      console.log("Teachers:", data);
  
      if (data && data.length > 0) {
        setTeachers([data[0] as Teacher]); // Set the first teacher in the array
      } else {
        setTeachers([]);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    }
  };
  

  // Effect hook to trigger the fetch
  useEffect(() => {
    if (schoolName) {
      fetchSchoolTownData();
    }
  }, [schoolName]); // Only re-run when schoolName changes

  useEffect(() => {
    if (getInfoSelectedAssignment?.teacher) {
      fetchTeachers();
    }
  }, [getInfoSelectedAssignment?.teacher]); 
  

  useEffect(() => {
    if (user) {
      fetchAssignments();
    }
  }, [selectedCategory, selectedClass, user]); // Add selectedClass to dependencies

  const fetchAssignments = async () => {
    if (!schoolTownData?.id) return; // Don't fetch if school ID is missing

    const { data, error } = await supabase
      .from("assignments")
      .select(
        `
        *,
        teacher:teachers(id, full_name, avatar_url)
      `
      )
      .eq("school", schoolTownData.id);

    if (error) {
      console.error("Error fetching assignments:", error);
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
      setAuthForm({ email: "", password: "", fullName: "" });
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setShowAuthForm(true);
      return;
    }

    try {
      if (editingAssignment) {
        // Update existing assignment
        const { error } = await supabase
          .from("assignments")
          .update({
            ...newAssignment,
            teacher_id: user.id,
          })
          .eq("id", editingAssignment.id);

        if (error) throw error;
      } else {
        // Create new assignment
        const { error } = await supabase.from("assignments").insert([
          {
            ...newAssignment,
            teacher_id: user.id,
          },
        ]);

        if (error) throw error;
      }

      setShowAddForm(false);
      setEditingAssignment(null);
      setNewAssignment({
        title: "",
        subject: "Mathematics",
        class_level: 1,
        subclass: "",
        deadline: format(new Date(), "yyyy-MM-dd"),
        note: "",
        school: schoolTownData?.id,
        teacher_id: user?.id,
        
      });
      fetchAssignments();
    } catch (error: any) {
      console.error("Error saving assignment:", error);
      alert("Failed to save assignment");
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!user) {
      alert("You must be logged in to delete an assignment.");
      return;
    }

    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      console.error("Error deleting assignment:", error);
      alert("Failed to delete assignment");
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
      deadline: format(new Date(assignment.deadline), "yyyy-MM-dd"),
      note: assignment.note,
      school: schoolTownData?.id,
      teacher_id: user?.id,
      teacher: user?.id,
    });
    setShowAddForm(true);
  };

  // Fixed filtering function that correctly checks class_level
  const filteredAssignments = assignments.filter((assignment) => {
    // Filter by category
    const matchesCategory =
      selectedCategory === "All" || assignment.subject === selectedCategory;

    // Filter by class_level - ensure both are numbers for consistent comparison
    const matchesClass =
      selectedClass === null ||
      Number(assignment.class_level) === Number(selectedClass);

    return matchesCategory && matchesClass;
  });

  // Clear class filter function
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
          <button className="p-3 text-gray-400 hover:bg-gray-100 rounded-xl">
            <Home size={24} />
          </button>
          <button className="p-3 text-gray-400 hover:bg-gray-100 rounded-xl">
            <Calendar size={24} />
          </button>
          <button className="p-3 text-gray-400 hover:bg-gray-100 rounded-xl">
            <Book size={24} />
          </button>
          <button className="p-3 text-gray-400 hover:bg-gray-100 rounded-xl">
            <Grid size={24} />
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
            {""}
            <Map /> School: {schoolTownData?.school_full_name}
          </h1>
          <div className="flex items-center space-x-4">
            {user && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-full"
              >
                <Plus size={20} />
                <span>Add Assignment</span>
              </button>
            )}
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
                {isSignUp ? "Create Account" : "Sign In"}
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
                    {isSignUp ? "Already have an account?" : "Need an account?"}
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
                      {isSignUp ? "Sign Up" : "Sign In"}
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
                {selectedAssignment.subject}, Class{" "}
                {selectedAssignment.class_level} {selectedAssignment.subclass},{" "}
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
                {getInfoSelectedAssignment.subject}, Class{" "}
                {getInfoSelectedAssignment.class_level} {getInfoSelectedAssignment.subclass},{" "}
                {getInfoSelectedAssignment.title}.
              </h2>
              <p className="text-gray-700">Tasks: {getInfoSelectedAssignment.title}</p>
              <p className="text-gray-700">Topic: {getInfoSelectedAssignment.subject}</p>
              <p className="text-gray-700"> Class:{getInfoSelectedAssignment.class_level}{getInfoSelectedAssignment.subclass}</p>
              <p className="text-gray-700"> School: {schoolTownData?.school_full_name}</p>
              <p className="text-gray-700"> Teachers: {getInfoSelectedAssignment?.teacher?.full_name}</p>
              <p className="text-gray-700"> Deadline: {getInfoSelectedAssignment.deadline}</p>
              <p className="text-gray-700"> Teacher ID: {getInfoSelectedAssignment?.teacher?.id}</p>
              <p className="text-gray-700"> Task ID: {getInfoSelectedAssignment.id}</p>
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
                {editingAssignment ? "Edit Assignment" : "Add New Assignment"}
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
                    <option value="Mathematics">Mathematics</option>
                    <option value="German">German</option>
                    <option value="English">English</option>
                    <option value="Physic">Physic</option>
                    <option value="Chemie">Chemie</option>
                    <option value="Tests">Tests</option>
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
                    {["A", "B", "C"].map((level) => (
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
                        title: "",
                        subject: "Mathematics",
                        class_level: 1,
                        subclass: "",
                        deadline: format(new Date(), "yyyy-MM-dd"),
                        note: "",
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
                    {editingAssignment
                      ? "Update Assignment"
                      : "Create Assignment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="flex space-x-4 mb-12">
          <button
            className={`px-4 py-2 rounded-full flex items-center space-x-2 ${
              selectedCategory === "All" ? "bg-black text-white" : "bg-white"
            }`}
            onClick={() => {
              setSelectedCategory("All");
              setSelectedClass(null); // Reset class filter
            }}
          >
            <Grid size={20} />
            <span>All</span>
          </button>
          <div className="relative">
            <button
              className={`px-4 py-2 rounded-full flex items-center space-x-2 ${
                selectedClass !== null ? "bg-black text-white" : "bg-white"
              }`}
              onClick={() => setShowClassDropdown(!showClassDropdown)}
            >
              <span>
                {selectedClass !== null ? `Class ${selectedClass}` : "Class"}
              </span>
              <ChevronDown size={20} />
            </button>
            {showClassDropdown && (
              <div className="absolute mt-2 w-48 bg-white rounded-lg shadow-lg z-10">
                {/* Option to show all classes */}
                <button
                  onClick={() => {
                    setSelectedClass(null);
                    setShowClassDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100"
                >
                  All Classes
                </button>
                {/* Individual class options */}
                {[1, 2, 3, 4, 5, 6].map((level) => (
                  <button
                    key={level}
                    onClick={() => {
                      setSelectedClass(level);
                      setShowClassDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100"
                  >
                    Class {level}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className={`px-4 py-2 rounded-full flex items-center space-x-2 hover:bg-red-100 ${
              selectedCategory === "Mathematics"
                ? "bg-black text-white"
                : "bg-white"
            }`}
            onClick={() => setSelectedCategory("Mathematics")}
          >
            <Box size={20} />
            <span>Mathematics</span>
          </button>
          <button
            className={`px-4 py-2 rounded-full flex items-center space-x-2 hover:bg-red-100 ${
              selectedCategory === "German" ? "bg-black text-white" : "bg-white"
            }`}
            onClick={() => setSelectedCategory("German")}
          >
            <Book size={20} />
            <span>German</span>
          </button>
          <button
            className={`px-4 py-2 rounded-full flex items-center space-x-2 hover:bg-red-100 ${
              selectedCategory === "English"
                ? "bg-black text-white"
                : "bg-white"
            }`}
            onClick={() => setSelectedCategory("English")}
          >
            <Languages size={20} />
            <span>English</span>
          </button>
          <button
            className={`px-4 py-2 rounded-full flex items-center space-x-2 hover:bg-red-100 ${
              selectedCategory === "Physic" ? "bg-black text-white" : "bg-white"
            }`}
            onClick={() => setSelectedCategory("Physic")}
          >
            <Atom size={20} />
            <span>Physic</span>
          </button>
          <button
            className={`px-4 py-2 rounded-full flex items-center space-x-2 hover:bg-red-100 ${
              selectedCategory === "Chemie" ? "bg-black text-white" : "bg-white"
            }`}
            onClick={() => setSelectedCategory("Chemie")}
          >
            <Beaker size={20} />
            <span>Chemie</span>
          </button>
          <button
            className={`px-4 py-2 rounded-full flex items-center space-x-2 hover:bg-red-100 ${
              selectedCategory === "Tests" ? "bg-black text-white" : "bg-white"
            }`}
            onClick={() => setSelectedCategory("Tests")}
          >
            <BookCheck size={20} />
            <span>Tests</span>
          </button>
        </div>

        {/* Active filters indicator */}
        {selectedClass !== null && (
          <div className="mb-4 px-4 py-2 bg-gray-100 rounded-lg inline-flex items-center">
            <span>Filtering: Class {selectedClass}</span>
            <button
              onClick={clearClassFilter}
              className="ml-2 text-gray-600 hover:text-gray-900"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Assignments Grid */}
        <section>
          <h2 className="text-xl font-semibold mb-6">
            Assignments{" "}
            {filteredAssignments.length > 0
              ? `(${filteredAssignments.length})`
              : ""}
          </h2>
          {user ? (
            filteredAssignments.length > 0 ? (
              <div className="grid grid-cols-2 gap-6">
                {filteredAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className={`rounded-3xl p-6 hover:shadow-lg transition-shadow ${
                      subjectColors[assignment.subject] || "bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-4">
                      <span
                        className={`p-2 rounded-xl ${
                          subjectColors[assignment.subject]
                        }`}
                      >
                        {assignment.subject === "Mathematics" && (
                          <Box size={20} />
                        )}
                        {assignment.subject === "German" && <Book size={20} />}
                        {assignment.subject === "English" && (
                          <Languages size={20} />
                        )}
                        {assignment.subject === "Physic" && <Atom size={20} />}
                        {assignment.subject === "Chemie" && (
                          <Beaker size={20} />
                        )}
                         {assignment.subject === "Tests" && (
                          <BookCheck size={20} />
                        )}
                      </span>
                      <span className="ml-auto bg-white px-3 py-1 rounded-full text-sm">
                        {assignment.subject}
                      </span>
                      <span className="ml-auto bg-white px-3 py-1 rounded-full text-sm">
                        Class {assignment.class_level}
                      </span>
                      <span className="ml-auto bg-white px-3 py-1 rounded-full text-sm">
                        {assignment.subclass}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold mb-4">
                      {assignment.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Due:{" "}
                        {format(new Date(assignment.deadline), "MMM dd, yyyy")}
                      </span>
                      <div className="flex items-center space-x-2">
                        {assignment.teacher && (
                          <img
                            src={
                              assignment.teacher.avatar_url ||
                              "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
                            }
                            alt={assignment.teacher.full_name}
                            className="w-8 h-8 rounded-full border-2 border-white"
                          />
                        )}
                      </div>
                    </div>
                    {/* Edit and Delete Buttons */}
                    <div className="flex justify-end space-x-2 mt-4">
                      <button
                        onClick={() => handleEditAssignment(assignment)}
                        className="px-3 py-1 bg-green-300 text-white rounded-lg hover:bg-green-600"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAssignment(assignment.id)}
                        className="px-3 py-1 bg-red-300 text-white rounded-lg hover:bg-red-600"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
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
                    setSelectedCategory("All");
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
                <span>Sign In</span>
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
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
              alt="Profile"
              className="w-12 h-12 rounded-full"
            />
            <div>
              <h3 className="font-semibold">
                {user ? authForm.fullName || "Teacher" : "Guest"}
              </h3>
              <p className="text-sm text-gray-500">
                {user ? "Teacher" : "Please sign in"}
              </p>
            </div>
          </div>
        </div>

        {user && (
          <>
            {/* Activity Chart */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Activity</h3>
                <select className="text-sm bg-transparent">
                  <option>Year</option>
                  <option>Month</option>
                  <option>Week</option>
                </select>
              </div>
              <div className="h-40 bg-gray-50 rounded-xl"></div>
            </div>

            {/* Recent Assignments */}
            <div>
              <h3 className="font-semibold mb-4">Recent Assignments</h3>
              <div className="space-y-4">
                {assignments.slice(0, 5).map((assignment) => (
                  <div
                    key={assignment.id}
                    className="bg-gray-50 rounded-xl p-4"
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="p-2 bg-white rounded-xl">
                        {assignment.subject === "Mathematics" && (
                          <Box size={20} />
                        )}
                        {assignment.subject === "German" && <Book size={20} />}
                        {assignment.subject === "English" && (
                          <Languages size={20} />
                        )}
                        {assignment.subject === "Physic" && <Atom size={20} />}
                        {assignment.subject === "Chemie" && (
                          <Beaker size={20} />
                        )}
                         {assignment.subject === "Tests" && (
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
                      Due:{" "}
                      {format(new Date(assignment.deadline), "MMM dd, yyyy")}
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
