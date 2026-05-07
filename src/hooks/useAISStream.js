import { useEffect, useRef } from 'react';
import { getShipCategory } from '../utils/shipTypes';

const WS_URL = 'wss://stream.aisstream.io/v0/stream';
const API_KEY = import.meta.env.VITE_AIS_API_KEY;

// Spain bounding box: [MinLat, MinLon], [MaxLat, MaxLon]
const BOUNDING_BOX = [[35.9, -9.3], [43.8, 4.3]];

function buildGeoJSON(ships) {
  const features = [];
  for (const ship of ships.values()) {
    if (ship.lon == null || ship.lat == null) continue;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [ship.lon, ship.lat] },
      properties: {
        mmsi:        ship.mmsi,
        name:        ship.name || `MMSI ${ship.mmsi}`,
        category:    ship.category || 'other',
        heading:     ship.heading ?? 0,
        sog:         ship.sog ?? 0,
        cog:         ship.cog ?? 0,
        navStatus:   ship.navStatus ?? 15,
        shipType:    ship.shipType ?? 0,
        imo:         ship.imo ?? '',
        callSign:    ship.callSign ?? '',
        destination: ship.destination ?? '',
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

const MAX_TRACK_PTS = 500;

export function useAISStream({ mapRef }) {
  const shipsRef  = useRef(new Map());
  const tracksRef = useRef(new Map());
  const wsRef     = useRef(null);

  useEffect(() => {
    let cancelled = false;

    function flushToMap() {
      const map = mapRef.current;
      if (!map) return;
      const source = map.getSource('ships');
      if (!source) return;
      source.setData(buildGeoJSON(shipsRef.current));
    }

    // Push updates at 4 fps
    const interval = setInterval(flushToMap, 250);

    function connect() {
      if (cancelled) return;
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          APIKey:             API_KEY,
          BoundingBoxes:      [BOUNDING_BOX],
          FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
        }));
      };

      ws.onmessage = async (evt) => {
        // AISStream sends binary frames → Blob in browser
        const text = evt.data instanceof Blob ? await evt.data.text() : evt.data;
        let data;
        try { data = JSON.parse(text); } catch { return; }

        const { MessageType, MetaData, Message } = data;
        const mmsi = String(MetaData?.MMSI || '');
        if (!mmsi) return;

        const existing = shipsRef.current.get(mmsi) || { mmsi };

        if (MessageType === 'PositionReport') {
          const pr  = Message.PositionReport;
          const hdg = pr.TrueHeading;
          // AISStream uses short names: Sog, Cog (not SpeedOverGround/CourseOverGround)
          const heading = (hdg === 511 || hdg == null)
            ? (pr.Cog ?? existing.cog ?? 0)
            : hdg;

          shipsRef.current.set(mmsi, {
            ...existing,
            name:      MetaData.ShipName?.trim() || existing.name,
            lat:       pr.Latitude,
            lon:       pr.Longitude,
            sog:       pr.Sog,
            cog:       pr.Cog,
            heading,
            navStatus: pr.NavigationalStatus,
            category:  existing.category || getShipCategory(existing.shipType),
          });

          // Accumulate track
          const track = tracksRef.current.get(mmsi) || [];
          track.push([pr.Longitude, pr.Latitude]);
          if (track.length > MAX_TRACK_PTS) track.shift();
          tracksRef.current.set(mmsi, track);

        } else if (MessageType === 'ShipStaticData') {
          const sd = Message.ShipStaticData;
          shipsRef.current.set(mmsi, {
            ...existing,
            name:        sd.Name?.trim() || MetaData.ShipName?.trim() || existing.name,
            imo:         sd.ImoNumber  || existing.imo,
            callSign:    sd.CallSign?.trim()    || existing.callSign,
            shipType:    sd.Type       ?? existing.shipType,
            category:    getShipCategory(sd.Type ?? existing.shipType),
            destination: sd.Destination?.trim() || existing.destination,
          });
        }
      };

      ws.onerror = () => {};
      ws.onclose = () => { if (!cancelled) setTimeout(connect, 3000); };
    }

    connect();

    return () => {
      cancelled = true;
      clearInterval(interval);
      wsRef.current?.close();
    };
  }, [mapRef]);

  return { tracksRef };
}
