import { useRef, useState, useCallback, useEffect } from 'react';
import { Map as MapView } from './components/Map';
import { Header }       from './components/Header';
import { Legend }       from './components/Legend';
import { InfoPanel }    from './components/InfoPanel';
import { Tooltip }      from './components/Tooltip';
import { useAISStream } from './hooks/useAISStream';

function buildFilter(pinned, country) {
  const parts = [];
  if (pinned.size > 0) {
    parts.push(['in', ['get', 'category'], ['literal', [...pinned]]]);
  }
  if (country) {
    parts.push(['==', ['get', 'country'], country]);
  }
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  return ['all', ...parts];
}

export default function App() {
  const mapRef                        = useRef(null);
  const [selected, setSelected]       = useState(null);
  const [hovered,  setHovered]        = useState(null);
  const [pinned,   setPinned]         = useState(new Set());
  const [country,  setCountry]        = useState('');
  const [countryStats, setCountryStats] = useState([]);

  const { tracksRef, shipsRef } = useAISStream({ mapRef });

  // Recompute country stats from live data every 3s
  useEffect(() => {
    function compute() {
      const counts = new Map();
      for (const ship of shipsRef.current.values()) {
        if (!ship.country) continue;
        const entry = counts.get(ship.country);
        if (entry) {
          entry.count++;
        } else {
          counts.set(ship.country, { count: 1, emoji: ship.flagEmoji || '' });
        }
      }
      setCountryStats(
        [...counts.entries()]
          .map(([name, { count, emoji }]) => ({ name, count, emoji }))
          .sort((a, b) => b.count - a.count)
      );
    }
    compute();
    const id = setInterval(compute, 3000);
    return () => clearInterval(id);
  }, [shipsRef]);

  const applyFilter = useCallback((pins, c) => {
    const map = mapRef.current;
    if (map?.getLayer('ships')) {
      map.setFilter('ships', buildFilter(pins, c));
    }
  }, [mapRef]);

  const toggleCategory = useCallback((key) => {
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      applyFilter(next, country);
      return next;
    });
  }, [applyFilter, country]);

  const selectCountry = useCallback((c) => {
    setCountry(c);
    applyFilter(pinned, c);
  }, [applyFilter, pinned]);

  return (
    <div className="app">
      <Header />
      <div className="map-wrap">
        <MapView
          mapRef={mapRef}
          onShipClick={setSelected}
          onShipHover={setHovered}
          tracksRef={tracksRef}
          selectedShip={selected}
        />
        <Legend
          pinned={pinned}
          onToggle={toggleCategory}
          countryStats={countryStats}
          selectedCountry={country}
          onCountry={selectCountry}
        />
        <Tooltip ship={hovered} />
        <InfoPanel ship={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  );
}
