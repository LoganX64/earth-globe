/**
 * Embed URL and snippet generation.
 *
 * Extracted from `CodeExportModal` so it can be tested. `parseGlobeConfig`
 * became the single source of truth for what the globe *reads*; this is the
 * other half — what the globe *emits* for a host to paste. While the builder
 * lived inside the component it was untestable, which meant the two halves of
 * the URL vocabulary could disagree with nothing to catch it.
 *
 * `buildEmbedUrl.test.ts` closes that loop: it generates a URL and parses it
 * straight back, asserting the config survives the round trip.
 *
 * Output is byte-compatible with the previous inline version. These URLs are
 * already in the wild, so changing the formatting would break live embeds.
 */

import type { GlobeMarker } from '../components/EarthGlobe/types';
import { THEME_PRESETS } from '../components/EarthGlobe/themePresets';
import { DEFAULT_ROTATION_SPEED } from '../components/EarthGlobe/types';

export interface EmbedUrlOptions {
  /** Origin the embed is served from, e.g. `https://example.com`. */
  host: string;
  embedMode: 'light' | 'dark';
  /** The map theme currently on screen in the app. */
  theme: string;
  lightTheme: string;
  darkTheme: string;
  onlyIndia: boolean;
  autoRotateSpeed: number;
  drag: boolean;
  zoom: boolean;
  zoomButtons: boolean;
  scrollZoom: boolean;
  zoomLevel: number;
  rotate: boolean;
  stars: boolean;
  grid: boolean;
  borders: boolean;
  atmosphere: boolean;
  /** `"100%"` or a pixel string such as `"500"`. */
  size: string;
  showBackground: boolean;
  lightBackground: string | null;
  darkBackground: string | null;
  marker?: GlobeMarker | null;
  highlightState?: string | null;
  /**
   * Opt-in reduced-motion handling. Optional so existing callers keep
   * compiling, and omitted from the URL entirely unless enabled — generated
   * snippets are already pasted into the wild, so the default output must stay
   * byte-identical to what earlier versions produced.
   */
  respectReducedMotion?: boolean;
}

/**
 * The theme the embed should actually open with.
 *
 * `mode` constrains polarity on the reading side, so emitting a light theme
 * alongside `mode=dark` would make the embed silently discard it. This walks
 * back to the palette the user bound to the matching polarity instead.
 */
export const resolveEmbedTheme = (o: {
  embedMode: 'light' | 'dark';
  theme: string;
  lightTheme: string;
  darkTheme: string;
}): string => {
  const isSelectedThemeDark = THEME_PRESETS[o.theme]?.isDark ?? true;
  if (o.embedMode === 'dark' && !isSelectedThemeDark) return o.darkTheme;
  if (o.embedMode === 'light' && isSelectedThemeDark) return o.lightTheme;
  return o.theme;
};

/** A responsive embed fills the column; a fixed one is square. */
export const embedDimensions = (
  size: string
): { width: string; height: string } => ({
  width: size === '100%' ? '100%' : `${size}px`,
  height: size === '100%' ? '600px' : `${size}px`,
});

/**
 * Colour the HOST paints behind the iframe element.
 *
 * The neutral backdrop has to reach the host's snippet, otherwise a small embed
 * sits in a letterbox of the theme's own colour while it loads. A *custom*
 * colour deliberately does not — inside the embed it is painted on the canvas
 * only, and the page around the globe keeps the theme's colour.
 */
export const iframeBackgroundFor = (
  embedMode: 'light' | 'dark',
  showBackground: boolean
): string => {
  if (!showBackground) return embedMode === 'light' ? '#ffffff' : '#000000';
  return embedMode === 'light' ? '#f8fafc' : '#000000';
};

export const buildEmbedUrl = (o: EmbedUrlOptions): string => {
  const activeEmbedTheme = resolveEmbedTheme(o);
  const { width, height } = embedDimensions(o.size);

  // `background` is the visibility switch. Colours are per polarity, and this
  // embed pins one mode, so only the matching slot is worth emitting — the
  // other would never apply unless a host later drives it with setTheme.
  const backgroundParam = !o.showBackground
    ? '&background=false'
    : o.embedMode === 'light'
      ? o.lightBackground
        ? `&lightBackground=${encodeURIComponent(o.lightBackground)}`
        : ''
      : o.darkBackground
        ? `&darkBackground=${encodeURIComponent(o.darkBackground)}`
        : '';

  const markerParam = o.marker
    ? `&marker=${encodeURIComponent(o.marker.id)}&name=${encodeURIComponent(
        o.marker.name
      )}&lat=${o.marker.lat.toFixed(4)}&lng=${o.marker.lng.toFixed(4)}${
        o.marker.region
          ? `&region=${encodeURIComponent(o.marker.region)}`
          : ''
      }`
    : '';

  const stateParam = o.highlightState
    ? `&state=${encodeURIComponent(o.highlightState)}`
    : '';

  // `speed` is omitted when it matches the default, to keep the copied URL
  // short. That is safe only because the reader defaults to the same value —
  // which is why both sides name DEFAULT_ROTATION_SPEED rather than repeating
  // a literal that could drift.
  const speedParam = o.autoRotateSpeed !== DEFAULT_ROTATION_SPEED
    ? `&speed=${o.autoRotateSpeed.toFixed(1)}`
    : '';

  // Last, and only when enabled: appending keeps every previously generated URL
  // byte-identical, and the reader already defaults this to off.
  const reducedMotionParam = o.respectReducedMotion
    ? '&respectReducedMotion=true'
    : '';

  return (
    `${o.host}/embed.html?embed=true` +
    `&mode=${o.embedMode}` +
    `&theme=${activeEmbedTheme}` +
    `&lightTheme=${o.lightTheme}` +
    `&darkTheme=${o.darkTheme}` +
    (o.onlyIndia ? '&onlyIndia=true' : '') +
    speedParam +
    `&drag=${o.drag}` +
    `&zoom=${o.zoom}` +
    `&zoomButtons=${o.zoomButtons}` +
    `&scrollZoom=${o.scrollZoom}` +
    `&zoomLevel=${o.zoomLevel.toFixed(2)}` +
    `&rotate=${o.rotate}` +
    `&stars=${o.stars}` +
    `&grid=${o.grid}` +
    `&borders=${o.borders}` +
    `&atmosphere=${o.atmosphere}` +
    `&width=${encodeURIComponent(width)}` +
    `&height=${encodeURIComponent(height)}` +
    backgroundParam +
    markerParam +
    stateParam +
    reducedMotionParam
  );
};

export const buildIframeSnippet = (src: string, embedMode: 'light' | 'dark', showBackground: boolean, size: string): string => {
  const { width, height } = embedDimensions(size);
  return `<!-- Drop-in 3D India Globe for any Portfolio, Webflow, WordPress, or HTML website -->
<!-- Mode: ${embedMode === 'light' ? 'Light Mode Map & UI' : 'Dark Mode Map & UI'} -->
<iframe
  src="${src}"
  width="${width}"
  height="${height}"
  style="border: none; border-radius: 16px; overflow: hidden; background: ${iframeBackgroundFor(
    embedMode,
    showBackground
  )};"
  allow="fullscreen"
  title="India 3D Interactive Map Globe"
  aria-label="Interactive 3D India Globe"
></iframe>`;
};