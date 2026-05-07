import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { SHIP_CATEGORIES } from '../utils/shipTypes';

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const MAP_STYLE    = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const SPAIN_CENTER = [-3.7, 40.4];
const INITIAL_ZOOM = 5.5;

function createArrowImage(color) {
  const size = 40;
  const canvas = document.createElement('canvas');
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.translate(size / 2, size / 2);
  ctx.fillStyle   = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth   = 1.5;
  ctx.lineJoin    = 'round';

  ctx.beginPath();
  ctx.moveTo(0,  -13);
  ctx.lineTo(7,   10);
  ctx.lineTo(0,    4);
  ctx.lineTo(-7,  10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Return ImageData — accepted by MapLibre addImage
  const id = ctx.getImageData(0, 0, size, size);
  return { width: size, height: size, data: id.data };
}

function setupShipLayer(map, onShipClick, onShipHover) {
  try {
    for (const [key, { color }] of Object.entries(SHIP_CATEGORIES)) {
      if (!map.hasImage(`ship-${key}`)) {
        map.addImage(`ship-${key}`, createArrowImage(color));
      }
    }

    // Track layer — added before ships so arrows render on top
    if (!map.getSource('ship-track')) {
      map.addSource('ship-track', {
        type: 'geojson',
        lineMetrics: true,
        data: { type: 'FeatureCollection', features: [] },
      });
    }
    if (!map.getLayer('ship-track-line')) {
      map.addLayer({
        id: 'ship-track-line',
        type: 'line',
        source: 'ship-track',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-width': 2.5,
          'line-gradient': [
            'interpolate', ['linear'], ['line-progress'],
            0, 'rgba(255,255,255,0)',
            1, 'rgba(255,255,255,0.85)',
          ],
        },
      });
    }

    if (!map.getSource('ships')) {
      map.addSource('ships', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    if (!map.getLayer('ships')) {
      map.addLayer({
        id:     'ships',
        type:   'symbol',
        source: 'ships',
        layout: {
          'icon-image':              ['concat', 'ship-', ['get', 'category']],
          'icon-size':               0.75,
          'icon-rotate':             ['get', 'heading'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap':      true,
          'icon-ignore-placement':   true,
          'text-field':              '',
          'text-size':               14,
          'text-offset':             [0.9, -0.9],
          'text-anchor':             'bottom-left',
          'text-allow-overlap':      true,
          'text-ignore-placement':   true,
          'text-optional':           true,
        },
      });
    }

    map.on('click', 'ships', (e) => {
      if (!e.features?.length) return;
      onShipClick(e.features[0].properties);
    });

    map.on('mouseenter', 'ships', (e) => {
      if (!e.features?.length) return;
      map.getCanvas().style.cursor = 'pointer';
      const { x, y } = e.point;
      onShipHover({ ...e.features[0].properties, x, y });
    });

    map.on('mouseleave', 'ships', () => {
      map.getCanvas().style.cursor = '';
      onShipHover(null);
    });

  } catch (err) {
    console.error('[Map] setupShipLayer error:', err);
  }
}

export function Map({ mapRef, onShipClick, onShipHover, tracksRef, selectedShip, flagMode }) {
  const containerRef = useRef(null);

  // Toggle flag labels on/off
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer('ships')) return;
    map.setLayoutProperty('ships', 'text-field', flagMode ? ['get', 'flag'] : '');
  }, [flagMode, mapRef]);

  // Live-update the track while a ship is selected
  useEffect(() => {
    function updateTrack() {
      const map = mapRef.current;
      const src = map?.getSource('ship-track');
      if (!src) return;

      if (!selectedShip) {
        src.setData({ type: 'FeatureCollection', features: [] });
        return;
      }

      const coords = tracksRef.current.get(selectedShip.mmsi) || [];
      if (coords.length < 2) return;

      const color = SHIP_CATEGORIES[selectedShip.category]?.color || '#ffffff';
      src.setData({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }],
      });
      map.setPaintProperty('ship-track-line', 'line-gradient', [
        'interpolate', ['linear'], ['line-progress'],
        0,   hexToRgba(color, 0),
        0.5, hexToRgba(color, 0.3),
        1,   hexToRgba(color, 0.9),
      ]);
    }

    updateTrack();
    const id = setInterval(updateTrack, 1000);
    return () => clearInterval(id);
  }, [selectedShip, tracksRef, mapRef]);

  useEffect(() => {
    const map = new maplibregl.Map({
      container:          containerRef.current,
      style:              MAP_STYLE,
      center:             SPAIN_CENTER,
      zoom:               INITIAL_ZOOM,
      attributionControl: false,
    });

    mapRef.current = map;
    window.__map   = map;

    // Handle both: async load and (rare) already-loaded style
    if (map.isStyleLoaded()) {
      setupShipLayer(map, onShipClick, onShipHover);
    } else {
      map.once('load', () => setupShipLayer(map, onShipClick, onShipHover));
    }

    // Attribution first → sits at the very bottom of the corner stack
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    // Navigation second → stacks above attribution
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'nautical' }), 'bottom-left');

    return () => {
      mapRef.current = null;
      window.__map   = null;
      map.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
