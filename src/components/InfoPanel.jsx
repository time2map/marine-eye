import { SHIP_CATEGORIES, NAV_STATUS } from '../utils/shipTypes';

function Row({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

function fmt(val, suffix = '') {
  if (val == null || val === '' || val === 0) return null;
  return `${val}${suffix}`;
}

export function InfoPanel({ ship, onClose }) {
  if (!ship) return null;

  const cat       = SHIP_CATEGORIES[ship.category] || SHIP_CATEGORIES.other;
  const navLabel  = NAV_STATUS[Number(ship.navStatus)] || 'Unknown';
  const speed     = Number(ship.sog);
  const cog       = Number(ship.cog);
  const heading   = Number(ship.heading);

  return (
    <aside className="info-panel">
      <button className="info-close" onClick={onClose} aria-label="Close">✕</button>

      <div className="info-header">
        <div className="info-ship-name">{ship.name}</div>
        <div className="info-header-meta">
          <span className="info-badge" style={{ background: cat.color + '22', color: cat.color, borderColor: cat.color + '44' }}>
            <span className="info-badge-dot" style={{ background: cat.color }} />
            {cat.label}
          </span>
          {ship.flag && (
            <span className="info-flag" title={ship.country}>
              {ship.flag} <span className="info-flag-country">{ship.country}</span>
            </span>
          )}
        </div>
        <div className="info-nav-status">{navLabel}</div>
      </div>

      <div className="info-section">
        <div className="info-section-title">Identity</div>
        <Row label="MMSI"      value={ship.mmsi} />
        <Row label="IMO"       value={fmt(ship.imo)} />
        <Row label="Call Sign" value={ship.callSign} />
      </div>

      <div className="info-section">
        <div className="info-section-title">Navigation</div>
        <Row label="Speed"   value={speed > 0 ? `${speed.toFixed(1)} kn` : 'Stationary'} />
        <Row label="Course"  value={cog > 0 ? `${cog.toFixed(1)}°` : null} />
        <Row label="Heading" value={heading > 0 ? `${heading}°` : null} />
      </div>

      {ship.destination && (
        <div className="info-section">
          <div className="info-section-title">Voyage</div>
          <Row label="Destination" value={ship.destination} />
        </div>
      )}
    </aside>
  );
}
