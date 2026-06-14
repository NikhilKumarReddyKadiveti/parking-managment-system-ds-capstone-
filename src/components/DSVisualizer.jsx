import React, { useState, useEffect } from 'react';
import { Queue, Stack, HashTable, LinkedList } from '../utils/dataStructures';

export default function DSVisualizer({ slots = [], queueList = [], activities = [], vehicles = [], records = [] }) {
  const [activeTab, setActiveTab] = useState('slots');

  // Re-build data structures for visual representations
  const [visualQueue, setVisualQueue] = useState([]);
  const [visualStack, setVisualStack] = useState([]);
  const [visualHashTable, setVisualHashTable] = useState([]);
  const [visualLinkedList, setVisualLinkedList] = useState([]);

  useEffect(() => {
    // 1. Rebuild Queue
    const q = new Queue();
    // Sort queueList by position
    const sortedQueue = [...queueList].sort((a, b) => a.queue_position - b.queue_position);
    sortedQueue.forEach(item => {
      q.enqueue(item);
    });
    setVisualQueue(q.toArray());

    // 2. Rebuild Stack
    const st = new Stack(6);
    // Push in chronological order so that peek represents the latest activity
    const sortedActivities = [...activities].reverse();
    sortedActivities.forEach(act => {
      st.push(act);
    });
    setVisualStack(st.toArray()); // Stack toArray returns reverse (newest first)

    // 3. Rebuild Hash Table
    const ht = new HashTable(7);
    vehicles.forEach(v => {
      ht.insert(v.vehicle_number, {
        id: v.id,
        owner: v.users?.name || 'Loading...',
        type: v.vehicle_type
      });
    });
    setVisualHashTable(ht.getVisualData());

    // 4. Rebuild Linked List
    const ll = new LinkedList();
    // Sort records by entry time (chronological order)
    const sortedRecords = [...records].sort((a, b) => new Date(a.entry_time) - new Date(b.entry_time));
    sortedRecords.forEach(rec => {
      ll.append(rec);
    });
    setVisualLinkedList(ll.getVisualStructure());
  }, [slots, queueList, activities, vehicles, records]);

  return (
    <div className="card shadow-lg border-0 mb-4 text-white" style={{ background: 'rgba(25, 28, 36, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <div className="card-header border-bottom border-secondary d-flex justify-content-between align-items-center bg-transparent py-3">
        <h5 className="mb-0 text-primary fw-bold">
          <i className="bi bi-cpu-fill me-2 text-warning"></i>
          System Operations Diagnostics Panel
        </h5>
        <span className="badge bg-secondary">System Mode: Diagnostics</span>
      </div>
      <div className="card-body">
        {/* Navigation tabs */}
        <ul className="nav nav-tabs nav-fill mb-4 border-secondary">
          <li className="nav-item">
            <button 
              className={`nav-link text-white py-2 ${activeTab === 'slots' ? 'active bg-primary border-primary fw-bold' : ''}`}
              onClick={() => setActiveTab('slots')}
              style={{ background: activeTab === 'slots' ? 'var(--bs-primary)' : 'transparent' }}
            >
              <i className="bi bi-grid-3x3-gap me-2"></i>Lot Layout Grid
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link text-white py-2 ${activeTab === 'queue' ? 'active bg-primary border-primary fw-bold' : ''}`}
              onClick={() => setActiveTab('queue')}
              style={{ background: activeTab === 'queue' ? 'var(--bs-primary)' : 'transparent' }}
            >
              <i className="bi bi-people me-2"></i>Waiting Line Status
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link text-white py-2 ${activeTab === 'stack' ? 'active bg-primary border-primary fw-bold' : ''}`}
              onClick={() => setActiveTab('stack')}
              style={{ background: activeTab === 'stack' ? 'var(--bs-primary)' : 'transparent' }}
            >
              <i className="bi bi-layers-half me-2"></i>Live Logs Tracker
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link text-white py-2 ${activeTab === 'hash' ? 'active bg-primary border-primary fw-bold' : ''}`}
              onClick={() => setActiveTab('hash')}
              style={{ background: activeTab === 'hash' ? 'var(--bs-primary)' : 'transparent' }}
            >
              <i className="bi bi-hash me-2"></i>Registry Index Finder
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link text-white py-2 ${activeTab === 'link' ? 'active bg-primary border-primary fw-bold' : ''}`}
              onClick={() => setActiveTab('link')}
              style={{ background: activeTab === 'link' ? 'var(--bs-primary)' : 'transparent' }}
            >
              <i className="bi bi-link me-2"></i>Audit Ledger Chain
            </button>
          </li>
        </ul>

        {/* Tab contents */}
        <div className="tab-content">
          {/* Array Visualizer */}
          {activeTab === 'slots' && (
            <div>
              <p className="text-secondary small mb-3">
                Shows the physical arrangement of the parking lot slots. You can see the status of each slot mapped directly to its layout coordinates.
              </p>
              <div className="row g-2 justify-content-center">
                {slots.length === 0 ? (
                  <div className="text-center text-muted py-4">No slots created yet. Go to Slots tab to create one.</div>
                ) : (
                  slots.map((slot, index) => (
                    <div key={slot.id} className="col-6 col-md-4 col-lg-2">
                      <div 
                        className="p-3 text-center rounded border position-relative"
                        style={{
                          background: slot.status === 'available' ? 'rgba(40, 167, 69, 0.15)' : slot.status === 'occupied' ? 'rgba(220, 53, 69, 0.15)' : 'rgba(255, 193, 7, 0.15)',
                          borderColor: slot.status === 'available' ? '#28a745' : slot.status === 'occupied' ? '#dc3545' : '#ffc107',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <span className="position-absolute top-0 start-0 badge bg-dark text-muted font-monospace small" style={{ fontSize: '0.65rem' }}>
                          [{index}]
                        </span>
                        <div className="fw-bold mb-1">{slot.slot_number}</div>
                        <div className="text-muted small mb-1" style={{ fontSize: '0.75rem' }}>{slot.slot_type}</div>
                        <span className={`badge ${slot.status === 'available' ? 'bg-success' : slot.status === 'occupied' ? 'bg-danger' : 'bg-warning text-dark'} small`}>
                          {slot.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Queue Visualizer */}
          {activeTab === 'queue' && (
            <div>
              <p className="text-secondary small mb-3">
                Monitors vehicles waiting for slots when parking capacity is reached. When a space frees up, the vehicle at the front of the line is automatically placed into the newly vacated spot.
              </p>
              {visualQueue.length === 0 ? (
                <div className="text-center text-muted border border-secondary border-dashed rounded p-5">
                  <i className="bi bi-inbox-fill text-secondary fs-1 d-block mb-2"></i>
                  No vehicles currently waiting.
                </div>
              ) : (
                <div className="d-flex align-items-center flex-wrap justify-content-center p-3 rounded" style={{ background: '#11151e' }}>
                  <div className="text-success fw-bold me-3 font-monospace">LINE FRONT</div>
                  
                  {visualQueue.map((item, index) => (
                    <React.Fragment key={item.id}>
                      <div 
                        className="card text-center text-white p-2 border-primary mb-2 shadow"
                        style={{ 
                          width: '130px', 
                          background: 'rgba(13, 110, 253, 0.15)', 
                          border: '2px solid var(--bs-primary)',
                          animation: 'pulse 2s infinite'
                        }}
                      >
                        <div className="fw-bold text-warning">{item.vehicles?.vehicle_number}</div>
                        <div className="text-muted small" style={{ fontSize: '0.7rem' }}>Pos: {item.queue_position}</div>
                        <span className="badge bg-secondary mt-1">{item.vehicles?.vehicle_type}</span>
                      </div>
                      {index < visualQueue.length - 1 && (
                        <div className="mx-2 mb-2">
                          <i className="bi bi-arrow-left fs-3 text-primary"></i>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                  
                  <div className="text-warning fw-bold ms-3 font-monospace">LINE REAR</div>
                </div>
              )}
            </div>
          )}

          {/* Stack Visualizer */}
          {activeTab === 'stack' && (
            <div className="row justify-content-center">
              <div className="col-md-6 col-lg-5">
                <p className="text-secondary small mb-3">
                  Logs the most recent security and parking events. New updates appear at the top, while older entries slide down.
                </p>
                <div className="border border-secondary rounded p-3 position-relative" style={{ minHeight: '320px', background: '#11151e' }}>
                  <div className="text-center font-monospace text-warning border-bottom border-secondary pb-2 mb-3">
                    LATEST ACTION
                  </div>
                  
                  <div className="d-flex flex-column-reverse">
                    {visualStack.length === 0 ? (
                      <div className="text-center text-muted py-5">No recent activities.</div>
                    ) : (
                      visualStack.map((act, index) => (
                        <div 
                          key={act.id || index} 
                          className="p-3 mb-2 rounded border border-secondary shadow-sm text-start"
                          style={{ 
                            background: 'rgba(255,255,255,0.04)',
                            borderLeft: '4px solid ' + (act.type === 'exit' ? '#dc3545' : act.type === 'entry' ? '#28a745' : '#0d6efd')
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="fw-bold" style={{ fontSize: '0.85rem' }}>{act.message}</span>
                            <span className="badge bg-dark text-muted font-monospace" style={{ fontSize: '0.65rem' }}>
                              [{visualStack.length - 1 - index}]
                            </span>
                          </div>
                          <small className="text-muted d-block mt-1" style={{ fontSize: '0.7rem' }}>
                            {new Date(act.timestamp).toLocaleTimeString()}
                          </small>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="text-center font-monospace text-muted border-top border-secondary pt-2 mt-3">
                    HISTORIC BASE
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Hash Table Visualizer */}
          {activeTab === 'hash' && (
            <div>
              <p className="text-secondary small mb-3">
                Indexes vehicles using a search index partition. Searching matches the vehicle number instantly to a partition row, bypassing long table searches.
              </p>
              <div className="table-responsive">
                <table className="table table-bordered border-secondary text-white font-monospace align-middle">
                  <thead className="table-dark">
                    <tr>
                      <th style={{ width: '15%' }}>Partition</th>
                      <th style={{ width: '25%' }}>Key Indexing Formula</th>
                      <th>Registered Node Chain</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visualHashTable.map((bucket, index) => (
                      <tr key={index} style={{ background: 'rgba(255,255,255,0.01)' }}>
                        <td className="text-center fw-bold text-primary">Row [{index}]</td>
                        <td className="text-muted small">
                          <code>index(key) = {index}</code>
                        </td>
                        <td>
                          <div className="d-flex flex-wrap align-items-center">
                            {bucket.elements.length === 0 ? (
                              <span className="text-muted small">EMPTY</span>
                            ) : (
                              bucket.elements.map((el, itemIdx) => (
                                <React.Fragment key={el.key}>
                                  <div className="badge bg-dark border border-secondary text-start p-2 m-1 d-flex flex-column rounded shadow-sm">
                                    <span className="text-warning fw-bold">{el.key}</span>
                                    <span className="text-light" style={{ fontSize: '0.7rem' }}>Owner: {el.val.owner}</span>
                                    <span className="text-muted" style={{ fontSize: '0.65rem' }}>{el.val.type}</span>
                                  </div>
                                  {itemIdx < bucket.elements.length - 1 && (
                                    <i className="bi bi-arrow-right text-warning mx-1 fs-5"></i>
                                  )}
                                </React.Fragment>
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Linked List Visualizer */}
          {activeTab === 'link' && (
            <div>
              <p className="text-secondary small mb-3">
                Displays transactional parking logs chained chronologically. Each record node points to the next transaction in sequence.
              </p>
              {visualLinkedList.length === 0 ? (
                <div className="text-center text-muted py-5">
                  No records to display.
                </div>
              ) : (
                <div className="d-flex align-items-center flex-wrap justify-content-start p-3 rounded" style={{ background: '#11151e', overflowX: 'auto' }}>
                  <div className="badge bg-secondary p-2 me-3 font-monospace">START</div>
                  
                  {visualLinkedList.map((node, index) => (
                    <React.Fragment key={node.id}>
                      <div 
                        className="card text-white p-2 border-secondary mb-2 shadow-sm"
                        style={{ 
                          width: '170px', 
                          background: 'rgba(255, 255, 255, 0.03)', 
                          borderLeft: '4px solid ' + (node.details.status === 'active' ? '#28a745' : '#6c757d') 
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="fw-bold text-info" style={{ fontSize: '0.8rem' }}>{node.details.vehicles?.vehicle_number || 'Veh-' + node.details.vehicle_id}</span>
                          <span className="badge bg-dark font-monospace" style={{ fontSize: '0.6rem' }}>Node_{node.id}</span>
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>Slot: {node.details.parking_slots?.slot_number || 'Queue'}</div>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>Fee: ₹{node.details.parking_fee || '0'}</div>
                        <div className="mt-1 d-flex justify-content-between" style={{ fontSize: '0.65rem' }}>
                          <span className="text-success">link 👉</span>
                          <span className="text-muted font-monospace">{index === visualLinkedList.length - 1 ? 'END' : `Node_${node.id + 1}`}</span>
                        </div>
                      </div>
                      {index < visualLinkedList.length - 1 && (
                        <div className="mx-2 mb-2 d-flex flex-column align-items-center">
                          <i className="bi bi-arrow-right-short fs-2 text-info"></i>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                  
                  <div className="badge bg-dark p-2 ms-3 font-monospace text-muted">END</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
