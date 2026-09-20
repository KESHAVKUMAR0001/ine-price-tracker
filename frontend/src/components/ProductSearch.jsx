import React, { useState } from 'react';
import { api } from '../services/api';

function ProductSearch({ onProductTracked, trackedProductIds = [] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [addingId, setAddingId] = useState(null);
  const [message, setMessage] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await api.searchCatalog(query.trim(), 1, 24);
      setResults(response.data?.items || []);
      if ((response.data?.items || []).length === 0) {
        setMessage(`No products found matching "${query}".`);
      }
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (product) => {
    setAddingId(product.id);
    setError(null);
    try {
      await api.addTrackedProduct({
        store_product_id: product.id,
        name: product.name,
        slug: product.slug,
        url: product.url,
        brand: product.brand,
        category: product.category
      });
      setMessage(`Added "${product.name}" to tracking list.`);
      if (onProductTracked) onProductTracked();
    } catch (err) {
      if (err.status === 409) {
        setMessage(`"${product.name}" is already tracked.`);
      } else {
        setError(err.message);
      }
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="section-card">
      <div className="section-header">
        <div>
          <h2 className="section-title">Search Store Catalog</h2>
          <p className="section-desc">Search products from the INE mock store to add to your tracking list.</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="search-bar-container">
        <input
          type="text"
          placeholder="Search by name, brand, or category (e.g. Cobalt, Laptops, Monitor)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="btn btn-primary" disabled={loading || !query.trim()}>
          {loading ? 'Searching...' : 'Search Catalog'}
        </button>
      </form>

      {message && <div className="alert alert-info">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {results.length > 0 && (
        <div className="product-grid">
          {results.map((product) => {
            const isAlreadyTracked = trackedProductIds.includes(product.id);
            return (
              <div key={product.id} className="product-card">
                <div className="product-card-header">
                  <span className="product-category-chip">{product.category || 'General'}</span>
                  <span className="product-brand-chip">{product.brand}</span>
                </div>
                <h3 className="product-card-title">{product.name}</h3>
                <p className="product-card-sku">SKU: {product.sku}</p>
                <div className="product-card-footer">
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noreferrer"
                    className="link-muted text-sm"
                  >
                    Store Link &nearr;
                  </a>
                  <button
                    onClick={() => handleTrack(product)}
                    disabled={addingId === product.id || isAlreadyTracked}
                    className={`btn btn-sm ${isAlreadyTracked ? 'btn-outline' : 'btn-primary'}`}
                  >
                    {addingId === product.id
                      ? 'Adding...'
                      : isAlreadyTracked
                      ? 'Tracked'
                      : 'Track Product'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ProductSearch;
