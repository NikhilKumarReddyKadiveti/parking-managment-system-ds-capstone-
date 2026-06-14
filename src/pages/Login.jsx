import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedEmail = email.trim().toLowerCase();

    try {
      // 1. Authenticate with Supabase Auth
      let { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      // Automatic default admin registration on first attempt
      if (error && trimmedEmail === 'admin@parking.com' && password === 'adminpassword') {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: 'admin@parking.com',
          password: 'adminpassword',
        });

        if (signUpError) throw signUpError;

        if (signUpData?.user) {
          const { error: profileError } = await supabase
            .from('users')
            .insert([{
              id: signUpData.user.id,
              name: 'System Administrator',
              email: 'admin@parking.com',
              phone: '0000000000',
              role: 'admin'
            }]);

          if (profileError) throw profileError;

          // Retry sign-in
          const retry = await supabase.auth.signInWithPassword({
            email: 'admin@parking.com',
            password: 'adminpassword'
          });

          if (retry.error) throw retry.error;
          data = retry.data;
        } else {
          throw new Error('Failed to auto-provision default Admin account.');
        }
      } else if (error) {
        throw error;
      }

      if (data?.user) {
        // 2. Fetch the user profile from custom users table
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          throw new Error('User profile record not found. Please contact administration.');
        }

        setSuccessMsg('Logged in successfully!');
        
        // Push recent login action to session log (handled on backend/dashboard side)
        const from = location.state?.from?.pathname;
        setTimeout(() => {
          if (profile.role === 'admin') {
            navigate(from || '/admin/dashboard', { replace: true });
          } else {
            navigate(from || '/user/dashboard', { replace: true });
          }
        }, 800);
      }
    } catch (error) {
      setErrorMsg(error.message || 'Failed to login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 p-3" style={{ background: 'radial-gradient(circle at 50% 50%, #151921 0%, #0a0c12 100%)', color: '#fff' }}>
      <div className="card border-0 p-4 shadow-lg" style={{ width: '450px', background: 'rgba(21, 25, 33, 0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '1rem' }}>
        <div className="text-center mb-4">
          <Link to="/" className="text-decoration-none">
            <i className="bi bi-p-square-fill text-primary display-4 mb-2 d-inline-block"></i>
          </Link>
          <h2 className="fw-bold mb-1 text-white">Welcome Back</h2>
          <p className="text-light opacity-75 small">Access the Smart Parking platform</p>
        </div>

        {errorMsg && <div className="alert alert-danger py-2 small" role="alert"><i className="bi bi-exclamation-triangle-fill me-2"></i>{errorMsg}</div>}
        {successMsg && <div className="alert alert-success py-2 small" role="alert"><i className="bi bi-check-circle-fill me-2"></i>{successMsg}</div>}

        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label text-light small fw-bold">Email Address</label>
            <div className="input-group">
              <span className="input-group-text bg-dark border-secondary text-light"><i className="bi bi-envelope"></i></span>
              <input 
                type="email" 
                className="form-control bg-dark border-secondary text-white" 
                placeholder="name@email.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label text-light small fw-bold">Password</label>
            <div className="input-group">
              <span className="input-group-text bg-dark border-secondary text-light"><i className="bi bi-lock"></i></span>
              <input 
                type="password" 
                className="form-control bg-dark border-secondary text-white" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-100 py-2.5 mb-3 fw-bold shadow-sm" 
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            ) : (
              <i className="bi bi-box-arrow-in-right me-2"></i>
            )}
            Sign In
          </button>
        </form>

        <div className="text-center mt-3 text-light opacity-75 small">
          Don't have an account? <Link to="/register" className="text-primary text-decoration-none fw-bold">Register here</Link>
        </div>
      </div>
    </div>
  );
}
