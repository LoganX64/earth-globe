# Iframe Embed Plan Tracker

## Goal
Make the Earth Globe component embeddable via iframe only, so other developers can drop it into any website (WordPress, Webflow, plain HTML, etc.) with a single copy-paste snippet.

---

## Phase 1: Fix CodeExportModal iframe generation
**File:** `src/components/CodeExportModal.tsx`

- [ ] Add `width` and `height` query params to the generated embed URL
- [ ] Add `allow="fullscreen"` attribute to generated iframe
- [ ] Remove `loading="lazy"` (globe should render immediately)
- [ ] Add `aria-label` attribute for accessibility
- [ ] Escape single quotes in marker names/regions in generated code
- [ ] Remove or hide the "React / Next.js Component" tab (iframe-only approach)
- [ ] Add a "Copy" button with success feedback for the iframe code

---

## Phase 2: Create standalone embed entry point
**New files:** `embed.html`, `src/embed.tsx`
**Modified files:** `vite.config.ts`

- [ ] Create `embed.html` — minimal HTML that mounts only the globe in embed mode
- [ ] Create `src/embed.tsx` — lightweight entry point that reads URL params and renders only `EarthGlobe` + zoom controls (no TopBar, no GlobeControls, no other app chrome)
- [ ] Update `vite.config.ts` to build both the main app and the embed entry point
- [ ] Verify embed bundle size is significantly smaller than main app bundle

---

## Phase 3: Add postMessage API for parent communication
**File:** `src/embed.tsx` (or `src/App.tsx` embed mode section)

- [ ] Listen for `postMessage` events from the parent page
- [ ] Support commands: `flyTo`, `setTheme`, `setHighlightState`, `resetView`, `setZoom`
- [ ] Parent page can send: `window.frames[0].postMessage({ type: 'earth-globe', command: 'flyTo', lat: 19.07, lng: 72.87 }, '*')`
- [ ] Globe posts back events to parent: `stateClick`, `markerClick`, `ready`

---

## Phase 4: Add embed documentation
**New file:** `EMBED.md`

- [ ] Quick start copy-paste example
- [ ] All available query params table
- [ ] postMessage API reference
- [ ] Customization examples (markers, themes, states)
- [ ] FAQ (CORS, X-Frame-Options, CSP)

---

## Phase 5: Add security headers guidance
**File:** `EMBED.md`

- [ ] Document that the hosting server should set `X-Frame-Options: ALLOWALL` or CSP `frame-ancestors *` (or specific domains)
- [ ] Add a note in the embed docs about this

---

## Current Status
- [x] Assessment complete
- [x] Phase 1 — CodeExportModal fixes
- [ ] Phase 2 — Standalone embed entry point
- [ ] Phase 3 — postMessage API
- [ ] Phase 4 — Documentation
- [ ] Phase 5 — Security guidance

---

## Key Files Reference

| File | Role |
|------|------|
| `src/components/CodeExportModal.tsx` | Generates iframe HTML snippet |
| `src/App.tsx` | Detects embed mode via URL params, renders chrome-free layout |
| `src/components/EarthGlobe/EarthGlobe.tsx` | Core globe component |
| `src/components/EarthGlobe/types.ts` | TypeScript interfaces |
| `src/components/EarthGlobe/themePresets.ts` | 11 color theme presets |
| `index.html` | Main SPA entry point |
| `src/main.tsx` | Main React entry point |
| `vite.config.ts` | Build configuration |
