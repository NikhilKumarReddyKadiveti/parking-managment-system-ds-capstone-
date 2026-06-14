import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';

export default function UserHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch user's vehicles
      const { data: vData } = await supabase
        .from('vehicles')
        .select('id')
        .eq('user_id', user.id);

      const vehicleIds = (vData || []).map(v => v.id);

      if (vehicleIds.length > 0) {
        // 2. Fetch records
        const { data: recData, error } = await supabase
          .from('parking_records')
          .select('*, vehicles(*), parking_slots(*)')
          .in('vehicle_id', vehicleIds)
          .order('entry_time', { ascending: false });

        if (error) throw error;
        setRecords(recData || []);
      }
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-white fw-bold mb-0">My Parking History</h2>
        <button className="btn btn-outline-primary" onClick={fetchHistory}>
          <i className="bi bi-arrow-clockwise me-1"></i> Sync logs
        </button>
      </div>

      <div className="card border-0 text-white p-4" style={{ background: '#191c24' }}>
        <h5 className="fw-bold mb-4">
          <i className="bi bi-clock-history me-2 text-primary"></i>
          Chronological Logs
        </h5>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center text-muted py-5">
            No parking transactions logged.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover table-dark align-middle">
              <thead>
                <tr className="text-secondary small border-secondary">
                  <th>ID</th>
                  <th>Vehicle Number</th>
                  <th>Type</th>
                  <th>Slot Number</th>
                  <th>Entry Time</th>
                  <th>Exit Time</th>
                  <th>Duration</th>
                  <th>Fee Paid</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map(rec => (
                  <tr key={rec.id} className="border-secondary small">
                    <td className="font-monospace text-muted">#{rec.id}</td>
                    <td>
                      <span className="badge bg-secondary font-monospace p-2">{rec.vehicles?.vehicle_number}</span>
                    </td>
                    <td>{rec.vehicles?.vehicle_type}</td>
                    <td className="fw-bold text-warning font-monospace">{rec.parking_slots?.slot_number || 'N/A'}</td>
                    <td className="text-muted">{new Date(rec.entry_time).toLocaleString()}</td>
                    <td className="text-muted">
                      {rec.exit_time ? new Date(rec.exit_time).toLocaleString() : '--'}
                    </td>
                    <td>{rec.total_hours ? `${rec.total_hours} hrs` : '--'}</td>
                    <td className="fw-bold text-success">
                      {rec.parking_fee ? `₹${rec.parking_fee}` : '₹0'}
                    </td>
                    <td>
                      <span className={`badge ${
                        rec.status === 'active' ? 'bg-success' : rec.status === 'completed' ? 'bg-secondary' : 'bg-danger'
                      } small`}>
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
