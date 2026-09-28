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
| `mode` | `light` / `dark` | `light` | Map color mode |
| `theme` | Theme ID (see below) | `daylight-atlas` | Specific color theme (initial) |
| `lightTheme` | Light theme ID | `daylight-atlas` | Theme to use when mode is light |
| `darkTheme` | Dark theme ID | `black-and-white` | Theme to use when mode is dark |
| `onlyIndia` | `true` / `false` | `false` | Show only India (isolated) or world with India featured |
| `width` | e.g. `500px`, `100%` | `100%` | Embed width |
| `height` | e.g. `500px`, `600px` | `100%` | Embed height |

### Interaction

| Param | Values | Default | Description |
|-------|--------|---------|-------------|
| `drag` | `true` / `false` | `true` | Enable drag to rotate |
| `zoom` | `true` / `false` | `true` | Master off-switch: `false` disables both the +/− buttons and scroll zoom |
| `zoomButtons` | `true` / `false` | `true` | Show the floating +/− zoom buttons |
| `scrollZoom` | `true` / `false` | `true` | Zoom on mouse scroll / trackpad |
| `zoomLevel` | `0.65` – `3.8` | `1.1` | How close the globe starts. Values outside the range are clamped |
| `rotate` | `true` / `false` | `true` | Enable auto-rotation |
| `speed` | `0.1` – `5.0` | `1.2` | Rotation speed |

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
| `marker` | Marker ID or name | — | Pre-select a marker |
| `lat` | Latitude (e.g. `19.0760`) | — | Custom marker latitude |
| `lng` | Longitude (e.g. `72.8777`) | — | Custom marker longitude |
| `name` | Display name | — | Marker label |
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

Always pass the target origin rather than `'*'` in your own calls:

```javascript
iframe.contentWindow.postMessage(message, 'https://your-site.com');
```

### Sending Commands

```javascript
const iframe = document.getElementById('globe-embed');

// Fly to coordinates
iframe.contentWindow.postMessage({
  type: 'earth-globe',
  command: 'flyTo',
  payload: { lat: 19.0760, lng: 72.8777, zoomMultiplier: 1.8 }
}, '*');

// Set a marker
iframe.contentWindow.postMessage({
  type: 'earth-globe',
  command: 'setMarker',
  payload: {
    marker: {
      id: 'mumbai',
      name: 'Mumbai',
      region: 'Maharashtra',
      country: 'India',
      lat: 19.0760,
      lng: 72.8777,
      isPrimary: true
    }
  }
}, '*');

// Clear marker
iframe.contentWindow.postMessage({
  type: 'earth-globe',
  command: 'clearMarker'
}, '*');

// Highlight a state
iframe.contentWindow.postMessage({
  type: 'earth-globe',
  command: 'setHighlightState',
  payload: { stateName: 'Maharashtra' }
}, '*');

// Clear state highlight
iframe.contentWindow.postMessage({
  type: 'earth-globe',
  command: 'clearHighlightState'
}, '*');

// Switch theme
iframe.contentWindow.postMessage({
  type: 'earth-globe',
  command: 'setTheme',
  payload: { themeId: 'cyber-emerald' }
}, '*');

// Reset view
iframe.contentWindow.postMessage({
  type: 'earth-globe',
  command: 'resetView'
}, '*');

// Set zoom level
iframe.contentWindow.postMessage({
  type: 'earth-globe',
  command: 'setZoom',
  payload: { zoom: 2.0 }
}, '*');

// Toggle India-only mode
iframe.contentWindow.postMessage({
  type: 'earth-globe',
  command: 'setOnlyIndia',
  payload: { onlyIndia: true }
}, '*');

// Toggle layers
iframe.contentWindow.postMessage({
  type: 'earth-globe',
  command: 'setShowStateBorders',
  payload: { show: false }
}, '*');

iframe.contentWindow.postMessage({
  type: 'earth-globe',
  command: 'setShowGraticule',
  payload: { show: false }
}, '*');

iframe.contentWindow.postMessage({
  type: 'earth-globe',
  command: 'setShowAtmosphere',
  payload: { show: false }
}, '*');

iframe.contentWindow.postMessage({
  type: 'earth-globe',
  command: 'setShowStars',
  payload: { show: false }
}, '*');

// Toggle auto-rotate
iframe.contentWindow.postMessage({
  type: 'earth-globe',
  command: 'setAutoRotate',
  payload: { enabled: false }
}, '*');

// Set rotation speed
iframe.contentWindow.postMessage({
  type: 'earth-globe',
  command: 'setAutoRotateSpeed',
  payload: { speed: 2.5 }
}, '*');
```

### Receiving Events

```javascript
window.addEventListener('message', (event) => {
  if (event.data?.type !== 'earth-globe') return;

  const { command, payload } = event.data;

  switch (command) {
    case 'ready':
      console.log('Globe is ready');
      break;
    case 'stateClick':
      console.log('State clicked:', payload.stateName);
      break;
    case 'markerClick':
      console.log('Marker clicked:', payload.marker);
      break;
  }
});
```

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
