import React from 'react';

/**
 * Clean, dependency-free SVG Line Chart for Price History
 */
function PriceChart({ history = [] }) {
  if (!history || history.length < 2) {
    return (
      <div className="chart-placeholder">
        <p>📈 Price trend chart requires at least 2 scraped points. (Currently: {history.length})</p>
      </div>
    );
  }

  // Sort chronological (oldest to newest for left-to-right chart)
  const sorted = [...history].sort((a, b) => new Date(a.scraped_at) - new Date(b.scraped_at));

  const prices = sorted.map(h => Number(h.price));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 10;

  // Chart dimensions
  const width = 600;
  const height = 200;
  const padding = 40;

  const points = sorted.map((item, index) => {
    const x = padding + (index / (sorted.length - 1)) * (width - padding * 2);
    const normalizedY = (Number(item.price) - minPrice) / range;
    const y = height - padding - normalizedY * (height - padding * 2);
    return { x, y, price: item.price, date: item.scraped_at };
  });

  const pathD = points.reduce((acc, point, i) => {
    return i === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`;
  }, '');

  return (
    <div className="chart-container">
      <h4 className="chart-title">Price Trend (INR)</h4>
      <svg viewBox={`0 0 ${width} ${height}`} className="price-svg">
        {/* Horizontal grid lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeDasharray="4" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#334155" strokeDasharray="4" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" />

        {/* Min / Max Labels */}
        <text x={padding - 8} y={padding + 4} fill="#94a3b8" fontSize="11" textAnchor="end">
          ₹{Math.round(maxPrice)}
        </text>
        <text x={padding - 8} y={height - padding + 4} fill="#94a3b8" fontSize="11" textAnchor="end">
          ₹{Math.round(minPrice)}
        </text>

        {/* Trend Line */}
        <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />

        {/* Data points */}
        {points.map((pt, i) => (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y} r="5" fill="#60a5fa" stroke="#1e293b" strokeWidth="2" />
            <title>{`₹${pt.price} on ${new Date(pt.date).toLocaleString()}`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default PriceChart;
