# Embed the Interactive 3D India Globe

Drop an interactive 3D India Globe into any website with a single copy-paste snippet. Works with WordPress, Webflow, plain HTML, React, or any framework.

---

## Quick Start

```html
<iframe
  src="https://your-domain.com/embed.html?embed=true&mode=dark&theme=black-and-white"
  width="500"
  height="500"
  style="border: none; border-radius: 16px; overflow: hidden; background: #000000;"
  allow="fullscreen"
  title="India 3D Interactive Map Globe"
  aria-label="Interactive 3D India Globe"
></iframe>
```

That's it. The globe loads with auto-rotation, drag, and zoom enabled.

---

## Query Parameters

All configuration is done via URL query parameters. No JavaScript required.

### Appearance

| Param | Values | Default | Description |
|-------|--------|---------|-------------|
| `mode` | `light` / `dark` | `light` | Map color mode. When set, `theme` is only honoured if it belongs to the matching light/dark group; otherwise the default for that mode is used |
| `theme` | Theme ID (see below) | `daylight-atlas` | Specific color theme (initial) |
| `lightTheme` | Light theme ID | `daylight-atlas` | Theme to use when mode is light |
| `darkTheme` | Dark theme ID | `black-and-white` | Theme to use when mode is dark |
| `onlyIndia` | `true` / `false` | `false` | Show only India (isolated) or world with India featured. `indiaOnly=true` is accepted as an alias |
| `width` | e.g. `500px`, `100%` | `100%` | Embed width. `size=500px` sets both width and height |
| `height` | e.g. `500px`, `600px` | `100%` | Embed height. `size=500px` sets both width and height |

### Interaction

| Param | Values | Default | Description |
|-------|--------|---------|-------------|
| `drag` | `true` / `false` | `true` | Enable drag to rotate |
| `zoom` | `true` / `false` | `true` | Master off-switch: `false` disables both the +/− buttons and scroll zoom |
| `zoomButtons` | `true` / `false` | `true` | Show the floating +/− zoom buttons |
| `scrollZoom` | `true` / `false` | `true` | Zoom on mouse scroll / trackpad |
| `zoomLevel` | `0.65` – `3.8` | `1.1` | How close the globe starts. Values outside the range are clamped |
| `rotate` | `true` / `false` | `true` | Enable auto-rotation |
| `speed` | `0.0` – `4.0` | `1.2` | Rotation speed. Not clamped — `0` stops rotation, `rotate=false` disables it entirely |

To lock the globe at a fixed size, combine the three:

```
embed.html?zoomLevel=2.0&zoomButtons=false&scrollZoom=false
```

### Layers

| Param | Values | Default | Description |
|-------|--------|---------|-------------|
| `borders` | `true` / `false` | `true` | Show state borders |
| `grid` | `true` / `false` | `true` | Show lat/lng graticule |
| `atmosphere` | `true` / `false` | `true` | Show atmosphere glow |
| `stars` | `true` / `false` | `true` | Show starfield |

### Markers & Highlights

| Param | Values | Default | Description |
|-------|--------|---------|-------------|
| `marker` | Marker ID or name | — | Pre-select a marker. Without `lat`/`lng` the marker falls back to India's centroid (20.5937, 78.9629) |
| `lat` | Latitude (e.g. `19.0760`) | — | Custom marker latitude (ignored unless paired with `lng`) |
| `lng` | Longitude (e.g. `72.8777`) | — | Custom marker longitude (ignored unless paired with `lat`) |
| `name` | Display name | — | Marker label. Defaults to the marker ID, or `Location` for a custom lat/lng marker |
| `region` | State/region name | — | Marker region |
| `state` | State name (e.g. `Maharashtra`) | — | Highlight a state |

---

## Theme Presets

### Dark Themes

| Theme ID | Description |
|----------|-------------|
| `black-and-white` | Classic black & white |
| `stark-contrast-bw` | High contrast B&W |
| `silver-titanium` | Silver metallic |
| `golden-noir` | Gold on black |
| `cyber-emerald` | Emerald green glow |
| `deep-sapphire` | Deep blue sapphire |

### Light Themes

| Theme ID | Description |
|----------|-------------|
| `daylight-atlas` | Classic atlas colors |
| `ceramic-pearl` | Soft pearl white |
| `nordic-frost` | Cool Nordic tones |
| `paper-cartography` | Vintage paper map |
| `azure-daylight` | Azure blue sky |
| `inverted-bw` | Inverted black & white, minimalist light |

---

## Custom Marker Example

```html
<iframe
  src="https://your-domain.com/embed.html?embed=true&mode=dark&theme=black-and-white&lat=19.0760&lng=72.8777&name=Mumbai&region=Maharashtra&state=Maharashtra"
  width="500"
  height="500"
  style="border: none; border-radius: 16px; overflow: hidden; background: #000000;"
  allow="fullscreen"
  title="India 3D Interactive Map Globe"
  aria-label="Interactive 3D India Globe"
></iframe>
```

---

## postMessage API

Control the globe in real-time from the parent page.

### Who Can Send Commands

This is a **public, unauthenticated API.** Anyone may embed `embed.html` and
script it — there is no key, token, or session. Do not treat it as a
confidential channel or send anything through it that must stay private.

The embed accepts a message **only from the window that actually framed it**
(`event.source === window.parent`). A pop-up, opener, or any other frame cannot
drive the globe even though it shares the same origin policy.

Self-hosting and want to lock this down to specific sites? Set
`EMBED_ALLOWED_PARENT_ORIGINS` in `src/embed.tsx` to a list of origins, e.g.
`['https://your-site.com']`. Leave it empty to allow any parent page.

Always pass your own origin as the target rather than `'*'`:

```javascript
const PARENT_ORIGIN = 'https://your-site.com';
iframe.contentWindow.postMessage(message, PARENT_ORIGIN);
```

`targetOrigin` is a delivery gate: the browser drops the message unless the
receiving window's *current* origin matches. `'*'` waives that check, so if the
globe's domain is ever compromised, hijacked via a stale subdomain, or opened
directly, whatever is framed there receives your commands and any data in them.
The examples below all use `PARENT_ORIGIN` — set it once to your own origin.

Because the payload is public map data and no secret is ever transmitted, `'*'`
is a defensible shortcut when you need a zero-config snippet. It just trades
away the origin check.

### Sending Commands

```javascript
// Set this to your own page's origin, once.
const PARENT_ORIGIN = 'https://your-site.com';
const iframe = document.getElementById('globe-embed');
const send = (command, payload) =>
  iframe.contentWindow.postMessage(
    payload === undefined
      ? { type: 'earth-globe', command }
      : { type: 'earth-globe', command, payload },
    PARENT_ORIGIN
  );

// Fly to coordinates
send('flyTo', { lat: 19.0760, lng: 72.8777, zoomMultiplier: 1.8 });

// Set a marker
send('setMarker', {
  marker: {
    id: 'mumbai',
    name: 'Mumbai',
    region: 'Maharashtra',
    country: 'India',
    lat: 19.0760,
    lng: 72.8777,
    isPrimary: true
  }
});

// Clear marker
send('clearMarker');

// Highlight a state and fly to it
send('setHighlightState', { stateName: 'Maharashtra' });

// Focus a state without changing the highlight
send('focusState', { stateName: 'Maharashtra', zoomMultiplier: 2.2 });

// Clear state highlight
send('clearHighlightState');

// Switch theme
send('setTheme', { themeId: 'cyber-emerald' });

// Reset view
send('resetView');

// Set zoom level
send('setZoom', { zoom: 2.0 });

// Toggle India-only mode
send('setOnlyIndia', { onlyIndia: true });

// Toggle layers
send('setShowStateBorders', { show: false });
send('setShowGraticule', { show: false });
send('setShowAtmosphere', { show: false });
send('setShowStars', { show: false });

// Toggle auto-rotate
send('setAutoRotate', { enabled: false });

// Invert the current auto-rotate state
send('toggleAutoRotate');

// Set rotation speed
send('setAutoRotateSpeed', { speed: 2.5 });
```

The same message written out in full, for reference:

```javascript
iframe.contentWindow.postMessage({
  type: 'earth-globe',
  command: 'flyTo',
  payload: { lat: 19.0760, lng: 72.8777, zoomMultiplier: 1.8 }
}, PARENT_ORIGIN);
```

### Receiving Events

The embed posts one event back to the parent page: `ready`, sent once on mount.
It is addressed to the framing page's origin (taken from `document.referrer`), or
to `'*'` when the browser withholds the referrer.

```javascript
window.addEventListener('message', (event) => {
  // Inbound messages deserve the same origin check you send outbound.
  if (event.origin !== PARENT_ORIGIN) return;
  if (event.data?.type !== 'earth-globe') return;
  if (event.data.command === 'ready') {
    console.log('Globe is ready');
  }
});
```

> Note that `event.origin` here is the *globe's* origin, not your own — swap
> `PARENT_ORIGIN` for the domain you host the globe on, e.g.
> `'https://earth-globe-nine.vercel.app'`.

> **Note:** the embed does not currently forward clicks back to the host. There
> are no `stateClick` or `markerClick` events — wrap the iframe in an overlay if
> you need your own click tracking.

---

## Security Headers

The hosting server must allow the globe to be embedded in iframes. Configure one of:

**Option A: Content Security Policy (recommended)**
```
Content-Security-Policy: frame-ancestors *;
```

**Option B: Allow specific domains**
```
Content-Security-Policy: frame-ancestors https://your-site.com https://another-site.com;
```

> **Note:** `X-Frame-Options` is **not** a valid alternative here. It only accepts
> `DENY`, `SAMEORIGIN`, or `ALLOW-FROM <uri>` — there is no `ALLOWALL` value, and
> `ALLOW-FROM` is deprecated and ignored by all modern browsers. Use
> `frame-ancestors` above.

---

## FAQ

**Q: Does it work with WordPress?**
A: Yes. Paste the iframe code in a Custom HTML block or use an iframe plugin.

**Q: Does it work with Webflow?**
A: Yes. Use an Embed element and paste the iframe code.

**Q: Is it responsive?**
A: Yes. Use `width=100%` and `height=600px` for responsive embeds.

**Q: Does it work offline?**
A: No. The globe is loaded from your server via iframe.

**Q: Can I use multiple globes on the same page?**
A: Yes. Each iframe is independent.

**Q: What browsers are supported?**
A: All modern browsers (Chrome, Firefox, Safari, Edge). Uses Canvas 2D — no WebGL required.

**Q: How do I customize the marker color?**
A: Markers use the theme's `markerPrimary` and `markerSecondary` colors. Switch themes to change marker colors.
