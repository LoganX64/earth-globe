# BHARAT // ATLAS

Interactive 3D Earth globe with official Survey of India cartography — rendered 100% client-side on an HTML canvas.

## Features

- **Orthographic 3D globe** with authentic Survey of India boundaries (state borders, J&K, Ladakh, outer boundary)
- **Auto-rotation** with adjustable speed and direction (drag to spin, scroll to zoom)
- **Theme presets** — light / dark cartography styles
- **State highlight** — click a state on the globe or use the controls HUD
- **Location pins & search** — built-in Indian cities plus worldwide search via OpenStreetMap Nominatim
- **Embed mode** — isolate the globe with zero UI chrome
- **Keyboard shortcuts** — `SPACE` pause/rotate · `X` clear pin · `C` controls · `R` reset view

## Tech stack

React 19 · Vite · TypeScript · Tailwind CSS v4 · d3-geo · canvas 2D

No backend, no database, no API keys. Everything ships as static files.

## Run locally

**Prerequisites:** Node.js + [pnpm](https://pnpm.io)

```bash
pnpm install       # install dependencies
pnpm run dev       # start dev server at http://localhost:3000
```

Other scripts:

```bash
pnpm run lint      # type-check (tsc --noEmit)
pnpm run build     # production build to dist/
pnpm run preview   # serve the production build
```

### Environment variables

**None.** The app requires no API keys or env configuration — cloning and `pnpm install` is all you need.

The only network call is keyless geocoding against the public OSM Nominatim service (`src/services/geocoding.ts`), with a built-in offline fallback list of Indian cities.

## URL parameters

| Param | Effect |
|---|---|
| `?embed=true` | Pure globe view, no UI chrome |
| `?onlyIndia=true` | Render only the Indian territory |
| `?marker=mumbai` | Pre-select a location pin (`mumbai`, `thrissur`, `ulhasnagar`, or any id from `src/data/defaultLocations.ts`) |
| `?state=Kerala` | Pre-highlight a state |
| `?theme=<id>` | Pre-select a theme |
| `?speed=2` | Auto-rotate speed multiplier |
| `?rotate=false` | Start with rotation paused |
| `?borders=false` / `?grid=false` / `?atmosphere=false` / `?stars=false` | Toggle layer visibility |

Example embed:

```html
<iframe src="https://your-domain.vercel.app/?embed=true&onlyIndia=true"
        width="500" height="500"></iframe>
```

## Project structure

```
src/
├── App.tsx                     # App shell, routing of state, keyboard shortcuts
├── components/
│   ├── EarthGlobe/             # Canvas globe renderer (projection, markers, themes)
│   ├── Navbar.tsx              # Header, search, controls toggle
│   ├── GlobeControls.tsx       # Customizer HUD (layers, rotation, states, pins)
│   ├── LocationSearchBar.tsx   # Search input + Nominatim client
│   ├── MumbaiDetailsCard.tsx   # Active location details card
│   └── CodeExportModal.tsx     # Embed / export helper
├── data/
│   ├── defaultLocations.ts     # Cities, states, marker presets
│   └── india-*.json            # Survey of India boundary GeoJSON
└── services/
    └── geocoding.ts            # Nominatim search + local fallback
```

## Deploy

Any static host works (Vercel, Netlify, GitHub Pages). For Vercel, `vercel.json` is already configured with the SPA rewrite rule.
