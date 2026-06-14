import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';

export default function AdminReports() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // all, daily, weekly, monthly
  
  // Aggregate Metrics
  const [metrics, setMetrics] = useState({
    totalCount: 0,
    totalHours: 0,
    totalRevenue: 0,
    avgFee: 0
  });

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parking_records')
        .select('*, vehicles(*, users(*)), parking_slots(*)')
        .eq('status', 'completed')
        .order('exit_time', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    if (records.length === 0) return;

    // Filter records based on selected timeframe
    const now = new Date();
    const filtered = records.filter(r => {
      const exitDate = new Date(r.exit_time);
      const diffTime = Math.abs(now - exitDate);
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (filterType === 'daily') return diffDays <= 1;
      if (filterType === 'weekly') return diffDays <= 7;
      if (filterType === 'monthly') return diffDays <= 30;
      return true; // 'all'
    });

    // Compute aggregations
    const count = filtered.length;
    const hours = filtered.reduce((sum, r) => sum + Number(r.total_hours || 0), 0);
    const revenue = filtered.reduce((sum, r) => sum + Number(r.parking_fee || 0), 0);
    const avg = count > 0 ? (revenue / count).toFixed(2) : 0;

    setMetrics({
      totalCount: count,
      totalHours: hours.toFixed(1),
      totalRevenue: revenue,
      avgFee: avg
    });

  }, [records, filterType]);

  const getFilteredRecords = () => {
    const now = new Date();
    return records.filter(r => {
      const exitDate = new Date(r.exit_time);
      const diffTime = Math.abs(now - exitDate);
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (filterType === 'daily') return diffDays <= 1;
      if (filterType === 'weekly') return diffDays <= 7;
      if (filterType === 'monthly') return diffDays <= 30;
      return true;
    });
  };

  return (
    <div className="container-fluid p-0">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
        <h2 className="text-white fw-bold mb-0">System Reports</h2>
        
        {/* Time Filter Buttons */}
        <div className="btn-group border border-secondary p-1 rounded" style={{ background: '#191c24' }}>
          <button 
            className={`btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-dark text-white border-0'}`} 
            onClick={() => setFilterType('all')}
          >
            All Time
          </button>
          <button 
            className={`btn btn-sm ${filterType === 'daily' ? 'btn-primary' : 'btn-dark text-white border-0'}`} 
            onClick={() => setFilterType('daily')}
          >
            Daily
          </button>
          <button 
            className={`btn btn-sm ${filterType === 'weekly' ? 'btn-primary' : 'btn-dark text-white border-0'}`} 
            onClick={() => setFilterType('weekly')}
          >
            Weekly
          </button>
          <button 
            className={`btn btn-sm ${filterType === 'monthly' ? 'btn-primary' : 'btn-dark text-white border-0'}`} 
            onClick={() => setFilterType('monthly')}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Aggregate Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <div className="card border-0 text-white p-3 text-center" style={{ background: '#191c24' }}>
            <h6 className="text-secondary small fw-bold mb-1">Total Exits</h6>
            <h3 className="fw-bold mb-0 text-primary">{metrics.totalCount}</h3>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 text-white p-3 text-center" style={{ background: '#191c24' }}>
            <h6 className="text-secondary small fw-bold mb-1">Total Hours</h6>
            <h3 className="fw-bold mb-0 text-info">{metrics.totalHours} hrs</h3>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 text-white p-3 text-center" style={{ background: '#191c24' }}>
            <h6 className="text-secondary small fw-bold mb-1">Total Revenue</h6>
            <h3 className="fw-bold mb-0 text-success">₹{metrics.totalRevenue}</h3>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card border-0 text-white p-3 text-center" style={{ background: '#191c24' }}>
            <h6 className="text-secondary small fw-bold mb-1">Average Fee</h6>
            <h3 className="fw-bold mb-0 text-warning">₹{metrics.avgFee}</h3>
          </div>
        </div>
      </div>

      {/* Report Records Table */}
      <div className="card border-0 text-white p-4" style={{ background: '#191c24' }}>
        <h5 className="fw-bold mb-4">
          <i className="bi bi-file-text me-2 text-primary"></i>
          Audit Logs ({getFilteredRecords().length} Records)
        </h5>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : getFilteredRecords().length === 0 ? (
          <div className="text-center text-muted py-5">
            No completed transaction logs found for this timeframe.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover table-dark align-middle">
              <thead>
                <tr className="text-secondary small border-secondary">
                  <th>ID</th>
                  <th>Vehicle Number</th>
                  <th>Type</th>
                  <th>Slot</th>
                  <th>Owner</th>
                  <th>Entry Time</th>
                  <th>Exit Time</th>
                  <th>Duration</th>
                  <th className="text-end">Fee Collected</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredRecords().map(rec => (
                  <tr key={rec.id} className="border-secondary small">
                    <td className="font-monospace text-muted">#{rec.id}</td>
                    <td>
                      <span className="badge bg-secondary font-monospace p-2">{rec.vehicles?.vehicle_number}</span>
                    </td>
                    <td>{rec.vehicles?.vehicle_type}</td>
                    <td className="fw-bold text-warning font-monospace">{rec.parking_slots?.slot_number || 'N/A'}</td>
                    <td>{rec.vehicles?.users?.name || 'Guest'}</td>
                    <td className="text-muted">{new Date(rec.entry_time).toLocaleString()}</td>
                    <td className="text-muted">{new Date(rec.exit_time).toLocaleString()}</td>
                    <td>{rec.total_hours} hrs</td>
                    <td className="text-end fw-bold text-success">₹{rec.parking_fee}</td>
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
