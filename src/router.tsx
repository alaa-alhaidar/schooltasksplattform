import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from 'react-router-dom';
import { useEffect, useState } from 'react';
import App from './App';
import Login from './pages/Login';
import Schools from './schools';
import Notifications from './pages/Notifications';
import Schedule from './Schedule';
import Schools_notifications from './pages/Schools_notifications';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';
import AppLayout from './layout/AppLayout';
import Settings from './pages/Settings';
import AuditLog from './pages/AuditLog';
import Landing from './pages/Landing';
import Today from './pages/Today';

// ProtectedRoute component to handle auth logic
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
      setLoading(false);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F7]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Create router with routes
const router = createBrowserRouter([
  {
    path: '/',
    element: <Landing />,
  },
  {
    path: '/landing',
    element: <Landing />,
  },
  {
    path: '/landing.html',
    element: <Landing />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/today', element: <Today /> },
      { path: '/dashboard', element: <App /> },
      { path: '/schools', element: <Schools /> },
      { path: '/notifications', element: <Notifications /> },
      {
        path: '/schools_notifications',
        element: <Schools_notifications />,
      },
      { path: '/Schedule', element: <Schedule /> },
      { path: '/settings', element: <Settings /> },
      { path: '/audit-log', element: <AuditLog /> },
    ],
  },
]);

// Router component that provides the router
export const Router = () => {
  return <RouterProvider router={router} />;
};

export default Router;
