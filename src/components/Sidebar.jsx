import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';

export default function Sidebar({ role, active, toggleSidebar }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <nav id="sidebar" className={active ? 'active' : ''} style={{ background: '#191c24', borderRight: '1px solid rgba(255,255,255,0.08)', transition: 'all 0.3s' }}>
      <div className="sidebar-header p-3 text-center border-bottom border-secondary">
        <h4 className="text-primary mb-0 fw-bold">
          <i className="bi bi-p-square-fill me-2 text-warning"></i>
          SmartPark
        </h4>
        <small className="text-muted text-uppercase font-monospace" style={{ fontSize: '0.7rem' }}>
          {role === 'admin' ? 'Admin Panel' : 'User Panel'}
        </small>
      </div>

      <ul className="list-unstyled components p-3 m-0">
        {role === 'admin' ? (
          <>
            <li className="mb-2">
              <NavLink to="/admin/dashboard" className={({ isActive }) => `nav-link p-3 rounded d-flex align-items-center text-white ${isActive ? 'bg-primary' : ''}`}>
                <i className="bi bi-speedometer2 me-3 fs-5 text-warning"></i>
                Dashboard
              </NavLink>
            </li>
            <li className="mb-2">
              <NavLink to="/admin/slots" className={({ isActive }) => `nav-link p-3 rounded d-flex align-items-center text-white ${isActive ? 'bg-primary' : ''}`}>
                <i className="bi bi-grid-3x3-gap me-3 fs-5 text-info"></i>
                Slot Management
              </NavLink>
            </li>
            <li className="mb-2">
              <NavLink to="/admin/vehicles" className={({ isActive }) => `nav-link p-3 rounded d-flex align-items-center text-white ${isActive ? 'bg-primary' : ''}`}>
                <i className="bi bi-car-front me-3 fs-5 text-success"></i>
                Vehicle Monitoring
              </NavLink>
            </li>
            <li className="mb-2">
              <NavLink to="/admin/reports" className={({ isActive }) => `nav-link p-3 rounded d-flex align-items-center text-white ${isActive ? 'bg-primary' : ''}`}>
                <i className="bi bi-file-earmark-bar-graph me-3 fs-5 text-danger"></i>
                Reports
              </NavLink>
            </li>
          </>
        ) : (
          <>
            <li className="mb-2">
              <NavLink to="/user/dashboard" className={({ isActive }) => `nav-link p-3 rounded d-flex align-items-center text-white ${isActive ? 'bg-primary' : ''}`}>
                <i className="bi bi-speedometer2 me-3 fs-5 text-warning"></i>
                Dashboard
              </NavLink>
            </li>
            <li className="mb-2">
              <NavLink to="/user/book" className={({ isActive }) => `nav-link p-3 rounded d-flex align-items-center text-white ${isActive ? 'bg-primary' : ''}`}>
                <i className="bi bi-bookmark-plus me-3 fs-5 text-info"></i>
                Book Slot
              </NavLink>
            </li>
            <li className="mb-2">
              <NavLink to="/user/vehicles" className={({ isActive }) => `nav-link p-3 rounded d-flex align-items-center text-white ${isActive ? 'bg-primary' : ''}`}>
                <i className="bi bi-car-front me-3 fs-5 text-success"></i>
                My Vehicles
              </NavLink>
            </li>
            <li className="mb-2">
              <NavLink to="/user/history" className={({ isActive }) => `nav-link p-3 rounded d-flex align-items-center text-white ${isActive ? 'bg-primary' : ''}`}>
                <i className="bi bi-clock-history me-3 fs-5 text-danger"></i>
                Parking History
              </NavLink>
            </li>
          </>
        )}
      </ul>

      <div className="p-3 border-top border-secondary position-absolute bottom-0 w-100">
        <button className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center" onClick={handleLogout}>
          <i className="bi bi-box-arrow-left me-2"></i>
          Logout
        </button>
      </div>
    </nav>
  );
}
