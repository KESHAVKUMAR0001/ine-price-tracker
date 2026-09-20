import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import TrackedList from './components/TrackedList';
import ProductSearch from './components/ProductSearch';
import ProductHistoryModal from './components/ProductHistoryModal';
import './App.css';

function App() {
  const [trackedProducts, setTrackedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);

  const loadTrackedProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getTrackedProducts();
      setTrackedProducts(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = async () => {
    try {
      const res = await api.getHealth();
      setHealthStatus(res);
    } catch (_) {
      setHealthStatus({ status: 'offline' });
    }
  };

  useEffect(() => {
    loadTrackedProducts();
    checkHealth();
  }, []);

  const trackedIds = trackedProducts.map(p => p.store_product_id || p.id);

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <header className="site-header">
        <div className="brand-group">
          <div className="brand-logo">📈</div>
          <div>
            <h1 className="brand-title">INE Price Tracker</h1>
            <p className="brand-subtitle">Automated Playwright Web Scraper &amp; Price Monitor</p>
          </div>
        </div>

        <div className="header-status">
          <div className="health-badge">
            <span className={`status-dot ${healthStatus?.status === 'healthy' ? 'dot-green' : 'dot-amber'}`}></span>
            <span>Backend: {healthStatus?.status === 'healthy' ? 'Online' : 'Connecting...'}</span>
          </div>
          {healthStatus?.database && (
            <div className="health-badge">
              <span className={`status-dot ${healthStatus.database.status === 'connected' ? 'dot-green' : 'dot-amber'}`}></span>
              <span>DB: {healthStatus.database.status}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="main-layout">
        {/* Section 1: Tracked Products */}
        <TrackedList
          products={trackedProducts}
          loading={loading}
          error={error}
          onRefresh={loadTrackedProducts}
          onSelectProduct={(product) => setSelectedProduct(product)}
        />

        {/* Section 2: Product Search */}
        <ProductSearch
          onProductTracked={loadTrackedProducts}
          trackedProductIds={trackedIds}
        />
      </main>

      {/* Modal: History & Scrape Logs */}
      {selectedProduct && (
        <ProductHistoryModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Footer */}
      <footer className="site-footer">
        <p>INE Software Engineer Intern Assignment • Built with React, Node/Express, Playwright &amp; Supabase</p>
      </footer>
    </div>
  );
}

export default App;
