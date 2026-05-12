# Live Globe Screensaver

A fullscreen interactive 3D globe screensaver built with Electron, React, and Three.js. Visualizes real-time data layers from public APIs directly onto a rotating Earth.

## Features

- **3D interactive globe** rendered with Three.js — drag to rotate, scroll to zoom
- **Live data layers** switchable on the fly:
  - Earthquakes (USGS feed)
  - Internet BGP updates (RIPE NCC)
  - NASA EONET natural events
  - Live flights (OpenSky Network)
  - Crypto market heatmap
  - Active wildfires
  - Radio/ADS-B signals
- **Country borders** overlaid from GeoJSON
- **Auto-rotation** with smooth animation loop
- **Fullscreen / screensaver mode** via Electron

## Tech Stack

| Layer | Library |
|---|---|
| Desktop shell | [Electron](https://www.electronjs.org/) |
| UI framework | [React 19](https://react.dev/) |
| 3D rendering | [Three.js](https://threejs.org/) |
| Build tool | [Vite](https://vitejs.dev/) |
| Icons | [Lucide React](https://lucide.dev/) |

## Project Structure

```
screensaver/
├── electron/
│   ├── main.js          # Electron main process
│   └── preload.js       # Preload script
├── src/
│   ├── App.jsx          # Main React component + globe logic
│   ├── styles.css       # Global styles
│   └── data/
│       └── countries.geo.json
├── public/
│   └── countries.geo.json
├── index.html
├── package.json
└── vite.config.js
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm

### Install dependencies

```bash
npm install
```

### Run in development mode

```bash
npm run start
```

This starts the Vite dev server and launches Electron concurrently.

### Build

```bash
npm run build
```

## License

Private — all rights reserved.
