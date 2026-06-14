import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import DSVisualizer from '../../components/DSVisualizer';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalSlots: 0,
    occupiedSlots: 0,
    availableSlots: 0,
    totalVehicles: 0,
    waitingVehicles: 0
  });

  const [slots, setSlots] = useState([]);
  const [waitingQueue, setWaitingQueue] = useState([]);
  const [recentRecords, setRecentRecords] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);
  const [activitiesStack, setActivitiesStack] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admin Profile Settings States
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch slots
      const { data: slotsData } = await supabase
        .from('parking_slots')
        .select('*');
      
      const loadedSlots = slotsData || [];
      setSlots(loadedSlots);

      // 2. Fetch waiting queue
      const { data: queueData } = await supabase
        .from('waiting_queue')
        .select('*, vehicles(vehicle_number, vehicle_type)')
        .order('queue_position', { ascending: true });
      
      const loadedQueue = queueData || [];
      setWaitingQueue(loadedQueue);

      // 3. Fetch recent parking records
      const { data: recordsData } = await supabase
        .from('parking_records')
        .select('*, vehicles(vehicle_number, vehicle_type), parking_slots(slot_number)')
        .order('entry_time', { ascending: false })
        .limit(10);
      
      const loadedRecords = recordsData || [];
      setRecentRecords(loadedRecords);

      // 4. Fetch all vehicles for hash table search
      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('*, users(name)');
      
      const loadedVehicles = vehiclesData || [];
      setAllVehicles(loadedVehicles);

      // Calculate KPI statistics
      const total = loadedSlots.length;
      const occupied = loadedSlots.filter(s => s.status === 'occupied').length;
      const available = loadedSlots.filter(s => s.status === 'available').length;
      const totalV = loadedVehicles.length;
      const waiting = loadedQueue.length;

      setStats({
        totalSlots: total,
        occupiedSlots: occupied,
        availableSlots: available,
        totalVehicles: totalV,
        waitingVehicles: waiting
      });

      // 5. Generate activity stack logs from recent events
      const activities = [];
      
      // Add entry/exit activities from parking records
      loadedRecords.forEach(rec => {
        const timeStr = rec.entry_time;
        const vehNum = rec.vehicles?.vehicle_number || 'Vehicle';
        const slotNum = rec.parking_slots?.slot_number || 'Slot';
        
        if (rec.status === 'active') {
          activities.push({
            id: `entry-${rec.id}`,
            type: 'entry',
            message: `Vehicle ${vehNum} parked in slot ${slotNum}`,
            timestamp: timeStr
          });
        } else if (rec.status === 'completed') {
          activities.push({
            id: `exit-${rec.id}`,
            type: 'exit',
            message: `Vehicle ${vehNum} exited. Paid ₹${rec.parking_fee}`,
            timestamp: rec.exit_time || timeStr
          });
        }
      });

      // Add waiting queue activities
      loadedQueue.forEach(q => {
        activities.push({
          id: `queue-${q.id}`,
          type: 'queue',
          message: `Vehicle ${q.vehicles?.vehicle_number} joined waiting queue (Position ${q.queue_position})`,
          timestamp: q.created_at
        });
      });

      // Sort activities to simulate chronological logs
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setActivitiesStack(activities.slice(0, 8)); // Top 8 items on stack

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to real-time events to update the admin dashboard on insertions or updates
    const slotsChannel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', table: 'parking_slots' }, () => { fetchDashboardData(); })
      .on('postgres_changes', { event: '*', table: 'waiting_queue' }, () => { fetchDashboardData(); })
      .on('postgres_changes', { event: '*', table: 'parking_records' }, () => { fetchDashboardData(); })
      .on('postgres_changes', { event: '*', table: 'vehicles' }, () => { fetchDashboardData(); })
      .subscribe();

    return () => {
      supabase.removeChannel(slotsChannel);
    };
  }, []);

  const handleUpdateAdminProfile = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsMsg('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated session found.");

      const updates = {};
      if (newEmail.trim()) updates.email = newEmail.trim().toLowerCase();
      if (newPassword.trim()) updates.password = newPassword.trim();

      if (Object.keys(updates).length === 0) {
        throw new Error("Please fill in at least one field to update.");
      }

      const { error: authError } = await supabase.auth.updateUser(updates);
      if (authError) throw authError;

      if (updates.email) {
        const { error: profileError } = await supabase
          .from('users')
          .update({ email: updates.email })
          .eq('id', user.id);
        if (profileError) throw profileError;
      }

      setSettingsMsg("Credentials updated successfully!");
      setNewEmail('');
      setNewPassword('');
    } catch (err) {
      setSettingsMsg("Error: " + err.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Calculate statistics for charts
  const occupancyRate = stats.totalSlots > 0 ? Math.round((stats.occupiedSlots / stats.totalSlots) * 100) : 0;
  const totalRevenue = recentRecords
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + Number(r.parking_fee || 0), 0);

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-white fw-bold mb-0">System Admin Dashboard</h2>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-info" onClick={() => setShowSettings(!showSettings)}>
            <i className="bi bi-person-fill-gear me-1"></i> Settings
          </button>
          <button className="btn btn-outline-primary" onClick={fetchDashboardData}>
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh Data
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="card border-0 text-white p-4 mb-4" style={{ background: '#191c24' }}>
          <h5 className="fw-bold mb-3"><i className="bi bi-shield-lock-fill text-warning me-2"></i>Change Admin Credentials</h5>
          {settingsMsg && (
            <div className={`alert ${settingsMsg.startsWith('Error') ? 'alert-danger' : 'alert-success'} py-2 small mb-3`}>
              {settingsMsg}
            </div>
          )}
          <form onSubmit={handleUpdateAdminProfile} className="row g-3 align-items-end">
            <div className="col-md-5">
              <label className="form-label text-secondary small fw-bold">New Email ID</label>
              <input 
                type="email" 
                className="form-control bg-dark border-secondary text-white" 
                placeholder="admin@parking.com" 
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
              />
            </div>
            <div className="col-md-5">
              <label className="form-label text-secondary small fw-bold">New Password</label>
              <input 
                type="password" 
                className="form-control bg-dark border-secondary text-white" 
                placeholder="New Password" 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <button type="submit" className="btn btn-warning w-100 fw-bold py-2" disabled={settingsLoading}>
                {settingsLoading ? 'Saving...' : 'Update'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        {/* Total Slots Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm text-white" style={{ background: '#151921', borderLeft: '4px solid #0d6efd' }}>
            <div className="card-body p-4 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-light opacity-75 small text-uppercase fw-bold mb-1">Total Slots</h6>
                <h3 className="fw-bold mb-0">{stats.totalSlots}</h3>
              </div>
              <div className="bg-primary bg-opacity-10 p-3 rounded-circle text-primary">
                <i className="bi bi-grid-3x3-gap fs-3"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Occupied Slots Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm text-white" style={{ background: '#151921', borderLeft: '4px solid #dc3545' }}>
            <div className="card-body p-4 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-light opacity-75 small text-uppercase fw-bold mb-1">Occupied Slots</h6>
                <h3 className="fw-bold mb-0">{stats.occupiedSlots}</h3>
              </div>
              <div className="bg-danger bg-opacity-10 p-3 rounded-circle text-danger">
                <i className="bi bi-car-front-fill fs-3"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Available Slots Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm text-white" style={{ background: '#151921', borderLeft: '4px solid #28a745' }}>
            <div className="card-body p-4 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-light opacity-75 small text-uppercase fw-bold mb-1">Available Slots</h6>
                <h3 className="fw-bold mb-0">{stats.availableSlots}</h3>
              </div>
              <div className="bg-success bg-opacity-10 p-3 rounded-circle text-success">
                <i className="bi bi-check-circle fs-3"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Waiting Vehicles Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm text-white" style={{ background: '#151921', borderLeft: '4px solid #ffc107' }}>
            <div className="card-body p-4 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-light opacity-75 small text-uppercase fw-bold mb-1">Waiting Vehicles</h6>
                <h3 className="fw-bold mb-0">{stats.waitingVehicles}</h3>
              </div>
              <div className="bg-warning bg-opacity-10 p-3 rounded-circle text-warning">
                <i className="bi bi-hourglass-split fs-3"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid for Queue and Reports */}
      <div className="row g-4 mb-4">
        {/* Waiting Queue List */}
        <div className="col-lg-6">
          <div className="card border-0 text-white h-100" style={{ background: '#151921' }}>
            <div className="card-header border-bottom border-secondary bg-transparent py-3 d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold"><i className="bi bi-people me-2 text-warning"></i>Vehicle Waiting Line</h5>
              <span className="badge bg-warning text-dark">{waitingQueue.length} Waiting</span>
            </div>
            <div className="card-body p-0" style={{ maxHeight: '380px', overflowY: 'auto' }}>
              {waitingQueue.length === 0 ? (
                <div className="text-center text-light opacity-50 py-5">
                  <i className="bi bi-check2-circle fs-1 text-success mb-2 d-block"></i>
                  All vehicles are parked. No queue.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover table-dark mb-0">
                    <thead>
                      <tr className="text-light opacity-75 small border-secondary">
                        <th>Position</th>
                        <th>Vehicle Number</th>
                        <th>Type</th>
                        <th>Joined At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waitingQueue.map((item, index) => (
                        <tr key={item.id} className="border-secondary align-middle">
                          <td className="fw-bold text-warning font-monospace">#{item.queue_position}</td>
                          <td>
                            <span className="badge bg-secondary font-monospace p-2">
                              {item.vehicles?.vehicle_number}
                            </span>
                          </td>
                          <td className="text-light">{item.vehicles?.vehicle_type}</td>
                          <td className="small text-light opacity-50">
                            {new Date(item.created_at).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Charts & Stat visualization */}
        <div className="col-lg-6">
          <div className="card border-0 text-white h-100" style={{ background: '#151921' }}>
            <div className="card-header border-bottom border-secondary bg-transparent py-3">
              <h5 className="mb-0 fw-bold"><i className="bi bi-bar-chart me-2 text-primary"></i>Lot Utilization & Stats</h5>
            </div>
            <div className="card-body p-4 d-flex flex-column justify-content-around">
              {/* Utilization Bar */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small text-light opacity-75 fw-bold">Slot Occupancy Rate</span>
                  <span className="fw-bold text-primary">{occupancyRate}%</span>
                </div>
                <div className="progress" style={{ height: '20px', background: 'rgba(255,255,255,0.05)' }}>
                  <div 
                    className="progress-bar progress-bar-striped progress-bar-animated bg-primary" 
                    role="progressbar" 
                    style={{ width: `${occupancyRate}%` }} 
                    aria-valuenow={occupancyRate} 
                    aria-valuemin="0" 
                    aria-valuemax="100"
                  ></div>
                </div>
              </div>

              {/* Dynamic Grid Statistics */}
              <div className="row text-center g-2 mt-2">
                <div className="col-6">
                  <div className="p-3 rounded border border-secondary" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <h6 className="text-light opacity-75 small mb-1">Total Vehicles</h6>
                    <h4 className="fw-bold mb-0 text-info">{stats.totalVehicles}</h4>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-3 rounded border border-secondary" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <h6 className="text-light opacity-75 small mb-1">Recent Revenue</h6>
                    <h4 className="fw-bold mb-0 text-success">₹{totalRevenue}</h4>
                  </div>
                </div>
              </div>

              {/* Quick Info Alert */}
              <div className="alert bg-dark border-secondary text-light opacity-75 small mb-0 mt-4">
                <i className="bi bi-info-circle-fill me-2 text-info"></i>
                Queue allocation is automated. If all parking slots are full, new vehicle entries are queued. Freeing up a slot automatically dequeues the first waiting vehicle and marks its status as active.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Data Structures Visualizer */}
      <div className="row mb-4">
        <div className="col-12">
          <DSVisualizer 
            slots={slots} 
            queueList={waitingQueue} 
            activities={activitiesStack} 
            vehicles={allVehicles}
            records={recentRecords}
          />
        </div>
      </div>
    </div>
  );
}
