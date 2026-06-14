import React, { useEffect, useState } from 'react';
import { supabase } from '../config/supabaseClient';

export default function Topbar({ toggleSidebar }) {
  const [userName, setUserName] = useState('Loading...');
  const [userRole, setUserRole] = useState('user');

  useEffect(() => {
    let mounted = true;

    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      const { data, error } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', user.id)
        .single();

      if (!error && data && mounted) {
        setUserName(data.name);
        setUserRole(data.role);
      }
    }

    getProfile();
    return () => { mounted = false; };
  }, []);

  return (
    <header className="navbar navbar-expand navbar-dark sticky-top p-3 shadow" style={{ background: '#191c24', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="container-fluid">
        <button type="button" id="sidebarCollapse" className="btn btn-outline-secondary me-3" onClick={toggleSidebar}>
          <i className="bi bi-list fs-5"></i>
        </button>

        <div className="d-flex align-items-center ms-auto">
          <div className="text-end me-3 d-none d-sm-block">
            <div className="fw-bold text-white mb-0">{userName}</div>
            <small className="text-muted text-capitalize font-monospace" style={{ fontSize: '0.75rem' }}>{userRole}</small>
          </div>
          <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold" style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
