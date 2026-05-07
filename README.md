# MarineEye

Real-time vessel tracking on an interactive dark map. Ships stream live from [AISStream.io](https://aisstream.io) and update continuously — click any vessel for details, filter by type, watch tracks accumulate as ships move.

**Live demo → [time2map.github.io/marine-eye](https://time2map.github.io/marine-eye/)**

## Features

- **Live AIS data** — WebSocket stream, sub-second latency, auto-reconnects
- **Arrow icons** coloured by vessel category (cargo, tanker, passenger, fishing, high-speed, sailing, tug, other)
- **Hover tooltip** with name, category and speed
- **Click info panel** — MMSI, IMO, call sign, speed, course, heading, destination
- **Category filter** — click a legend item to isolate that type; click more to combine; click all off to reset
- **Live track** — historical trail fades from transparent to the vessel's colour; updates every second while a ship is selected

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Vite 5 + React 18 |
| Map | MapLibre GL JS v5 |
| Basemap | CartoDB Dark Matter |
| AIS data | [AISStream.io](https://aisstream.io) WebSocket |

## Run locally

```bash
git clone https://github.com/time2map/marine-eye.git
cd marine-eye
npm install
```

Create `.env`:

```
VITE_AIS_API_KEY=your_key_here
```

```bash
npm run dev
```

Get a free API key at [aisstream.io](https://aisstream.io).

## Deploy

The repo ships a GitHub Actions workflow that builds and publishes to GitHub Pages on every push to `main`. Set `VITE_AIS_API_KEY` as a repository secret in **Settings → Secrets → Actions**.

## License

MIT © [time2map](https://github.com/time2map)
