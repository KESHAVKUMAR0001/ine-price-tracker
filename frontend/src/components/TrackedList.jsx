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
        type: 'info',
        text: `Scraped "${product.name}": ₹${res.data?.price} (${res.data?.stockStatus}) in ${(res.metrics?.response_time_ms / 1000).toFixed(1)}s`
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
    if (!window.confirm(`Stop tracking and remove "${product.name}"? Historical records will also be deleted.`)) {
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
          <h2 className="section-title">Tracked Products ({products.length})</h2>
          <p className="section-desc">Monitored on a recurring schedule. You can trigger on-demand Playwright scrapes below.</p>
        </div>
        <button className="btn btn-outline" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
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
          <p className="text-secondary">Loading tracked products...</p>
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="empty-state">
          <p className="empty-title">No products tracked yet</p>
          <p className="empty-desc">Search the mock store catalog below and click "Track Product" to begin monitoring.</p>
        </div>
      )}

      {products.length > 0 && (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '38%' }}>Product</th>
                <th style={{ width: '12%' }}>Status</th>
                <th style={{ width: '22%' }}>Last Scraped</th>
                <th style={{ width: '28%', textAlign: 'right' }}>Actions</th>
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
                          <span className="meta-dot">&bull;</span>
                          <a
                            href={product.url}
                            target="_blank"
                            rel="noreferrer"
                            className="link-muted"
                          >
                            Store Link &nearr;
                          </a>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`pill ${product.is_active ? 'pill-active' : 'pill-paused'}`}>
                        {product.is_active ? 'Active' : 'Paused'}
                      </span>
                    </td>
                    <td>
                      <span className="text-secondary text-sm">
                        {product.last_scraped_at
                          ? new Date(product.last_scraped_at).toLocaleString()
                          : 'Never scraped'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="action-button-group">
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
                            'Scrape Now'
                          )}
                        </button>

                        <button
                          onClick={() => onSelectProduct(product)}
                          className="btn btn-outline btn-sm"
                          title="View price history and scrape logs"
                        >
                          Details
                        </button>

                        <button
                          onClick={() => handleToggle(product)}
                          className="btn btn-outline btn-sm"
                          title={product.is_active ? 'Pause automatic scraping' : 'Resume automatic scraping'}
                        >
                          {product.is_active ? 'Pause' : 'Resume'}
                        </button>

                        <button
                          onClick={() => handleDelete(product)}
                          className="btn btn-danger btn-sm"
                          title="Remove product and history"
                        >
                          Remove
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
