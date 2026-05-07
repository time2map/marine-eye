import { SHIP_CATEGORIES } from '../utils/shipTypes';

export function Legend({ pinned, onToggle, countryStats, selectedCountry, onCountry }) {
  const hasSelection = pinned.size > 0;
  const total = countryStats.reduce((s, c) => s + c.count, 0);

  return (
    <div className="legend">
      <div className="legend-tagline">Real-Time Vessel Tracking</div>
      <div className="legend-divider" />

      {Object.entries(SHIP_CATEGORIES).map(([key, { label, color }]) => {
        const isHighlighted = !hasSelection || pinned.has(key);
        return (
          <button
            key={key}
            className={`legend-item legend-item--btn ${isHighlighted ? '' : 'legend-item--off'}`}
            onClick={() => onToggle(key)}
            title={pinned.has(key) ? `Remove ${label} from filter` : `Show only ${label}`}
          >
            <span
              className="legend-dot"
              style={{ background: isHighlighted ? color : 'transparent', borderColor: color }}
            />
            {label}
          </button>
        );
      })}

      {countryStats.length > 0 && (
        <>
          <div className="legend-divider" />
          <div className="legend-select-wrap">
            <select
              className="legend-select"
              value={selectedCountry}
              onChange={e => onCountry(e.target.value)}
            >
              <option value="">All countries ({total})</option>
              {countryStats.map(({ name, emoji, count }) => (
                <option key={name} value={name}>
                  {emoji} {name} ({count})
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
}
