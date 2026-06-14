import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';

export default function ProtectedRoute({ children, requiredRole }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        setSession(session);
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session) {
        setSession(session);
        fetchUserProfile(session.user.id);
      } else {
        setSession(null);
        setRole(null);
        setLoading(false);
      }
    });

    async function fetchUserProfile(userId) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .single();

        if (error || !data) {
          console.warn('User profile not found, signing out...');
          await supabase.auth.signOut();
          setSession(null);
          setRole(null);
        } else if (mounted) {
          setRole(data.role);
        }
      } catch (err) {
        console.error('Error fetching user profile in ProtectedRoute:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100" style={{ backgroundColor: 'var(--bg-dark)' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    // Redirect to login but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && role !== requiredRole) {
    // Redirect to home if they don't have the right role
    return <Navigate to={role === 'admin' ? '/admin/dashboard' : '/user/dashboard'} replace />;
  }

  return children;
}
