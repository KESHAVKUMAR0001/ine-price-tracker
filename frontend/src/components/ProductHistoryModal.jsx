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
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{product.name}</h3>
            <p className="modal-subtitle">Price History &amp; Scraper Audit Trail</p>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close dialog">✕</button>
        </div>

        <div className="modal-tabs">
          <button
            className={`tab-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Price History ({history.length})
          </button>
          <button
            className={`tab-item ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            Scrape Logs ({logs.length})
          </button>
        </div>

        {loading && (
          <div className="modal-body modal-loading-state">
            <div className="spinner"></div>
            <p className="text-secondary">Loading product records...</p>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {!loading && activeTab === 'history' && (
          <div className="modal-body">
            <PriceChart history={history} />

            <div className="table-section-title">Recorded Price Snapshots</div>
            {history.length === 0 ? (
              <div className="empty-state">
                <p className="empty-title">No price snapshots recorded</p>
                <p className="empty-desc">Click "Scrape Now" on the main dashboard to run the Playwright scraper.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Price</th>
                      <th>Stock Status</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => (
                      <tr key={row.id}>
                        <td className="text-secondary">{new Date(row.scraped_at).toLocaleString()}</td>
                        <td className="font-semibold text-primary">
                          ₹{Number(row.price).toLocaleString()}
                        </td>
                        <td>
                          <span className="pill pill-outline">
                            {row.stock_status}
                          </span>
                        </td>
                        <td className="text-secondary">{row.stock_count !== null ? row.stock_count : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'logs' && (
          <div className="modal-body">
            <div className="table-section-title">Execution Audit Trail</div>
            {logs.length === 0 ? (
              <div className="empty-state">
                <p className="empty-title">No scrape logs recorded</p>
                <p className="empty-desc">Audit logs are generated each time a manual or scheduled scrape job runs.</p>
              </div>
            ) : (
              <div className="table-responsive">
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
                        <td className="text-secondary">{new Date(log.created_at).toLocaleTimeString()}</td>
                        <td>
                          <span className={`pill ${log.status === 'SUCCESS' ? 'pill-active' : 'pill-outline'}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="text-secondary">{log.response_time_ms ? `${(log.response_time_ms / 1000).toFixed(1)}s` : '—'}</td>
                        <td className="text-secondary">{log.attempt_count}</td>
                        <td className="text-secondary">{log.mode}</td>
                        <td className="text-secondary text-sm">{log.error_message || 'None'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
