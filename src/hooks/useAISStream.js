import { useEffect, useRef } from 'react';
import { getShipCategory } from '../utils/shipTypes';
import { mmsiToFlag } from '../utils/midFlags';

const WS_URL  = 'wss://stream.aisstream.io/v0/stream';
const API_KEY = import.meta.env.VITE_AIS_API_KEY;

const SHIP_TTL     = 5 * 60 * 1000; // remove ship after 5 min of silence
const MAX_TRACK_PTS = 500;
const MOVE_DEBOUNCE = 600; // ms after pan/zoom stops before reconnect

function getBBox(map) {
  const b = map.getBounds();
  return [[b.getSouth(), b.getWest()], [b.getNorth(), b.getEast()]];
}

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
        flag:        ship.flagEmoji ?? '',
        country:     ship.country ?? '',
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

export function useAISStream({ mapRef }) {
  const shipsRef  = useRef(new Map());
  const tracksRef = useRef(new Map());
  const wsRef     = useRef(null);

  useEffect(() => {
    let cancelled = false;

    // --- WebSocket ---

    function openWS(bbox) {
      // Tear down old connection without triggering auto-reconnect
      const old = wsRef.current;
      if (old) {
        old.onclose = null;
        old.close();
      }

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (ws !== wsRef.current) return;
        ws.send(JSON.stringify({
          APIKey:             API_KEY,
          BoundingBoxes:      [bbox],
          FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
        }));
      };

      ws.onmessage = async (evt) => {
        if (cancelled) return;
        const text = evt.data instanceof Blob ? await evt.data.text() : evt.data;
        let data;
        try { data = JSON.parse(text); } catch { return; }

        const { MessageType, MetaData, Message } = data;
        const mmsi = String(MetaData?.MMSI || '');
        if (!mmsi) return;

        const flagInfo = mmsiToFlag(mmsi);
        const existing = shipsRef.current.get(mmsi) || {
          mmsi,
          flagEmoji: flagInfo?.emoji ?? '',
          country:   flagInfo?.country ?? '',
        };

        if (MessageType === 'PositionReport') {
          const pr  = Message.PositionReport;
          const hdg = pr.TrueHeading;
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
            lastSeen:  Date.now(),
          });

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
            lastSeen:    Date.now(),
          });
        }
      };

      ws.onerror = () => {};
      ws.onclose = () => {
        if (cancelled) return;
        setTimeout(() => {
          const map = mapRef.current;
          if (map) openWS(getBBox(map));
        }, 3000);
      };
    }

    // Connect once map is ready
    function tryConnect() {
      if (cancelled) return;
      const map = mapRef.current;
      if (!map) { setTimeout(tryConnect, 200); return; }
      openWS(getBBox(map));
    }
    tryConnect();

    // --- Map flush + TTL pruning at 4 fps ---

    const flushInterval = setInterval(() => {
      const map = mapRef.current;
      if (!map) return;
      const source = map.getSource('ships');
      if (!source) return;

      const now = Date.now();
      for (const [mmsi, ship] of shipsRef.current) {
        if (ship.lastSeen && now - ship.lastSeen > SHIP_TTL) {
          shipsRef.current.delete(mmsi);
          tracksRef.current.delete(mmsi);
        }
      }

      source.setData(buildGeoJSON(shipsRef.current));
    }, 250);

    // --- Reconnect on pan/zoom ---

    let moveTimer;
    function onMoveEnd() {
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => {
        const map = mapRef.current;
        if (map && !cancelled) openWS(getBBox(map));
      }, MOVE_DEBOUNCE);
    }

    function attachMoveListener() {
      if (cancelled) return;
      const map = mapRef.current;
      if (!map) { setTimeout(attachMoveListener, 200); return; }
      map.on('moveend', onMoveEnd);
    }
    attachMoveListener();

    return () => {
      cancelled = true;
      clearInterval(flushInterval);
      clearTimeout(moveTimer);
      const map = mapRef.current;
      if (map) map.off('moveend', onMoveEnd);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [mapRef]);

  return { tracksRef, shipsRef };
}
