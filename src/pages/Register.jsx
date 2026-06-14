import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('user'); // default is user
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // 1. Password verification
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      // 2. Sign up in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data?.user) {
        // 3. Create public profile row linked to auth.users.id
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              name,
              email,
              phone,
              role,
            }
          ]);

        if (profileError) {
          // Provide a more descriptive error for schema mismatches
          let msg = 'Failed to create user profile database record.';
          if (profileError.code === '42703') {
            msg += ' It seems the "role" column is missing in your Supabase "users" table. Please add it to your schema.';
          } else if (profileError.code === '42P01') {
            msg += ' The "users" table does not exist in your Supabase database.';
          } else {
            msg += ' ' + profileError.message;
          }
          throw new Error(msg);
        }

        setSuccessMsg('Registration successful! Redirecting to login page...');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        throw new Error('No user data returned.');
      }
    } catch (error) {
      setErrorMsg(error.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 p-3" style={{ background: 'radial-gradient(circle at 50% 50%, #151921 0%, #0a0c12 100%)', color: '#fff' }}>
      <div className="card border-0 p-4 shadow-lg my-4" style={{ width: '500px', background: 'rgba(21, 25, 33, 0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '1rem' }}>
        <div className="text-center mb-4">
          <Link to="/" className="text-decoration-none">
            <i className="bi bi-p-square-fill text-primary display-4 mb-2 d-inline-block"></i>
          </Link>
          <h2 className="fw-bold mb-1 text-white">Create Account</h2>
          <p className="text-light opacity-75 small">Sign up for the Smart Parking Lot system</p>
        </div>

        {errorMsg && <div className="alert alert-danger py-2 small" role="alert"><i className="bi bi-exclamation-triangle-fill me-2"></i>{errorMsg}</div>}
        {successMsg && <div className="alert alert-success py-2 small" role="alert"><i className="bi bi-check-circle-fill me-2"></i>{successMsg}</div>}

        <form onSubmit={handleRegister}>
          <div className="mb-3">
            <label className="form-label text-light small fw-bold">Full Name</label>
            <div className="input-group">
              <span className="input-group-text bg-dark border-secondary text-light"><i className="bi bi-person"></i></span>
              <input 
                type="text" 
                className="form-control bg-dark border-secondary text-white" 
                placeholder="John Doe" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required 
              />
            </div>
          </div>

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

          <div className="mb-3">
            <label className="form-label text-light small fw-bold">Phone Number</label>
            <div className="input-group">
              <span className="input-group-text bg-dark border-secondary text-light"><i className="bi bi-phone"></i></span>
              <input 
                type="tel" 
                className="form-control bg-dark border-secondary text-white" 
                placeholder="9876543210" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required 
              />
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <label className="form-label text-light small fw-bold">Password</label>
              <div className="input-group">
                <span className="input-group-text bg-dark border-secondary text-light"><i className="bi bi-lock"></i></span>
                <input 
                  type="password" 
                  className="form-control bg-dark border-secondary text-white" 
                  placeholder="••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="col-md-6">
              <label className="form-label text-light small fw-bold">Confirm Password</label>
              <div className="input-group">
                <span className="input-group-text bg-dark border-secondary text-light"><i className="bi bi-lock-fill"></i></span>
                <input 
                  type="password" 
                  className="form-control bg-dark border-secondary text-white" 
                  placeholder="••••••" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required 
                />
              </div>
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
              <i className="bi bi-person-plus-fill me-2"></i>
            )}
            Sign Up
          </button>
        </form>

        <div className="text-center mt-2 text-light opacity-75 small">
          Already have an account? <Link to="/login" className="text-primary text-decoration-none fw-bold">Sign in here</Link>
        </div>
      </div>
    </div>
  );
}
