import React, { useState } from 'react';
import { api } from '../services/api';

function TrackedList({
  products = [],
  loading = false,
  error = null,
  onRefresh,
  onSelectProduct
}) {
  const [scrapingId, setScrapingId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  const handleManualScrape = async (product) => {
    setScrapingId(product.id);
    setActionMessage(null);
    try {
      const res = await api.triggerScrape(product.id);
      setActionMessage({
        type: 'success',
        text: `✓ Scraped "${product.name}": ₹${res.data?.price} (${res.data?.stockStatus}) in ${(res.metrics?.response_time_ms / 1000).toFixed(1)}s`
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: `Scrape failed for "${product.name}": ${err.message}`
      });
    } finally {
      setScrapingId(null);
    }
  };

  const handleToggle = async (product) => {
    try {
      await api.toggleTrackedProduct(product.id);
      if (onRefresh) onRefresh();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Stop tracking and delete "${product.name}"? Historical records will also be deleted.`)) {
      return;
    }
    try {
      await api.deleteTrackedProduct(product.id);
      setActionMessage({ type: 'info', text: `Removed "${product.name}" from tracking.` });
      if (onRefresh) onRefresh();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="section-card">
      <div className="section-header">
        <div>
          <h2>📦 Tracked Products ({products.length})</h2>
          <p className="section-desc">Monitored every 2 hours by external cron. You can also trigger manual scrapes below.</p>
        </div>
        <button className="btn btn-secondary" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing...' : '🔄 Refresh List'}
        </button>
      </div>

      {actionMessage && (
        <div className={`alert alert-${actionMessage.type}`}>
          {actionMessage.text}
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {loading && products.length === 0 && (
        <div className="empty-state">
          <div className="spinner"></div>
          <p>Loading tracked products...</p>
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="empty-state">
          <p className="empty-title">No products being tracked yet</p>
          <p className="empty-desc">Use the search box below to search the INE mock store and click "+ Add to Tracking".</p>
        </div>
      )}

      {products.length > 0 && (
        <div className="tracked-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Status</th>
                <th>Last Scraped</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const isScrapingThis = scrapingId === product.id;
                return (
                  <tr key={product.id} className={!product.is_active ? 'row-paused' : ''}>
                    <td>
                      <div className="product-cell">
                        <span className="product-cell-name">{product.name}</span>
                        <div className="product-cell-meta">
                          <span>{product.brand || 'Store Item'}</span>
                          <span>•</span>
                          <a
                            href={product.url}
                            target="_blank"
                            rel="noreferrer"
                            className="link-muted"
                          >
                            Store Link ↗
                          </a>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${product.is_active ? 'badge-success' : 'badge-warning'}`}>
                        {product.is_active ? 'Active' : 'Paused'}
                      </span>
                    </td>
                    <td>
                      <span className="text-muted text-small">
                        {product.last_scraped_at
                          ? new Date(product.last_scraped_at).toLocaleString()
                          : 'Never scraped'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleManualScrape(product)}
                          disabled={isScrapingThis || !product.is_active}
                          className="btn btn-primary btn-sm"
                          title="Run immediate Playwright scrape"
                        >
                          {isScrapingThis ? (
                            <>
                              <span className="btn-spinner"></span> Scraping...
                            </>
                          ) : (
                            '⚡ Scrape Now'
                          )}
                        </button>

                        <button
                          onClick={() => onSelectProduct(product)}
                          className="btn btn-outline btn-sm"
                          title="View price history and scrape logs"
                        >
                          📊 Details
                        </button>

                        <button
                          onClick={() => handleToggle(product)}
                          className="btn btn-secondary btn-sm"
                          title={product.is_active ? 'Pause automatic scraping' : 'Resume automatic scraping'}
                        >
                          {product.is_active ? 'Pause' : 'Resume'}
                        </button>

                        <button
                          onClick={() => handleDelete(product)}
                          className="btn btn-danger btn-sm"
                          title="Remove product and history"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TrackedList;
