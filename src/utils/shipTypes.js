export const SHIP_CATEGORIES = {
  cargo:     { label: 'Cargo',           color: '#3B82F6' },
  tanker:    { label: 'Tanker',          color: '#F97316' },
  passenger: { label: 'Passenger',       color: '#A855F7' },
  fishing:   { label: 'Fishing',         color: '#22C55E' },
  highspeed: { label: 'High Speed',      color: '#EF4444' },
  sailing:   { label: 'Sailing',         color: '#F59E0B' },
  tug:       { label: 'Tug / Special',   color: '#64748B' },
  other:     { label: 'Other',           color: '#94A3B8' },
};

export function getShipCategory(typeCode) {
  const t = Number(typeCode) || 0;
  if (t >= 70 && t <= 79) return 'cargo';
  if (t >= 80 && t <= 89) return 'tanker';
  if (t >= 60 && t <= 69) return 'passenger';
  if (t === 30)            return 'fishing';
  if (t >= 40 && t <= 49) return 'highspeed';
  if (t === 37)            return 'sailing';
  if ([31, 32, 52].includes(t)) return 'tug';
  return 'other';
}

export const NAV_STATUS = {
  0:  'Under way using engine',
  1:  'At anchor',
  2:  'Not under command',
  3:  'Restricted manoeuvrability',
  4:  'Constrained by draught',
  5:  'Moored',
  6:  'Aground',
  7:  'Engaged in fishing',
  8:  'Under way sailing',
  15: 'Not defined',
};
