import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';

export default function AdminSlots() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form States
  const [slotNumber, setSlotNumber] = useState('');
  const [slotType, setSlotType] = useState('Four-Wheeler');
  const [editingSlot, setEditingSlot] = useState(null);
  
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parking_slots')
        .select('*')
        .order('slot_number', { ascending: true });
      if (error) throw error;
      setSlots(data || []);
    } catch (error) {
      showAlert(error.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => {
      setAlert({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!slotNumber.trim()) return;

    try {
      const { error } = await supabase
        .from('parking_slots')
        .insert([{ 
          slot_number: slotNumber.toUpperCase(), 
          slot_type: slotType, 
          status: 'available' 
        }]);

      if (error) throw error;

      showAlert(`Slot ${slotNumber.toUpperCase()} added successfully!`);
      setSlotNumber('');
      fetchSlots();
    } catch (error) {
      showAlert(error.message, 'danger');
    }
  };

  const handleUpdateSlot = async (e) => {
    e.preventDefault();
    if (!editingSlot) return;

    try {
      const { error } = await supabase
        .from('parking_slots')
        .update({ 
          slot_number: editingSlot.slot_number.toUpperCase(), 
          slot_type: editingSlot.slot_type,
          status: editingSlot.status
        })
        .eq('id', editingSlot.id);

      if (error) throw error;

      showAlert(`Slot ${editingSlot.slot_number} updated successfully!`);
      setEditingSlot(null);
      fetchSlots();
    } catch (error) {
      showAlert(error.message, 'danger');
    }
  };

  const handleDeleteSlot = async (id) => {
    if (!window.confirm('Are you sure you want to delete this parking slot?')) return;

    try {
      const { error } = await supabase
        .from('parking_slots')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showAlert('Slot deleted successfully!');
      fetchSlots();
    } catch (error) {
      showAlert(error.message, 'danger');
    }
  };

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-white fw-bold mb-0">Slot Management</h2>
        <span className="badge bg-primary fs-6 font-monospace">{slots.length} Total Slots</span>
      </div>

      {alert.show && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
          {alert.type === 'danger' ? <i className="bi bi-exclamation-triangle-fill me-2"></i> : <i className="bi bi-check-circle-fill me-2"></i>}
          {alert.message}
          <button type="button" className="btn-close" onClick={() => setAlert({ ...alert, show: false })}></button>
        </div>
      )}

      <div className="row g-4">
        {/* Slot Creation Form */}
        <div className="col-lg-4">
          <div className="card border-0 text-white p-4" style={{ background: '#151921' }}>
            <h5 className="fw-bold mb-3">
              <i className="bi bi-plus-circle me-2 text-primary"></i>
              {editingSlot ? 'Edit Slot' : 'Add Parking Slot'}
            </h5>
            
            {editingSlot ? (
              <form onSubmit={handleUpdateSlot}>
                <div className="mb-3">
                  <label className="form-label text-light opacity-75 small fw-bold">Slot Number</label>
                  <input 
                    type="text" 
                    className="form-control bg-dark border-secondary text-white" 
                    value={editingSlot.slot_number}
                    onChange={(e) => setEditingSlot({ ...editingSlot, slot_number: e.target.value })}
                    required 
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label text-light opacity-75 small fw-bold">Slot Type</label>
                  <select 
                    className="form-select bg-dark border-secondary text-white"
                    value={editingSlot.slot_type}
                    onChange={(e) => setEditingSlot({ ...editingSlot, slot_type: e.target.value })}
                  >
                    <option value="Two-Wheeler">Two-Wheeler</option>
                    <option value="Four-Wheeler">Four-Wheeler</option>
                    <option value="Heavy-Vehicle">Heavy-Vehicle</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="form-label text-light opacity-75 small fw-bold">Status</label>
                  <select 
                    className="form-select bg-dark border-secondary text-white"
                    value={editingSlot.status}
                    onChange={(e) => setEditingSlot({ ...editingSlot, status: e.target.value })}
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="booked">Booked</option>
                  </select>
                </div>
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary w-100 fw-bold">Update Slot</button>
                  <button type="button" className="btn btn-outline-secondary w-100" onClick={() => setEditingSlot(null)}>Cancel</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddSlot}>
                <div className="mb-3">
                  <label className="form-label text-light opacity-75 small fw-bold">Slot Number</label>
                  <input 
                    type="text" 
                    className="form-control bg-dark border-secondary text-white" 
                    placeholder="e.g. A101" 
                    value={slotNumber}
                    onChange={(e) => setSlotNumber(e.target.value)}
                    required 
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label text-light opacity-75 small fw-bold">Slot Type</label>
                  <select 
                    className="form-select bg-dark border-secondary text-white"
                    value={slotType}
                    onChange={(e) => setSlotType(e.target.value)}
                  >
                    <option value="Two-Wheeler">Two-Wheeler (Bike)</option>
                    <option value="Four-Wheeler">Four-Wheeler (Car)</option>
                    <option value="Heavy-Vehicle">Heavy-Vehicle (Truck/Bus)</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary w-100 fw-bold">
                  <i className="bi bi-plus-lg me-1"></i> Add Slot
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Slot List Grid */}
        <div className="col-lg-8">
          <div className="card border-0 text-white p-4" style={{ background: '#151921' }}>
            <h5 className="fw-bold mb-4">Slot Layout Grid</h5>
            
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center text-light opacity-50 py-5">
                No slots configured yet. Use the form to add one.
              </div>
            ) : (
              <div className="row g-3">
                {slots.map(slot => (
                  <div key={slot.id} className="col-sm-6 col-md-4 col-xxl-3">
                    <div 
                      className="card border text-white h-100" 
                      style={{ 
                        background: 'rgba(255,255,255,0.02)',
                        borderColor: slot.status === 'available' ? 'rgba(40,167,69,0.3)' : slot.status === 'occupied' ? 'rgba(220,53,69,0.3)' : 'rgba(255,193,7,0.3)',
                      }}
                    >
                      <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="fw-bold mb-0 font-monospace text-warning">{slot.slot_number}</h6>
                          <span className={`badge ${slot.status === 'available' ? 'bg-success' : slot.status === 'occupied' ? 'bg-danger' : 'bg-warning text-dark'} small`}>
                            {slot.status}
                          </span>
                        </div>
                        <div className="text-light opacity-75 small mb-3">
                          <i className="bi bi-tag me-1"></i> {slot.slot_type}
                        </div>
                        <div className="d-flex justify-content-end gap-2 border-top border-secondary pt-2">
                          <button 
                            className="btn btn-outline-info btn-sm py-1 px-2"
                            onClick={() => setEditingSlot(slot)}
                          >
                            <i className="bi bi-pencil-square"></i>
                          </button>
                          <button 
                            className="btn btn-outline-danger btn-sm py-1 px-2"
                            onClick={() => handleDeleteSlot(slot.id)}
                            disabled={slot.status === 'occupied'}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
