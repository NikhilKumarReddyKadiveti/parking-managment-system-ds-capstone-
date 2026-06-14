import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { supabase } from './config/supabaseClient';

// Core Public Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

// Protected Components
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminSlots from './pages/admin/Slots';
import AdminVehicles from './pages/admin/Vehicles';
import AdminReports from './pages/admin/Reports';

// User Pages
import UserDashboard from './pages/user/Dashboard';
import UserBookSlot from './pages/user/BookSlot';
import UserVehicles from './pages/user/vehicles'; // lowercase 'v' in filename
import UserHistory from './pages/user/History';

import './App.css';

// Dashboard Layout Wrapper
function DashboardLayout({ role }) {
  const [sidebarActive, setSidebarActive] = useState(false);

  const toggleSidebar = () => {
    setSidebarActive(!sidebarActive);
  };

  return (
    <div className="wrapper d-flex align-items-stretch min-vh-100" style={{ background: 'var(--bg-dark)' }}>
      {/* Sidebar Navigation */}
      <Sidebar role={role} active={sidebarActive} toggleSidebar={toggleSidebar} />
      
      {/* Page Content Panel */}
      <div id="content" className="w-100 d-flex flex-column" style={{ transition: 'all 0.3s' }}>
        <Topbar toggleSidebar={toggleSidebar} />
        <main className="p-4 flex-grow-1" style={{ minHeight: 'calc(100vh - 73px)', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchRole(session.user.id);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchRole(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (data) setRole(data.role);
    } catch (err) {
      console.error("Error fetching role:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100" style={{ backgroundColor: '#0f121d' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Helper for authenticated redirection
  const getDashboardPath = () => {
    return role === 'admin' ? '/admin/dashboard' : '/user/dashboard';
  };

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home session={session} role={role} />} />
        <Route 
          path="/login" 
          element={!session ? <Login /> : <Navigate to={getDashboardPath()} replace />} 
        />
        <Route 
          path="/register" 
          element={!session ? <Register /> : <Navigate to={getDashboardPath()} replace />} 
        />

        {/* Admin Dashboard Protected Routes */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requiredRole="admin">
              <DashboardLayout role="admin" />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="slots" element={<AdminSlots />} />
          <Route path="vehicles" element={<AdminVehicles />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="" element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* User Dashboard Protected Routes */}
        <Route 
          path="/user" 
          element={
            <ProtectedRoute requiredRole="user">
              <DashboardLayout role="user" />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<UserDashboard />} />
          <Route path="book" element={<UserBookSlot />} />
          <Route path="vehicles" element={<UserVehicles />} />
          <Route path="history" element={<UserHistory />} />
          <Route path="" element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Wildcard fallback redirects */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
