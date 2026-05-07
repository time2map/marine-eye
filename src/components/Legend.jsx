import { SHIP_CATEGORIES } from '../utils/shipTypes';

export function Legend({ pinned, onToggle }) {
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
    </div>
  );
}
