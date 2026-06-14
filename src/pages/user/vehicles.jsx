import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';

export default function UserVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Car');
  const [editingVehicle, setEditingVehicle] = useState(null);

  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => {
      setAlert({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    if (!vehicleNumber.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User session not found.');

      const { error } = await supabase
        .from('vehicles')
        .insert([{
          user_id: user.id,
          vehicle_number: vehicleNumber.trim().toUpperCase(),
          vehicle_type: vehicleType
        }]);

      if (error) throw error;

      showAlert(`Vehicle ${vehicleNumber.toUpperCase()} added successfully!`);
      setVehicleNumber('');
      fetchVehicles();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  const handleUpdateVehicle = async (e) => {
    e.preventDefault();
    if (!editingVehicle) return;

    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          vehicle_number: editingVehicle.vehicle_number.toUpperCase(),
          vehicle_type: editingVehicle.vehicle_type
        })
        .eq('id', editingVehicle.id);

      if (error) throw error;

      showAlert(`Vehicle ${editingVehicle.vehicle_number} updated successfully!`);
      setEditingVehicle(null);
      fetchVehicles();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  const handleDeleteVehicle = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle register? All active logs for this vehicle will also be removed.')) return;

    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showAlert('Vehicle deleted successfully.');
      fetchVehicles();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-white fw-bold mb-0">My Vehicles</h2>
        <span className="badge bg-primary fs-6 font-monospace">{vehicles.length} Registered</span>
      </div>

      {alert.show && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
          {alert.type === 'danger' ? <i className="bi bi-exclamation-triangle-fill me-2"></i> : <i className="bi bi-check-circle-fill me-2"></i>}
          {alert.message}
          <button type="button" className="btn-close" onClick={() => setAlert({ ...alert, show: false })}></button>
        </div>
      )}

      <div className="row g-4">
        {/* Registration Form */}
        <div className="col-lg-4">
          <div className="card border-0 text-white p-4" style={{ background: '#151921' }}>
            <h5 className="fw-bold mb-3">
              <i className="bi bi-plus-circle me-2 text-primary"></i>
              {editingVehicle ? 'Edit Vehicle' : 'Register Vehicle'}
            </h5>

            {editingVehicle ? (
              <form onSubmit={handleUpdateVehicle}>
                <div className="mb-3">
                  <label className="form-label text-light opacity-75 small fw-bold">Vehicle Number</label>
                  <input 
                    type="text" 
                    className="form-control bg-dark border-secondary text-white font-monospace" 
                    value={editingVehicle.vehicle_number}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, vehicle_number: e.target.value })}
                    required 
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label text-light opacity-75 small fw-bold">Vehicle Type</label>
                  <select 
                    className="form-select bg-dark border-secondary text-white"
                    value={editingVehicle.vehicle_type}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, vehicle_type: e.target.value })}
                  >
                    <option value="Car">Car</option>
                    <option value="Bike">Bike</option>
                    <option value="Truck">Truck</option>
                  </select>
                </div>
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary w-100 fw-bold shadow-sm">Save Changes</button>
                  <button type="button" className="btn btn-outline-secondary w-100" onClick={() => setEditingVehicle(null)}>Cancel</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddVehicle}>
                <div className="mb-3">
                  <label className="form-label text-light opacity-75 small fw-bold">Vehicle Number</label>
                  <input 
                    type="text" 
                    className="form-control bg-dark border-secondary text-white font-monospace" 
                    placeholder="e.g. KA03MC1234" 
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    required 
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label text-light opacity-75 small fw-bold">Vehicle Type</label>
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
                <button type="submit" className="btn btn-primary w-100 fw-bold shadow-sm">
                  Add Vehicle
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Vehicles List */}
        <div className="col-lg-8">
          <div className="card border-0 text-white p-4" style={{ background: '#151921' }}>
            <h5 className="fw-bold mb-4">My Registered Vehicles</h5>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : vehicles.length === 0 ? (
              <div className="text-center text-light opacity-50 py-5">
                No vehicles registered. Use the form to add your first vehicle.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover table-dark align-middle">
                  <thead>
                    <tr className="text-light opacity-75 small border-secondary">
                      <th>Vehicle Number</th>
                      <th>Vehicle Type</th>
                      <th>Created At</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map(v => (
                      <tr key={v.id} className="border-secondary">
                        <td>
                          <span className="badge bg-secondary font-monospace p-2 fs-6">{v.vehicle_number}</span>
                        </td>
                        <td className="text-light">{v.vehicle_type}</td>
                        <td className="text-light opacity-50 small">
                          {new Date(v.created_at).toLocaleDateString()}
                        </td>
                        <td className="text-end">
                          <button 
                            className="btn btn-outline-info btn-sm me-2"
                            onClick={() => setEditingVehicle(v)}
                          >
                            <i className="bi bi-pencil-square"></i> Edit
                          </button>
                          <button 
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleDeleteVehicle(v.id)}
                          >
                            <i className="bi bi-trash"></i> Delete
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
