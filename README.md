# BHARAT // ATLAS

An interactive 3D globe of India, drawn on a 2D canvas with the country's official Survey of India boundaries. Built for embedding: the same build serves a full customizer UI and a chrome-free iframe you can drop into any site.

**Live site:** [earth-globe-nine.vercel.app](https://earth-globe-nine.vercel.app)

![Interactive 3D India globe](https://raw.githubusercontent.com/LoganX64/earth-globe/main/public/og-image.png)

## Features

- **Orthographic 3D globe** rendered per-frame on canvas — official state borders, J&K, Ladakh and the outer boundary
- **Auto-rotation** with adjustable speed, direction and presets (drag to spin, scroll to zoom)
- **12 cartography themes** — 6 light, 6 dark, with a live light/dark switch
- **State highlight** — hover or click a state on the globe, or pick from the customizer
- **Location pins & search** — built-in Indian cities plus worldwide geocoding via OpenStreetMap Nominatim, with an offline fallback list
- **Layer toggles** — graticule, atmosphere, starfield, state borders, isolated India map
- **Backdrop control** — keep a theme's background, swap it for a neutral white/black, or set a separate custom colour for light and dark themes
- **Embeddable** — zero-chrome iframe with configurable size, mode, layers and zoom behaviour
- **Keyboard shortcuts** — `SPACE` pause/rotate · `X` clear pin · `ESC` close panel · `C` customizer · `T` light/dark · `R` reset view

## Tech stack

React 19 · Vite · TypeScript · Tailwind CSS v4 · d3-geo + topojson · canvas 2D

No backend, no database, no API keys. Everything ships as static files.
Settings persist to `localStorage`; URL params always win over saved values.

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

Two outbound network calls:

- **Keyless geocoding** against the public OSM Nominatim service (`src/services/geocoding.ts`), with a built-in offline fallback list of Indian cities.
- **Vercel Analytics** (`@vercel/analytics`), injected in both `main.tsx` and `embed.tsx`. It is a no-op when the site is not deployed on Vercel, and can be removed by deleting the `inject()` call.

## Embedding

`embed.html` is a standalone entrypoint with no site chrome, configured entirely through query parameters. A `postMessage` API lets a host page drive it at runtime — see [EMBED.md](EMBED.md) for the full reference.

```html
<iframe src="https://earth-globe-nine.vercel.app/embed.html?onlyIndia=true&mode=dark"
        width="500" height="500" style="border: none; border-radius: 16px;"></iframe>
```

## URL parameters

Supported on both the main app and `embed.html`, unless marked *embed only*.

| Param | Effect |
|---|---|
| `?embed=true` | Pure globe view, no UI chrome. `?pure=true` and `?mode=embed` are aliases |
| `?onlyIndia=true` | Render only the Indian territory. `?indiaOnly=true` is an alias |
| `?marker=<id>` | Pre-select a location pin. Any `id` from `POPULAR_INDIAN_LOCATIONS` in `src/data/defaultLocations.ts` works on the main app, e.g. `mumbai-maharashtra`, `thrissur-kerala`, `srinagar-jk`. On `embed.html` there is no id lookup — any value drops a pin at India's centroid (20.5937, 78.9629) labelled with that value |
| `?lat=` / `?lng=` | Place a pin at explicit coordinates (must be given as a pair) |
| `?name=` / `?region=` | Label and region for a custom `lat`/`lng` pin |
| `?state=Kerala` | Pre-highlight a state |
| `?theme=<id>` | Pre-select one of the 12 themes |
| `?mode=light` / `?mode=dark` | Force a light or dark map. Constrains `theme` to the matching group |
| `?lightTheme=<id>` / `?darkTheme=<id>` | Theme to use when the mode flips to light or dark |
| `?speed=2` | Auto-rotate speed multiplier. Not clamped — `0` stops rotation, and the slider's own range is `0.0`–`4.0` |
| `?rotate=false` | Start with rotation paused |
| `?drag=false` | Disable drag to rotate |
| `?borders=false` / `?grid=false` / `?atmosphere=false` / `?stars=false` | Toggle layer visibility |
| `?background=false` | Swap the theme's backdrop for a neutral one — pure white under a light theme, pure black under a dark theme |
| `?lightBackground=` / `?darkBackground=` | Custom backdrop colour per polarity, e.g. `%230a0a0a`. A dark theme never picks up the light theme's value. Applied to the globe's canvas only, never the page around it |
| `?width=` / `?height=` | Embed dimensions, e.g. `500px` or `100%`. `?size=500px` sets both at once |
| `?zoomLevel=2` | *embed only* — how close the globe starts (`0.65`–`3.8`, default `1.1`; clamped). The main app starts at a fixed `1.2` |
| `?zoom=false` | *embed only* — disable zooming entirely (both buttons and scroll) |
| `?zoomButtons=false` | *embed only* — hide the floating +/− zoom buttons |
| `?scrollZoom=false` | *embed only* — disable zooming on mouse scroll / trackpad |

To lock the globe at a fixed size, combine the zoom parameters:

```
embed.html?zoomLevel=2.0&zoomButtons=false&scrollZoom=false
```

## Project structure

```
src/
├── main.tsx                    # Main entrypoint (analytics inject, React root)
├── App.tsx                     # App shell, state routing, keyboard shortcuts
├── embed.tsx                   # Chrome-free iframe entrypoint (postMessage API)
├── components/
│   ├── EarthGlobe/             # Canvas globe renderer (projection, markers, themes)
│   ├── Navbar.tsx              # Header, search, controls toggle
│   ├── GlobeControls.tsx       # Customizer HUD (layers, rotation, states, pins)
│   ├── LocationSearchBar.tsx   # Search input + Nominatim client
│   ├── CityDetailsCard.tsx     # Active location details card
│   └── CodeExportModal.tsx     # Live embed preview + export helper
├── data/
│   ├── defaultLocations.ts     # Cities, states, marker presets
│   └── india-*.json            # Survey of India boundary GeoJSON
└── services/
    └── geocoding.ts            # Nominatim search + local fallback
```

## Self-hosting

The build is fully static — no backend, no database, no API keys. Run
`pnpm run build` and serve `dist/` from any static host.

### Allow the globe to be embedded

The globe is meant to sit inside other sites as an iframe, which browsers block
by default. The host must send:

```
Content-Security-Policy: frame-ancestors *;
```

Without that header the browser refuses to frame the page: you get an empty
iframe and nothing in your own console pointing at the cause. Once you have
your own domains, narrow it:

```
Content-Security-Policy: frame-ancestors https://your-site.com;
```

`X-Frame-Options` is not an alternative — it has no permissive value that
works. See [EMBED.md](EMBED.md#security-headers).

### Rewrites

`vercel.json` configures two:

| Source | Destination | Why |
|---|---|---|
| `/embed` | `/embed.html` | Short, stable embed URL. Must match **before** the catch-all, or `/embed` silently serves the full app instead of the chrome-free globe |
| `/(.*)` | `/index.html` | Serves the app for unknown paths |

The catch-all is not there for routing — the app has no client-side router.
On Netlify translate it to `_redirects`; on GitHub Pages drop it, or copy
`index.html` to `404.html`.
