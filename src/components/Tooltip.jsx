import { SHIP_CATEGORIES } from '../utils/shipTypes';

export function Tooltip({ ship }) {
  if (!ship) return null;

  const cat  = SHIP_CATEGORIES[ship.category] || SHIP_CATEGORIES.other;
  const speed = Number(ship.sog);

  return (
    <div
      className="tooltip"
      style={{ left: ship.x + 14, top: ship.y - 12 }}
    >
      <span className="tooltip-name">{ship.name}</span>
      <span className="tooltip-meta">
        <span className="tooltip-dot" style={{ background: cat.color }} />
        {cat.label}
        {speed > 0 && <> · {speed.toFixed(1)} kn</>}
      </span>
    </div>
  );
}
