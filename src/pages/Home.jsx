import React from 'react';
import { Link } from 'react-router-dom';

export default function Home({ session, role }) {
  const dashboardPath = role === 'admin' ? '/admin/dashboard' : '/user/dashboard';

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 p-3" style={{ background: 'radial-gradient(circle at 50% 50%, #1e2433 0%, #0f121d 100%)', color: '#fff' }}>
      <div className="card border-0 p-4 p-md-5 text-center shadow-lg position-relative" style={{ maxWidth: '700px', background: 'rgba(25, 28, 36, 0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1.25rem' }}>
        <div className="mb-4">
          <i className="bi bi-p-square-fill text-primary" style={{ fontSize: '5rem', filter: 'drop-shadow(0 0 15px rgba(13, 110, 253, 0.4))' }}></i>
        </div>
        <h1 className="fw-bold mb-3">Smart Parking Lot <span className="text-primary">Management System</span></h1>
        <p className="lead text-secondary mb-4" style={{ fontSize: '1.1rem' }}>
          An advanced, responsive administrative platform utilizing optimized core Data Structures (Arrays, Queue, Stack, Hash Table, and Linked Lists) to automate slot allocation, waiting queues, and billing calculations.
        </p>

        <div className="row g-3 justify-content-center mb-5">
          <div className="col-6 col-sm-4">
            <div className="p-3 rounded border border-secondary" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <h5 className="text-warning fw-bold mb-1">Auto</h5>
              <small className="text-muted">Waiting Line</small>
            </div>
          </div>
          <div className="col-6 col-sm-4">
            <div className="p-3 rounded border border-secondary" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <h5 className="text-info fw-bold mb-1">Instant</h5>
              <small className="text-muted">Search Registry</small>
            </div>
          </div>
          <div className="col-6 col-sm-4">
            <div className="p-3 rounded border border-secondary" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <h5 className="text-success fw-bold mb-1">Live</h5>
              <small className="text-muted">Action Tracker</small>
            </div>
          </div>
        </div>

        <div className="d-sm-flex justify-content-center gap-3">
          {session ? (
            <Link to={dashboardPath} className="btn btn-primary btn-lg px-5 py-3 mb-2 mb-sm-0 w-100 w-sm-auto shadow-sm">
              <i className="bi bi-speedometer2 me-2"></i>Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-primary btn-lg px-5 py-3 mb-2 mb-sm-0 w-100 w-sm-auto shadow-sm">
                <i className="bi bi-box-arrow-in-right me-2"></i>Sign In
              </Link>
              <Link to="/register" className="btn btn-outline-secondary btn-lg px-5 py-3 w-100 w-sm-auto">
                <i className="bi bi-person-plus-fill me-2"></i>Register Account
              </Link>
            </>
          )}
        </div>

        <div className="mt-5 text-muted small border-top border-secondary pt-3">
          Smart Parking Lot Management Platform
        </div>
      </div>
    </div>
  );
}
