import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';

export default function UserBookSlot() {
  const [vehicles, setVehicles] = useState([]);
  const [slots, setSlots] = useState([]);
  const [queue, setQueue] = useState([]);
  const [activeParking, setActiveParking] = useState([]);
  
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch user's vehicles
      const { data: vData } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id);
      setVehicles(vData || []);

      const vehicleIds = (vData || []).map(v => v.id);

      // 2. Fetch all slots
      const { data: slotsData } = await supabase
        .from('parking_slots')
        .select('*')
        .order('slot_number');
      setSlots(slotsData || []);

      if (vehicleIds.length > 0) {
        // 3. Fetch user's active parking records
        const { data: activeRecs } = await supabase
          .from('parking_records')
          .select('*, parking_slots(*), vehicles(*)')
          .in('vehicle_id', vehicleIds)
          .eq('status', 'active');
        setActiveParking(activeRecs || []);

        // 4. Fetch user's queue positions
        const { data: qData } = await supabase
          .from('waiting_queue')
          .select('*, vehicles(*)')
          .in('vehicle_id', vehicleIds);
        setQueue(qData || []);
      }

    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => {
      setAlert({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const getRequiredSlotType = (vType) => {
    if (vType === 'Bike') return 'Two-Wheeler';
    if (vType === 'Truck') return 'Heavy-Vehicle';
    return 'Four-Wheeler'; // Car
  };

  const handleBookSlot = async (e) => {
    e.preventDefault();
    if (!selectedVehicleId || !selectedSlotId) return;

    // Check if vehicle is already parked or queued
    const isParked = activeParking.some(p => p.vehicle_id === Number(selectedVehicleId));
    const isQueued = queue.some(q => q.vehicle_id === Number(selectedVehicleId));
    if (isParked || isQueued) {
      showAlert('This vehicle is already parked or waiting in the queue!', 'danger');
      return;
    }

    try {
      // 1. Mark slot as occupied
      const { error: slotErr } = await supabase
        .from('parking_slots')
        .update({ status: 'occupied' })
        .eq('id', selectedSlotId);
      if (slotErr) throw slotErr;

      // 2. Create active parking record
      const { error: recErr } = await supabase
        .from('parking_records')
        .insert([{
          vehicle_id: selectedVehicleId,
          slot_id: selectedSlotId,
          entry_time: new Date().toISOString(),
          status: 'active'
        }]);
      if (recErr) throw recErr;

      const slotObj = slots.find(s => s.id === Number(selectedSlotId));
      showAlert(`Slot ${slotObj?.slot_number} booked successfully!`);
      setSelectedSlotId('');
      setSelectedVehicleId('');
      fetchData();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  const handleJoinQueue = async (vehicleId, vehicleType) => {
    const isParked = activeParking.some(p => p.vehicle_id === vehicleId);
    const isQueued = queue.some(q => q.vehicle_id === vehicleId);
    if (isParked || isQueued) {
      showAlert('This vehicle is already active in the system.', 'danger');
      return;
    }

    try {
      // Find global queue length to set queue position
      const { data: fullQueue, error: fullQErr } = await supabase
        .from('waiting_queue')
        .select('queue_position');
      if (fullQErr) throw fullQErr;

      const nextPosition = (fullQueue || []).length > 0 
        ? Math.max(...fullQueue.map(q => q.queue_position)) + 1 
        : 1;

      // Add to waiting queue table
      const { error: qErr } = await supabase
        .from('waiting_queue')
        .insert([{
          vehicle_id: vehicleId,
          queue_position: nextPosition,
          created_at: new Date().toISOString()
        }]);
      if (qErr) throw qErr;

      showAlert(`Added to Waiting Queue! Position: #${nextPosition}`, 'warning');
      fetchData();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  const handleCancelBooking = async (record) => {
    if (!window.confirm(`Are you sure you want to cancel the booking for Slot ${record.parking_slots?.slot_number}?`)) {
      return;
    }

    try {
      // 1. Mark parking record as cancelled
      const { error: recErr } = await supabase
        .from('parking_records')
        .update({
          exit_time: new Date().toISOString(),
          status: 'cancelled'
        })
        .eq('id', record.id);
      if (recErr) throw recErr;

      showAlert('Booking cancelled successfully.');

      // 2. Queue Shifting Check
      const slotType = record.parking_slots?.slot_type;
      
      // Fetch waiting queue for that type
      const { data: fullQueue } = await supabase
        .from('waiting_queue')
        .select('*, vehicles(*)')
        .order('queue_position', { ascending: true });

      const matchingWaiting = (fullQueue || []).filter(
        q => getRequiredSlotType(q.vehicles?.vehicle_type) === slotType
      );

      if (matchingWaiting.length > 0) {
        const nextWaiting = matchingWaiting[0];

        // Dequeue next vehicle
        const { error: delQErr } = await supabase
          .from('waiting_queue')
          .delete()
          .eq('id', nextWaiting.id);
        if (delQErr) throw delQErr;

        // Allocate slot to this vehicle
        const { error: newRecErr } = await supabase
          .from('parking_records')
          .insert([{
            vehicle_id: nextWaiting.vehicle_id,
            slot_id: record.slot_id,
            entry_time: new Date().toISOString(),
            status: 'active'
          }]);
        if (newRecErr) throw newRecErr;

        // Re-index remaining queue positions
        const remainingQueue = (fullQueue || []).filter(q => q.id !== nextWaiting.id);
        for (let i = 0; i < remainingQueue.length; i++) {
          await supabase
            .from('waiting_queue')
            .update({ queue_position: i + 1 })
            .eq('id', remainingQueue[i].id);
        }

        showAlert(`Cancelled booking. Slot ${record.parking_slots?.slot_number} assigned to queued vehicle ${nextWaiting.vehicles?.vehicle_number}.`, 'info');
      } else {
        // Free slot
        await supabase
          .from('parking_slots')
          .update({ status: 'available' })
          .eq('id', record.slot_id);
      }

      fetchData();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  // Determine slot availability based on vehicle selection
  const selectedVehicleObj = vehicles.find(v => v.id === Number(selectedVehicleId));
  const requiredSlotType = selectedVehicleObj ? getRequiredSlotType(selectedVehicleObj.vehicle_type) : null;
  
  const availableSlotsForSelected = slots.filter(
    s => s.status === 'available' && s.slot_type === requiredSlotType
  );

  const isLotFullForSelected = selectedVehicleObj && availableSlotsForSelected.length === 0;

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-white fw-bold mb-0">Book Parking Slot</h2>
        <button className="btn btn-outline-primary" onClick={fetchData}>
          <i className="bi bi-arrow-clockwise me-1"></i> Refresh
        </button>
      </div>

      {alert.show && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
          {alert.type === 'danger' ? <i className="bi bi-exclamation-triangle-fill me-2"></i> : <i className="bi bi-check-circle-fill me-2"></i>}
          {alert.message}
          <button type="button" className="btn-close" onClick={() => setAlert({ ...alert, show: false })}></button>
        </div>
      )}

      {/* Booking Form and Active Slots */}
      <div className="row g-4">
        {/* Booking Card */}
        <div className="col-lg-5">
          <div className="card border-0 text-white p-4" style={{ background: '#191c24' }}>
            <h5 className="fw-bold mb-3"><i className="bi bi-calendar-check me-2 text-primary"></i>Reserve Slot</h5>
            
            {vehicles.length === 0 ? (
              <div className="text-center py-4 text-secondary">
                <p>You need to register a vehicle first before reserving slots.</p>
                <a href="/user/vehicles" className="btn btn-primary btn-sm">Add a Vehicle</a>
              </div>
            ) : (
              <form onSubmit={handleBookSlot}>
                {/* Select Vehicle */}
                <div className="mb-3">
                  <label className="form-label text-secondary small fw-bold">Select Your Vehicle</label>
                  <select 
                    className="form-select bg-dark border-secondary text-white font-monospace"
                    value={selectedVehicleId}
                    onChange={(e) => {
                      setSelectedVehicleId(e.target.value);
                      setSelectedSlotId('');
                    }}
                    required
                  >
                    <option value="">-- Select Vehicle --</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.vehicle_number} ({v.vehicle_type})</option>
                    ))}
                  </select>
                </div>

                {/* Conditional Slot Picker */}
                {selectedVehicleObj && (
                  <div className="mb-4">
                    {isLotFullForSelected ? (
                      <div className="p-3 rounded border border-warning text-center" style={{ background: 'rgba(255, 193, 7, 0.05)' }}>
                        <div className="text-warning mb-2 fw-bold">
                          <i className="bi bi-exclamation-circle me-1"></i>
                          All {requiredSlotType} slots are FULL!
                        </div>
                        <button 
                          type="button" 
                          className="btn btn-warning btn-sm fw-bold w-100"
                          onClick={() => handleJoinQueue(selectedVehicleObj.id, selectedVehicleObj.vehicle_type)}
                        >
                          Join Waiting Queue
                        </button>
                      </div>
                    ) : (
                      <>
                        <label className="form-label text-secondary small fw-bold">Select Available Slot ({requiredSlotType})</label>
                        <select 
                          className="form-select bg-dark border-secondary text-white font-monospace"
                          value={selectedSlotId}
                          onChange={(e) => setSelectedSlotId(e.target.value)}
                          required
                        >
                          <option value="">-- Choose Slot --</option>
                          {availableSlotsForSelected.map(s => (
                            <option key={s.id} value={s.id}>{s.slot_number}</option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn btn-primary w-100 fw-bold"
                  disabled={!selectedSlotId || isLotFullForSelected}
                >
                  Confirm Reservation
                </button>
              </form>
            )}
          </div>

          {/* Active Bookings list to cancel */}
          {activeParking.length > 0 && (
            <div className="card border-0 text-white p-4 mt-4" style={{ background: '#191c24' }}>
              <h5 className="fw-bold mb-3 text-success">Your Active Parkings</h5>
              {activeParking.map(rec => (
                <div key={rec.id} className="p-3 mb-2 rounded border border-secondary d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="fw-bold font-monospace mb-1">{rec.vehicles?.vehicle_number}</h6>
                    <small className="text-muted d-block">Slot: {rec.parking_slots?.slot_number}</small>
                  </div>
                  <button 
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleCancelBooking(rec)}
                  >
                    Cancel Booking
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Slot Overview Grid */}
        <div className="col-lg-7">
          <div className="card border-0 text-white p-4 h-100" style={{ background: '#191c24' }}>
            <h5 className="fw-bold mb-4">Parking Slots Availability</h5>
            <div className="row g-3">
              {slots.map(s => (
                <div key={s.id} className="col-6 col-sm-4">
                  <div 
                    className="p-3 text-center rounded border"
                    style={{
                      background: s.status === 'available' ? 'rgba(40, 167, 69, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      borderColor: s.status === 'available' ? '#28a745' : 'rgba(255,255,255,0.1)'
                    }}
                  >
                    <div className="font-monospace fw-bold text-warning">{s.slot_number}</div>
                    <div className="text-secondary small mt-1" style={{ fontSize: '0.75rem' }}>{s.slot_type}</div>
                    <span className={`badge ${s.status === 'available' ? 'bg-success' : 'bg-secondary'} small mt-2`}>
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
