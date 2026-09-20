import React from 'react';

/**
 * Minimalist Monochrome SVG Line Chart for Price History (Dependency-Free)
 */
function PriceChart({ history = [] }) {
  if (!history || history.length < 2) {
    return (
      <div className="chart-empty-placeholder">
        <p className="chart-placeholder-text">
          At least 2 price recordings are required to display the price trend chart. (Currently: {history?.length || 0})
        </p>
      </div>
    );
  }

  // Chronological sort (oldest to newest)
  const sorted = [...history].sort((a, b) => new Date(a.scraped_at) - new Date(b.scraped_at));

  const prices = sorted.map(h => Number(h.price));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 10;

  // Dimensions
  const width = 600;
  const height = 190;
  const paddingX = 55;
  const paddingY = 25;

  const points = sorted.map((item, index) => {
    const x = paddingX + (index / (sorted.length - 1)) * (width - paddingX * 2);
    const normalizedY = (Number(item.price) - minPrice) / range;
    const y = height - paddingY - normalizedY * (height - paddingY * 2);
    return { x, y, price: item.price, date: item.scraped_at };
  });

  const pathD = points.reduce((acc, point, i) => {
    return i === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`;
  }, '');

  return (
    <div className="chart-card">
      <div className="chart-header">
        <span className="chart-title">Price Trend</span>
        <span className="chart-meta text-sm text-secondary">
          Range: ₹{Math.round(minPrice).toLocaleString()} &ndash; ₹{Math.round(maxPrice).toLocaleString()}
        </span>
      </div>

      <div className="chart-svg-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} className="price-svg" preserveAspectRatio="none">
          {/* Faint grayscale grid lines */}
          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#e4e4e7" strokeDasharray="2 2" />
          <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="#e4e4e7" strokeDasharray="2 2" />
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#e4e4e7" />

          {/* Grayscale axis labels */}
          <text x={paddingX - 10} y={paddingY + 4} fill="#71717a" fontSize="11" textAnchor="end" fontFamily="inherit">
            ₹{Math.round(maxPrice).toLocaleString()}
          </text>
          <text x={paddingX - 10} y={height - paddingY + 4} fill="#71717a" fontSize="11" textAnchor="end" fontFamily="inherit">
            ₹{Math.round(minPrice).toLocaleString()}
          </text>

          {/* Clean black trend line */}
          <path d={pathD} fill="none" stroke="#18181b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Monochrome data points */}
          {points.map((pt, i) => (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r="3.5" fill="#ffffff" stroke="#18181b" strokeWidth="1.5" />
              <title>{`₹${Number(pt.price).toLocaleString()} on ${new Date(pt.date).toLocaleString()}`}</title>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export default PriceChart;
