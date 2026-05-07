import { SHIP_CATEGORIES } from '../utils/shipTypes';

export function Legend({ pinned, onToggle, flagMode, onFlagMode }) {
  const hasSelection = pinned.size > 0;
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
      <div className="legend-divider" />
      <button
        className={`legend-item legend-item--btn ${flagMode ? 'legend-item--flag-on' : 'legend-item--off'}`}
        onClick={() => onFlagMode(m => !m)}
        title={flagMode ? 'Hide flags' : 'Show flags'}
      >
        <span className="legend-flag-icon">🏳</span>
        Flags
      </button>
    </div>
  );
}
