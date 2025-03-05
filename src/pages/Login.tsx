import React, { useState, useEffect } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import { supabase, signIn, signUp } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import backgroundImage from '/src/kidsimage.jpg'; // Adjust the path to your image

const Login = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    fullName: '',
  });

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate('/dashboard');
      }
    };
    checkUser();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
  
    try {
      if (isSignUp) {
        const { error } = await signUp(authForm.email, authForm.password, authForm.fullName);
        if (error) throw error;
        alert('Account created! Please sign in.');
        setIsSignUp(false);
      } else {
        const { error } = await signIn(authForm.email, authForm.password);
        if (error) throw error;
  
        const email = authForm.email;
        const emailPrefix = email.split('@')[0]; // Extracts "1a" from "1a@bigschool.com"
        const schoolName = email.split('@')[1].split('.')[0]; // Extracts "bigschool"
  
        // Extract class level and subclass
        const matches = emailPrefix.match(/^(\d+)([a-zA-Z])$/);
        const classLevel = matches ? matches[1] : null;
        const subclass = matches ? matches[2] : null;
  
        // Check if it's a valid school email pattern
        const isSchool = !!matches;
  
        if (isSchool) {
          navigate('/schools', { 
            state: { 
              schoolName, 
              classLevel, 
              subclass 
            } 
          });
        } else {
          navigate('/dashboard', { state: { schoolName } });
        }
      }
    } catch (error: any) {
      setAuthError(error.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${backgroundImage})`,
        }}
      ></div>

      {/* Semi-Transparent Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>

      {/* Form Container */}
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md relative z-10">
        <h1 className="text-3xl font-bold mb-8 text-center hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-transparent hover:bg-clip-text">
          {isSignUp ? 'Create Account' : 'my school tasks'}
        </h1>
        <h2 className="text-xl mb-6 text-center text-gray-600">
          {isSignUp ? 'Join our teaching community' : 'Welcome back, teacher'}
        </h2>

        {authError && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
            {authError}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={authForm.fullName}
                onChange={(e) =>
                  setAuthForm({ ...authForm, fullName: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
                required
                placeholder="Enter your full name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={authForm.email}
              onChange={(e) =>
                setAuthForm({ ...authForm, email: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
              required
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={authForm.password}
              onChange={(e) =>
                setAuthForm({ ...authForm, password: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
              required
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 px-4 rounded-lg hover:bg-gradient-to-r from-blue-500 to-purple-600 transition-all flex items-center justify-center"
          >
            {loading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Loading...
              </span>
            ) : (
              <span className="flex items-center">
                {isSignUp ? (
                  <UserPlus className="mr-2" size={20} />
                ) : (
                  <LogIn className="mr-2" size={20} />
                )}
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-gray-600 hover:text-black"
          >
            {isSignUp
              ? 'Already have an account? Sign in'
              : 'Need an account? Sign up'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;