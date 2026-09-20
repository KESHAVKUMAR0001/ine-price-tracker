import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import PriceChart from './PriceChart';

function ProductHistoryModal({ product, onClose }) {
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'logs'
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!product) return;
    loadData();
  }, [product]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [histRes, logRes] = await Promise.all([
        api.getPriceHistory(product.id),
        api.getScrapeLogs(product.id)
      ]);
      setHistory(histRes.data || []);
      setLogs(logRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{product.name}</h3>
            <span className="modal-subtitle">Tracking History &amp; Audit Logs</span>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📊 Price History ({history.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            📜 Scrape Logs ({logs.length})
          </button>
        </div>

        {loading && (
          <div className="modal-loading">
            <div className="spinner"></div>
            <p>Loading product records...</p>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {!loading && activeTab === 'history' && (
          <div className="tab-content">
            <PriceChart history={history} />

            <h4 className="table-heading">Price Snapshots</h4>
            {history.length === 0 ? (
              <p className="empty-text">No price records yet. Click "Scrape Now" on the dashboard to capture the first price.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Price</th>
                    <th>Stock Status</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.id}>
                      <td>{new Date(row.scraped_at).toLocaleString()}</td>
                      <td className="font-bold text-green">₹{Number(row.price).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${row.stock_status.toLowerCase().includes('out') ? 'badge-error' : 'badge-success'}`}>
                          {row.stock_status}
                        </span>
                      </td>
                      <td>{row.stock_count !== null ? row.stock_count : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {!loading && activeTab === 'logs' && (
          <div className="tab-content">
            <h4 className="table-heading">Scrape Execution Audit Trail</h4>
            {logs.length === 0 ? (
              <p className="empty-text">No scrape logs recorded yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Status</th>
                    <th>Duration</th>
                    <th>Attempts</th>
                    <th>Mode</th>
                    <th>Notes / Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.created_at).toLocaleTimeString()}</td>
                      <td>
                        <span className={`badge ${log.status === 'SUCCESS' ? 'badge-success' : 'badge-error'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td>{log.response_time_ms ? `${(log.response_time_ms / 1000).toFixed(1)}s` : '—'}</td>
                      <td>{log.attempt_count}</td>
                      <td className="text-muted">{log.mode}</td>
                      <td className="text-error-small">{log.error_message || 'None'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default ProductHistoryModal;
