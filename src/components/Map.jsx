import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { SHIP_CATEGORIES } from '../utils/shipTypes';

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

export function Map({ mapRef, onShipClick, onShipHover }) {
  const containerRef = useRef(null);

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
