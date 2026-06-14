import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { HashTable } from '../../utils/dataStructures';

export default function AdminVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [slots, setSlots] = useState([]);
  const [activeParking, setActiveParking] = useState([]);
  const [queue, setQueue] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  
  // Entry Form States
  const [selectedUserId, setSelectedUserId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Car');

  // New Vehicle and Owner Form (In case the owner doesn't exist yet)
  const [showAddOwnerForm, setShowAddOwnerForm] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');

  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Users
      const { data: usersData } = await supabase.from('users').select('*').order('name');
      setUsers(usersData || []);

      // 2. Fetch Vehicles
      const { data: vehiclesData } = await supabase.from('vehicles').select('*, users(*)');
      setVehicles(vehiclesData || []);

      // 3. Fetch Slots
      const { data: slotsData } = await supabase.from('parking_slots').select('*').order('slot_number');
      setSlots(slotsData || []);

      // 4. Fetch Active Parking Records
      const { data: parkingData } = await supabase
        .from('parking_records')
        .select('*, vehicles(*, users(*)), parking_slots(*)')
        .eq('status', 'active')
        .order('entry_time', { ascending: false });
      setActiveParking(parkingData || []);

      // 5. Fetch Waiting Queue
      const { data: queueData } = await supabase
        .from('waiting_queue')
        .select('*, vehicles(*, users(*))')
        .order('queue_position', { ascending: true });
      setQueue(queueData || []);

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

  // 1. Search Logic using custom HashTable
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResult(null);
      return;
    }

    // Initialize HashTable of size 7
    const ht = new HashTable(7);
    vehicles.forEach(v => {
      ht.insert(v.vehicle_number.toUpperCase(), {
        vehicle_id: v.id,
        vehicle_number: v.vehicle_number,
        vehicle_type: v.vehicle_type,
        owner_name: v.users?.name || 'Unknown',
        owner_phone: v.users?.phone || 'Unknown',
        owner_email: v.users?.email || 'Unknown',
        created_at: v.created_at
      });
    });

    const searchKey = searchQuery.trim().toUpperCase();
    const result = ht.search(searchKey);
    setSearchResult({
      query: searchKey,
      found: result.value !== null,
      data: result.value,
      bucketIndex: result.bucketIndex,
      chainPosition: result.chainPosition,
      steps: result.steps
    });
  };

  // Create Guest / Admin user if needed
  const handleCreateOwner = async (e) => {
    e.preventDefault();
    if (!newOwnerName || !newOwnerEmail || !newOwnerPhone) return;

    try {
      // Create a dummy auth user on Supabase auth.users is hard without signup,
      // so we will create a profile directly in public.users using a random UUID
      // representing a guest user added by Admin
      const guestId = crypto.randomUUID();
      const { error } = await supabase.from('users').insert([{
        id: guestId,
        name: newOwnerName,
        email: newOwnerEmail,
        phone: newOwnerPhone,
        role: 'user'
      }]);

      if (error) throw error;

      showAlert(`Owner "${newOwnerName}" registered!`);
      setNewOwnerName('');
      setNewOwnerEmail('');
      setNewOwnerPhone('');
      setShowAddOwnerForm(false);
      fetchData();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  // Helper to map vehicle types to slot types
  const getRequiredSlotType = (vType) => {
    if (vType === 'Bike') return 'Two-Wheeler';
    if (vType === 'Truck') return 'Heavy-Vehicle';
    return 'Four-Wheeler'; // Car
  };

  // 2. Vehicle Entry Logic
  const handleVehicleEntry = async (e) => {
    e.preventDefault();
    if (!selectedUserId || !vehicleNumber.trim()) return;

    const vNum = vehicleNumber.trim().toUpperCase();
    const requiredType = getRequiredSlotType(vehicleType);

    try {
      // Find if vehicle already exists in db, otherwise insert it
      let vehicleId;
      const existingVehicle = vehicles.find(v => v.vehicle_number === vNum);
      
      if (existingVehicle) {
        vehicleId = existingVehicle.id;
      } else {
        const { data: newV, error: vErr } = await supabase
          .from('vehicles')
          .insert([{
            user_id: selectedUserId,
            vehicle_number: vNum,
            vehicle_type: vehicleType
          }])
          .select()
          .single();
        if (vErr) throw vErr;
        vehicleId = newV.id;
      }

      // Check if vehicle is already parked/active
      const isParked = activeParking.some(p => p.vehicle_id === vehicleId);
      const isQueued = queue.some(q => q.vehicle_id === vehicleId);
      if (isParked || isQueued) {
        throw new Error('Vehicle is already active in the parking lot or waiting queue.');
      }

      // Check if there is an available slot of required type
      const availableSlot = slots.find(s => s.slot_type === requiredType && s.status === 'available');

      if (availableSlot) {
        // A. Allocate slot (occupied)
        const { error: slotErr } = await supabase
          .from('parking_slots')
          .update({ status: 'occupied' })
          .eq('id', availableSlot.id);
        if (slotErr) throw slotErr;

        // B. Create parking record
        const { error: recordErr } = await supabase
          .from('parking_records')
          .insert([{
            vehicle_id: vehicleId,
            slot_id: availableSlot.id,
            entry_time: new Date().toISOString(),
            status: 'active'
          }]);
        if (recordErr) throw recordErr;

        showAlert(`Vehicle ${vNum} parked successfully in Slot ${availableSlot.slot_number}!`);
      } else {
        // No slots available -> ADD TO WAITING QUEUE (Queue data structure logic)
        const nextPosition = queue.length > 0 ? Math.max(...queue.map(q => q.queue_position)) + 1 : 1;
        
        const { error: qErr } = await supabase
          .from('waiting_queue')
          .insert([{
            vehicle_id: vehicleId,
            queue_position: nextPosition,
            created_at: new Date().toISOString()
          }]);
        if (qErr) throw qErr;

        showAlert(`Parking is FULL for ${requiredType}s! Vehicle ${vNum} added to waiting queue at Position #${nextPosition}.`, 'warning');
      }

      // Reset Form and refresh
      setVehicleNumber('');
      fetchData();

    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  // Fee calculation helper: First Hour = ₹20, Additional Hour = ₹10
  const calculateFee = (entryTimeISO) => {
    const entry = new Date(entryTimeISO);
    const exit = new Date();
    const durationMs = exit - entry;
    // Calculate total hours, rounding fractions up to the nearest hour. Minimum 1 hour.
    const totalHours = Math.max(1, Math.ceil(durationMs / 3600000));
    const parkingFee = 20 + Math.max(0, totalHours - 1) * 10;
    return {
      hours: totalHours,
      fee: parkingFee,
      durationText: `${(durationMs / 3600000).toFixed(2)} hours`
    };
  };

  // 3. Vehicle Exit and Queue Shifting Logic
  const handleVehicleExit = async (record) => {
    const { hours, fee } = calculateFee(record.entry_time);
    const exitTime = new Date().toISOString();
    const slotId = record.slot_id;
    const slotNumber = record.parking_slots?.slot_number;
    const slotType = record.parking_slots?.slot_type;

    if (!window.confirm(`Vehicle ${record.vehicles?.vehicle_number} is exiting slot ${slotNumber}.\nDuration: ${hours} hours.\nTotal Fee: ₹${fee}.\n\nProcess Exit?`)) {
      return;
    }

    try {
      // A. Close the active parking record
      const { error: recErr } = await supabase
        .from('parking_records')
        .update({
          exit_time: exitTime,
          total_hours: hours,
          parking_fee: fee,
          status: 'completed'
        })
        .eq('id', record.id);
      if (recErr) throw recErr;

      showAlert(`Vehicle ${record.vehicles?.vehicle_number} exited slot ${slotNumber}. Fee: ₹${fee} collected.`);

      // B. Check if there are vehicles of the matching type waiting in queue
      // First, get queue list sorted by position
      const matchingWaiting = queue.filter(q => getRequiredSlotType(q.vehicles?.vehicle_type) === slotType);

      if (matchingWaiting.length > 0) {
        // Queue Dequeue & Slot Re-assignment!
        const nextWaitingItem = matchingWaiting[0]; // First in line

        // 1. Remove from waiting queue
        const { error: delQueueErr } = await supabase
          .from('waiting_queue')
          .delete()
          .eq('id', nextWaitingItem.id);
        if (delQueueErr) throw delQueueErr;

        // 2. Insert new active parking record for the dequeued vehicle in this same slot
        const { error: newRecErr } = await supabase
          .from('parking_records')
          .insert([{
            vehicle_id: nextWaitingItem.vehicle_id,
            slot_id: slotId,
            entry_time: new Date().toISOString(),
            status: 'active'
          }]);
        if (newRecErr) throw newRecErr;

        // 3. Shift remaining queue positions down for matching types
        // (For simplicity we shift all queue positions down globally to maintain clean increments)
        const remainingQueue = queue.filter(q => q.id !== nextWaitingItem.id);
        for (let i = 0; i < remainingQueue.length; i++) {
          await supabase
            .from('waiting_queue')
            .update({ queue_position: i + 1 })
            .eq('id', remainingQueue[i].id);
        }

        showAlert(`Slot ${slotNumber} reassigned! Dequeued vehicle ${nextWaitingItem.vehicles?.vehicle_number} and parked it.`, 'info');
      } else {
        // No vehicles waiting -> Set slot status back to 'available'
        const { error: slotErr } = await supabase
          .from('parking_slots')
          .update({ status: 'available' })
          .eq('id', slotId);
        if (slotErr) throw slotErr;
      }

      fetchData();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-white fw-bold mb-0">Vehicle Monitoring</h2>
        <button className="btn btn-outline-primary" onClick={fetchData}>
          <i className="bi bi-arrow-clockwise me-1"></i> Sync
        </button>
      </div>

      {alert.show && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
          {alert.type === 'danger' ? <i className="bi bi-exclamation-triangle-fill me-2"></i> : <i className="bi bi-info-circle-fill me-2"></i>}
          {alert.message}
          <button type="button" className="btn-close" onClick={() => setAlert({ ...alert, show: false })}></button>
        </div>
      )}

      {/* Hash Table Search and Owner Creation */}
      <div className="row g-4 mb-4">
        {/* Search Panel */}
        <div className="col-md-7">
          <div className="card border-0 text-white p-4 h-100" style={{ background: '#191c24' }}>
            <h5 className="fw-bold mb-3">
              <i className="bi bi-search me-2 text-primary"></i>
              Find Vehicle Registry
            </h5>
            <form onSubmit={handleSearch} className="mb-4">
              <div className="input-group">
                <input 
                  type="text" 
                  className="form-control bg-dark border-secondary text-white" 
                  placeholder="Enter Vehicle Number (e.g. MH12AB1234)" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  required 
                />
                <button type="submit" className="btn btn-primary fw-bold">Search</button>
              </div>
            </form>

            {searchResult && (
              <div className="p-3 rounded border border-secondary" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                {searchResult.found ? (
                  <div>
                    <span className="badge bg-success mb-2">Vehicle Found</span>
                    <div className="row g-2 small">
                      <div className="col-6"><strong>Number:</strong> <span className="text-warning">{searchResult.data.vehicle_number}</span></div>
                      <div className="col-6"><strong>Type:</strong> {searchResult.data.vehicle_type}</div>
                      <div className="col-6"><strong>Owner:</strong> {searchResult.data.owner_name}</div>
                      <div className="col-6"><strong>Phone:</strong> {searchResult.data.owner_phone}</div>
                      <div className="col-12 mt-2 border-top border-secondary pt-2 text-muted text-center" style={{ fontSize: '0.75rem' }}>
                        <i className="bi bi-info-circle me-1"></i>
                        Registry Partition: <code>{searchResult.bucketIndex}</code> | 
                        Storage Offset: <code>{searchResult.chainPosition}</code> | 
                        Query Steps: <code>{searchResult.steps}</code>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2 text-danger fw-bold">
                    <i className="bi bi-x-circle me-2"></i>
                    Vehicle "{searchResult.query}" not found in system registers.
                    <div className="text-muted small font-monospace mt-2">
                      Registry Partition: {searchResult.bucketIndex} | Steps Checked: {searchResult.steps}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Add Owner Modal / Card */}
        <div className="col-md-5">
          <div className="card border-0 text-white p-4 h-100" style={{ background: '#191c24' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0">
                <i className="bi bi-person-plus me-2 text-success"></i>
                Quick Register Owner
              </h5>
              <button 
                className={`btn btn-sm ${showAddOwnerForm ? 'btn-secondary' : 'btn-outline-primary'}`} 
                onClick={() => setShowAddOwnerForm(!showAddOwnerForm)}
              >
                {showAddOwnerForm ? 'Hide' : 'Show Form'}
              </button>
            </div>

            {showAddOwnerForm ? (
              <form onSubmit={handleCreateOwner}>
                <div className="mb-2">
                  <input 
                    type="text" 
                    className="form-control form-control-sm bg-dark border-secondary text-white" 
                    placeholder="Full Name" 
                    value={newOwnerName} 
                    onChange={e => setNewOwnerName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="mb-2">
                  <input 
                    type="email" 
                    className="form-control form-control-sm bg-dark border-secondary text-white" 
                    placeholder="Email Address" 
                    value={newOwnerEmail} 
                    onChange={e => setNewOwnerEmail(e.target.value)} 
                    required 
                  />
                </div>
                <div className="mb-3">
                  <input 
                    type="tel" 
                    className="form-control form-control-sm bg-dark border-secondary text-white" 
                    placeholder="Phone Number" 
                    value={newOwnerPhone} 
                    onChange={e => setNewOwnerPhone(e.target.value)} 
                    required 
                  />
                </div>
                <button type="submit" className="btn btn-success btn-sm w-100 fw-bold">Register Owner Profile</button>
              </form>
            ) : (
              <p className="text-secondary small mb-0">
                Admins can register standard user/owner profiles directly. Once registered, their vehicles can be logged into active parking slots or waiting lists using the Vehicle Entry form below.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Entry Forms and Active Logs */}
      <div className="row g-4">
        {/* Entry Forms */}
        <div className="col-lg-4">
          <div className="card border-0 text-white p-4" style={{ background: '#191c24' }}>
            <h5 className="fw-bold mb-3">
              <i className="bi bi-box-arrow-in-right me-2 text-success"></i>
              Vehicle Entry
            </h5>
            <form onSubmit={handleVehicleEntry}>
              <div className="mb-3">
                <label className="form-label text-secondary small fw-bold">Select Vehicle Owner</label>
                <select 
                  className="form-select bg-dark border-secondary text-white"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Owner --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.phone})</option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label text-secondary small fw-bold">Vehicle Number</label>
                <input 
                  type="text" 
                  className="form-control bg-dark border-secondary text-white font-monospace" 
                  placeholder="e.g. KA-03-MC-1234" 
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  required 
                />
              </div>

              <div className="mb-4">
                <label className="form-label text-secondary small fw-bold">Vehicle Type</label>
                <select 
                  className="form-select bg-dark border-secondary text-white"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                >
                  <option value="Car">Car (Four-Wheeler)</option>
                  <option value="Bike">Bike (Two-Wheeler)</option>
                  <option value="Truck">Truck (Heavy-Vehicle)</option>
                </select>
              </div>

              <button type="submit" className="btn btn-success w-100 fw-bold">
                Log Entry / Enqueue
              </button>
            </form>
          </div>
        </div>

        {/* Active Parking Records */}
        <div className="col-lg-8">
          <div className="card border-0 text-white p-4 h-100" style={{ background: '#191c24' }}>
            <h5 className="fw-bold mb-4"><i className="bi bi-car-front me-2 text-primary"></i>Active Parked Vehicles</h5>
            
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : activeParking.length === 0 ? (
              <div className="text-center text-muted py-5">
                No vehicles currently parked.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover table-dark align-middle">
                  <thead>
                    <tr className="text-secondary small border-secondary">
                      <th>Slot</th>
                      <th>Vehicle Number</th>
                      <th>Type</th>
                      <th>Owner</th>
                      <th>Entry Time</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeParking.map(record => (
                      <tr key={record.id} className="border-secondary">
                        <td className="fw-bold text-warning font-monospace">{record.parking_slots?.slot_number}</td>
                        <td>
                          <span className="badge bg-secondary font-monospace p-2">{record.vehicles?.vehicle_number}</span>
                        </td>
                        <td>{record.vehicles?.vehicle_type}</td>
                        <td>
                          <div className="fw-bold">{record.vehicles?.users?.name}</div>
                          <small className="text-muted small">{record.vehicles?.users?.phone}</small>
                        </td>
                        <td className="small text-muted">{new Date(record.entry_time).toLocaleString()}</td>
                        <td className="text-end">
                          <button 
                            className="btn btn-danger btn-sm fw-bold px-3"
                            onClick={() => handleVehicleExit(record)}
                          >
                            <i className="bi bi-box-arrow-left me-1"></i> Exit / Collect
                          </button>
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
    </div>
  );
}
