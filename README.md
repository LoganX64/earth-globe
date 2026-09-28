# BHARAT // ATLAS

An interactive 3D globe of India, drawn on a 2D canvas with the country's official Survey of India boundaries. Built for embedding: the same build serves a full customizer UI and a chrome-free iframe you can drop into any site.

**Live site:** [earth-globe-nine.vercel.app](https://earth-globe-nine.vercel.app)

## Features

- **Orthographic 3D globe** rendered per-frame on canvas — official state borders, J&K, Ladakh and the outer boundary
- **Auto-rotation** with adjustable speed, direction and presets (drag to spin, scroll to zoom)
- **11 cartography themes** — 6 light, 5 dark, with a live light/dark switch
- **State highlight** — hover or click a state on the globe, or pick from the customizer
- **Location pins & search** — built-in Indian cities plus worldwide geocoding via OpenStreetMap Nominatim, with an offline fallback list
- **Layer toggles** — graticule, atmosphere, starfield, state borders, isolated India map
- **Embeddable** — zero-chrome iframe with configurable size, mode, layers and zoom behaviour
- **Keyboard shortcuts** — `SPACE` pause/rotate · `X` clear pin · `C` customizer · `T` light/dark · `R` reset view

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

## Embedding

`embed.html` is a standalone entrypoint with no site chrome, configured entirely through query parameters. A `postMessage` API lets a host page drive it at runtime — see [EMBED.md](EMBED.md) for the full reference.

```html
<iframe src="https://earth-globe-nine.vercel.app/embed.html?onlyIndia=true&mode=dark"
        width="500" height="500" style="border: none; border-radius: 16px;"></iframe>
```

## URL parameters

Available on both the main app and `embed.html`.

| Param | Effect |
|---|---|
| `?embed=true` | Pure globe view, no UI chrome |
| `?onlyIndia=true` | Render only the Indian territory |
| `?marker=mumbai` | Pre-select a location pin (`mumbai`, `thrissur`, `ulhasnagar`, or any id from `src/data/defaultLocations.ts`) |
| `?lat=` / `?lng=` | Place a pin at explicit coordinates |
| `?state=Kerala` | Pre-highlight a state |
| `?theme=<id>` | Pre-select one of the 11 themes |
| `?mode=light` / `?mode=dark` | Force a light or dark map |
| `?speed=2` | Auto-rotate speed multiplier (`0.1`–`5.0`) |
| `?rotate=false` | Start with rotation paused |
| `?drag=false` | Disable drag to rotate |
| `?borders=false` / `?grid=false` / `?atmosphere=false` / `?stars=false` | Toggle layer visibility |
| `?zoomLevel=2` | How close the globe starts (`0.65`–`3.8`, default `1.1`) |
| `?zoomButtons=false` | Hide the floating +/− zoom buttons |
| `?scrollZoom=false` | Disable zooming on mouse scroll / trackpad |
| `?zoom=false` | Disable zooming entirely (both buttons and scroll) |
| `?width=` / `?height=` | Embed dimensions, e.g. `500px` or `100%` |

To lock the globe at a fixed size, combine the zoom parameters:

```
embed.html?zoomLevel=2.0&zoomButtons=false&scrollZoom=false
```

## Project structure

```
src/
├── App.tsx                     # App shell, state routing, keyboard shortcuts
├── embed.tsx                   # Chrome-free iframe entrypoint (postMessage API)
├── components/
│   ├── EarthGlobe/             # Canvas globe renderer (projection, markers, themes)
│   ├── Navbar.tsx              # Header, search, controls toggle
│   ├── GlobeControls.tsx       # Customizer HUD (layers, rotation, states, pins)
│   ├── LocationSearchBar.tsx   # Search input + Nominatim client
│   ├── MumbaiDetailsCard.tsx   # Active location details card
│   └── CodeExportModal.tsx     # Live embed preview + export helper
├── data/
│   ├── defaultLocations.ts     # Cities, states, marker presets
│   └── india-*.json            # Survey of India boundary GeoJSON
└── services/
    └── geocoding.ts            # Nominatim search + local fallback
```

## Deploy

Any static host works (Vercel, Netlify, GitHub Pages). For Vercel, `vercel.json` is already configured with the SPA rewrite rule.
