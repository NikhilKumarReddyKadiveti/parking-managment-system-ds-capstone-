import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import DSVisualizer from '../../components/DSVisualizer';

export default function UserDashboard() {
  const [userId, setUserId] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]);
  const [historyCount, setHistoryCount] = useState(0);
  const [queueStatus, setQueueStatus] = useState([]);
  
  // Overall visualizer states (to feed DS visualizer)
  const [allSlots, setAllSlots] = useState([]);
  const [allQueue, setAllQueue] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [activitiesStack, setActivitiesStack] = useState([]);

  const [loading, setLoading] = useState(true);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // 1. User's vehicles
      const { data: vData } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id);
      const userVehicles = vData || [];
      setVehicles(userVehicles);
      const vehicleIds = userVehicles.map(v => v.id);

      // 2. User's active parking records
      if (vehicleIds.length > 0) {
        const { data: activeRecs } = await supabase
          .from('parking_records')
          .select('*, vehicles(*), parking_slots(*)')
          .in('vehicle_id', vehicleIds)
          .eq('status', 'active');
        setActiveBookings(activeRecs || []);

        // 3. User's history records count
        const { count, error: countErr } = await supabase
          .from('parking_records')
          .select('*', { count: 'exact', head: true })
          .in('vehicle_id', vehicleIds)
          .eq('status', 'completed');
        if (!countErr) setHistoryCount(count || 0);

        // 4. User's vehicles in waiting queue
        const { data: qData } = await supabase
          .from('waiting_queue')
          .select('*, vehicles(*)')
          .in('vehicle_id', vehicleIds)
          .order('queue_position', { ascending: true });
        setQueueStatus(qData || []);
      }

      // 5. Fetch overall database states for Visualizer
      const { data: slotsData } = await supabase.from('parking_slots').select('*');
      setAllSlots(slotsData || []);

      const { data: fullQueue } = await supabase
        .from('waiting_queue')
        .select('*, vehicles(vehicle_number, vehicle_type)')
        .order('queue_position', { ascending: true });
      setAllQueue(fullQueue || []);

      const { data: fullVehicles } = await supabase.from('vehicles').select('*, users(name)');
      setAllVehicles(fullVehicles || []);

      const { data: fullRecords } = await supabase
        .from('parking_records')
        .select('*, vehicles(vehicle_number, vehicle_type), parking_slots(slot_number)')
        .order('entry_time', { ascending: false })
        .limit(10);
      setAllRecords(fullRecords || []);

      // Stack Logs
      const activities = [];
      (fullRecords || []).forEach(rec => {
        const vehNum = rec.vehicles?.vehicle_number || 'Vehicle';
        const slotNum = rec.parking_slots?.slot_number || 'Slot';
        if (rec.status === 'active') {
          activities.push({
            id: `entry-${rec.id}`,
            type: 'entry',
            message: `Vehicle ${vehNum} parked in slot ${slotNum}`,
            timestamp: rec.entry_time
          });
        } else if (rec.status === 'completed') {
          activities.push({
            id: `exit-${rec.id}`,
            type: 'exit',
            message: `Vehicle ${vehNum} exited. Paid ₹${rec.parking_fee}`,
            timestamp: rec.exit_time
          });
        }
      });
      (fullQueue || []).forEach(q => {
        activities.push({
          id: `queue-${q.id}`,
          type: 'queue',
          message: `Vehicle ${q.vehicles?.vehicle_number} joined waiting queue (Pos ${q.queue_position})`,
          timestamp: q.created_at
        });
      });
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setActivitiesStack(activities.slice(0, 8));

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    
    // Set up subscriptions
    const sub = supabase.channel('user-changes')
      .on('postgres_changes', { event: '*', table: 'parking_slots' }, () => { fetchUserData(); })
      .on('postgres_changes', { event: '*', table: 'waiting_queue' }, () => { fetchUserData(); })
      .on('postgres_changes', { event: '*', table: 'parking_records' }, () => { fetchUserData(); })
      .on('postgres_changes', { event: '*', table: 'vehicles' }, () => { fetchUserData(); })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const availableSlotsCount = allSlots.filter(s => s.status === 'available').length;

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-white fw-bold mb-0">My Dashboard</h2>
        <button className="btn btn-outline-primary" onClick={fetchUserData}>
          <i className="bi bi-arrow-clockwise me-1"></i> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        {/* Total Vehicles Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm text-white" style={{ background: '#151921', borderLeft: '4px solid #0d6efd' }}>
            <div className="card-body p-4 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-light opacity-75 small text-uppercase fw-bold mb-1">My Vehicles</h6>
                <h3 className="fw-bold mb-0">{vehicles.length}</h3>
              </div>
              <div className="bg-primary bg-opacity-10 p-3 rounded-circle text-primary">
                <i className="bi bi-car-front fs-3"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Active Bookings Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm text-white" style={{ background: '#151921', borderLeft: '4px solid #28a745' }}>
            <div className="card-body p-4 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-light opacity-75 small text-uppercase fw-bold mb-1">Active Parking</h6>
                <h3 className="fw-bold mb-0">{activeBookings.length}</h3>
              </div>
              <div className="bg-success bg-opacity-10 p-3 rounded-circle text-success">
                <i className="bi bi-bookmark-check fs-3"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Total History Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm text-white" style={{ background: '#151921', borderLeft: '4px solid #dc3545' }}>
            <div className="card-body p-4 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-light opacity-75 small text-uppercase fw-bold mb-1">Past Bookings</h6>
                <h3 className="fw-bold mb-0">{historyCount}</h3>
              </div>
              <div className="bg-danger bg-opacity-10 p-3 rounded-circle text-danger">
                <i className="bi bi-clock-history fs-3"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Overall Available Slots Card */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm text-white" style={{ background: '#151921', borderLeft: '4px solid #ffc107' }}>
            <div className="card-body p-4 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-light opacity-75 small text-uppercase fw-bold mb-1">Available Lots</h6>
                <h3 className="fw-bold mb-0">{availableSlotsCount}</h3>
              </div>
              <div className="bg-warning bg-opacity-10 p-3 rounded-circle text-warning">
                <i className="bi bi-geo-alt fs-3"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* Waiting Queue Alert */}
        {queueStatus.length > 0 && (
          <div className="col-12">
            <div className="alert bg-warning text-dark border-0 p-4 shadow-sm mb-0">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <h5 className="fw-bold mb-1"><i className="bi bi-hourglass-split me-2"></i>Waiting Queue Alert!</h5>
                  <p className="mb-0">
                    Your vehicle <span className="font-monospace fw-bold">{queueStatus[0].vehicles?.vehicle_number}</span> is in the waiting queue at position <strong className="fs-5">#{queueStatus[0].queue_position}</strong>.
                    It will be automatically allocated a slot as soon as another vehicle of type <strong>{queueStatus[0].vehicles?.vehicle_type}</strong> exits.
                  </p>
                </div>
                <div className="spinner-border spinner-border-sm text-dark ms-3" role="status"></div>
              </div>
            </div>
          </div>
        )}

        {/* Active Parking Status Card */}
        <div className="col-lg-6">
          <div className="card border-0 text-white h-100" style={{ background: '#151921' }}>
            <div className="card-header border-bottom border-secondary bg-transparent py-3">
              <h5 className="mb-0 fw-bold"><i className="bi bi-bookmark-check me-2 text-success"></i>Current Parking Status</h5>
            </div>
            <div className="card-body">
              {activeBookings.length === 0 ? (
                <div className="text-center text-light opacity-50 py-5">
                  <i className="bi bi-geo fs-1 text-secondary mb-2 d-block"></i>
                  None of your vehicles are currently parked in the lot.
                </div>
              ) : (
                activeBookings.map(rec => (
                  <div key={rec.id} className="p-3 mb-3 rounded border border-success" style={{ background: 'rgba(40, 167, 69, 0.05)' }}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h4 className="fw-bold text-success font-monospace mb-0">Slot {rec.parking_slots?.slot_number}</h4>
                      <span className="badge bg-success">Parked</span>
                    </div>
                    <div className="row g-2 small">
                      <div className="col-6 text-light opacity-75">Vehicle Number:</div>
                      <div className="col-6 fw-bold font-monospace text-warning">{rec.vehicles?.vehicle_number}</div>
                      
                      <div className="col-6 text-light opacity-75">Vehicle Type:</div>
                      <div className="col-6 text-white">{rec.vehicles?.vehicle_type}</div>

                      <div className="col-6 text-light opacity-75">Entry Timestamp:</div>
                      <div className="col-6 text-light opacity-50">{new Date(rec.entry_time).toLocaleString()}</div>

                      <div className="col-6 text-light opacity-75">Current Duration:</div>
                      <div className="col-6 text-info fw-bold">
                        {((new Date() - new Date(rec.entry_time)) / 3600000).toFixed(2)} hours
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Help Guide */}
        <div className="col-lg-6">
          <div className="card border-0 text-white h-100" style={{ background: '#151921' }}>
            <div className="card-header border-bottom border-secondary bg-transparent py-3">
              <h5 className="mb-0 fw-bold"><i className="bi bi-info-circle me-2 text-info"></i>Smart Parking Lot Instructions</h5>
            </div>
            <div className="card-body p-4">
              <h6 className="text-white fw-bold">Parking Rates:</h6>
              <ul className="text-light opacity-75 small mb-4">
                <li>First Hour: <strong className="text-white">₹20</strong></li>
                <li>Each Additional Hour: <strong className="text-white">₹10</strong></li>
                <li>Lost tickets or cancellation incurs default rate.</li>
              </ul>
              <h6 className="text-white fw-bold">Slot Types matching:</h6>
              <ul className="text-light opacity-75 small mb-3">
                <li>Cars occupy <strong className="text-white">Four-Wheeler</strong> slots.</li>
                <li>Bikes occupy <strong className="text-white">Two-Wheeler</strong> slots.</li>
                <li>Trucks/Buses occupy <strong className="text-white">Heavy-Vehicle</strong> slots.</li>
              </ul>
              <div className="alert alert-info bg-dark border-info text-info small mb-0 opacity-75">
                Register your vehicle details under the <strong>My Vehicles</strong> tab before booking a slot.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visualizer */}
      <div className="row">
        <div className="col-12">
          <DSVisualizer 
            slots={allSlots} 
            queueList={allQueue} 
            activities={activitiesStack} 
            vehicles={allVehicles}
            records={allRecords}
          />
        </div>
      </div>
    </div>
  );
}
