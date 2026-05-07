import { useRef, useState, useCallback } from 'react';
import { Map }          from './components/Map';
import { Header }       from './components/Header';
import { Legend }       from './components/Legend';
import { InfoPanel }    from './components/InfoPanel';
import { Tooltip }      from './components/Tooltip';
import { useAISStream } from './hooks/useAISStream';
import { SHIP_CATEGORIES } from './utils/shipTypes';

export default function App() {
  const mapRef                    = useRef(null);
  const [selected, setSelected]   = useState(null);
  const [hovered,  setHovered]    = useState(null);
  const [pinned, setPinned]       = useState(new Set()); // empty = show all
  const [flagMode, setFlagMode]   = useState(false);

  const { tracksRef } = useAISStream({ mapRef });

  const toggleCategory = useCallback((key) => {
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      const map = mapRef.current;
      if (map?.getLayer('ships')) {
        if (next.size === 0) {
          map.setFilter('ships', null);
        } else {
          map.setFilter('ships', ['in', ['get', 'category'], ['literal', [...next]]]);
        }
      }

      return next;
    });
  }, [mapRef]);

  return (
    <div className="app">
      <Header />
      <div className="map-wrap">
        <Map
          mapRef={mapRef}
          onShipClick={setSelected}
          onShipHover={setHovered}
          tracksRef={tracksRef}
          selectedShip={selected}
          flagMode={flagMode}
        />
        <Legend pinned={pinned} onToggle={toggleCategory} flagMode={flagMode} onFlagMode={setFlagMode} />
        <Tooltip ship={hovered} />
        <InfoPanel ship={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  );
}
