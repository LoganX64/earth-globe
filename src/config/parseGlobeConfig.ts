/**
 * Single source of truth for the globe's URL configuration.
 *
 * This vocabulary used to be hand-rolled in two places — `App.tsx` and
 * `embed.tsx` — and emitted by a third, `CodeExportModal`. The copies had
 * already drifted: `zoomLevel`, `zoom`, `zoomButtons` and `scrollZoom` existed
 * only in the embed, and validation strictness differed (the embed clamps
 * `zoomLevel`, nothing clamps `speed`). Anything reading or writing this
 * vocabulary now comes from here.
 *
 * Two deliberate asymmetries are preserved rather than flattened, because they
 * are real differences in intent rather than accidents:
 *
 *  1. Only the main app persists settings and reads them back. The embed never
 *     writes `localStorage`, so it passes no `saved` and every saved-layer
 *     fallback drops out.
 *  2. `zoomLevel` and the two granular zoom switches are embed-only. The main
 *     app starts at a fixed zoom and always allows drag and zoom.
 *
 * Marker *resolution* is deliberately NOT here. Given an id, the app looks it
 * up in `POPULAR_INDIAN_LOCATIONS`; the embed has no such table and drops a pin
 * at India's centroid. That is a semantic difference, not a vocabulary one, so
 * each entrypoint keeps its own policy over the signals returned below.
 */

import {
  THEME_PRESETS,
  DEFAULT_THEME_ID,
  DEFAULT_DARK_THEME_ID,
  DEFAULT_LIGHT_THEME_ID,
} from '../components/EarthGlobe/themePresets';
import {
  hasParam,
  parseShowBackground,
  resolveBackgroundColor,
} from '../components/EarthGlobe/background';
import {
  MIN_ZOOM_LEVEL,
  MAX_ZOOM_LEVEL,
  DEFAULT_EMBED_ZOOM,
} from '../components/EarthGlobe/types';

export interface SavedMapSettings {
  theme?: string;
  lightTheme?: string;
  darkTheme?: string;
  onlyIndia?: boolean;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  rotateDirection?: 'west-to-east' | 'east-to-west';
  showStateBorders?: boolean;
  showGraticule?: boolean;
  showAtmosphere?: boolean;
  showStars?: boolean;
  showBackground?: boolean;
  lightBackground?: string;
  darkBackground?: string;
  customizerOpen?: boolean;
}

export type RotateDirection = 'west-to-east' | 'east-to-west';

export interface GlobeConfig {
  theme: string;
  lightTheme: string;
  darkTheme: string;
  onlyIndia: boolean;
  autoRotate: boolean;
  autoRotateSpeed: number;
  rotateDirection: RotateDirection;
  showStateBorders: boolean;
  showGraticule: boolean;
  showAtmosphere: boolean;
  showStars: boolean;
  showBackground: boolean;
  lightBackground: string | null;
  darkBackground: string | null;
  dragEnabled: boolean;
  zoomEnabled: boolean;
  zoomButtonsEnabled: boolean;
  scrollZoomEnabled: boolean;
  initialZoom: number;
  width: string;
  height: string;
  highlightState: string | null;
  isEmbedMode: boolean;
  /** Raw marker signals. Callers apply their own id-lookup policy. */
  urls: {
    markerId: string | null;
    markerName: string | null;
    markerRegion: string | null;
    lat: number | null;
    lng: number | null;
    /** True only when `lat` and `lng` were both given AND both parsed finite. */
    hasLatLng: boolean;
  };
}

export interface ParseOptions {
  /** Main-app settings from localStorage. Omit for the embed. */
  saved?: SavedMapSettings | null;
  savedHighlightState?: string | null;
  /** Embed-only: honour `zoomLevel`. The app starts at a fixed 1.2. */
  embedZoomControls?: boolean;
}

/**
 * A supplied boolean wins on its own terms: anything other than the literal
 * "false" counts as on, so `?stars=1`, `?stars=yes` and `?stars` all enable.
 */
const isOff = (raw: string | null | undefined): boolean =>
  (raw ?? '').trim().toLowerCase() === 'false';

/**
 * Resolve the initial theme id.
 *
 * `mode` wins over `theme`, and a theme from the wrong polarity is discarded
 * rather than honoured — `?mode=dark&theme=paper-cartography` gives the dark
 * default, not a light palette in a dark frame.
 */
export const resolveThemeId = (params: URLSearchParams): string => {
  const mode = params.get('mode')?.toLowerCase();
  const theme = params.get('theme');
  const themeIsValid = theme != null && theme in THEME_PRESETS;

  if (mode === 'light') {
    if (themeIsValid && !THEME_PRESETS[theme].isDark) return theme;
    return DEFAULT_LIGHT_THEME_ID;
  }
  if (mode === 'dark') {
    if (themeIsValid && THEME_PRESETS[theme].isDark) return theme;
    return DEFAULT_DARK_THEME_ID;
  }
  return themeIsValid ? theme : DEFAULT_THEME_ID;
};

/**
 * Resolve which palette is bound to a polarity, walking URL → saved → the
 * active theme (when it already fits) → that polarity's built-in default. Every
 * candidate must exist in the registry AND match the requested polarity, so a
 * dark theme can never be bound to the light switcher.
 */
export const resolveBoundTheme = (
  params: URLSearchParams,
  urlKey: string,
  savedId: string | undefined,
  wantsDark: boolean,
  currentThemeId: string
): string => {
  const fallback = wantsDark ? DEFAULT_DARK_THEME_ID : DEFAULT_LIGHT_THEME_ID;
  for (const candidate of [
    params.get(urlKey),
    savedId,
    currentThemeId,
    fallback,
  ]) {
    if (
      candidate &&
      candidate in THEME_PRESETS &&
      THEME_PRESETS[candidate].isDark === wantsDark
    ) {
      return candidate;
    }
  }
  return fallback;
};

/** URL wins, then a boolean saved value, then the supplied default. */
export const resolveBoolSetting = (
  params: URLSearchParams,
  key: string,
  savedValue: unknown,
  fallback: boolean
): boolean => {
  if (params.has(key)) return !isOff(params.get(key));
  return typeof savedValue === 'boolean' ? savedValue : fallback;
};

export const parseGlobeConfig = (
  search: string,
  opts: ParseOptions = {}
): GlobeConfig => {
  const params = new URLSearchParams(search);
  const saved = opts.saved ?? null;
  const embedZoomControls = opts.embedZoomControls === true;

  const isEmbedMode =
    params.get('embed') === 'true' ||
    params.get('pure') === 'true' ||
    params.get('mode') === 'embed';

  // ---- theme -----------------------------------------------------------
  const themeFromUrl = resolveThemeId(params);
  const mode = params.get('mode')?.toLowerCase();
  const themeParam = params.get('theme');
  const urlSpecifiedTheme =
    (themeParam != null && themeParam in THEME_PRESETS) ||
    mode === 'light' ||
    mode === 'dark';

  const savedTheme = saved?.theme;
  const theme =
    !urlSpecifiedTheme && savedTheme && savedTheme in THEME_PRESETS
      ? savedTheme
      : themeFromUrl;

  const lightTheme = resolveBoundTheme(
    params,
    'lightTheme',
    saved?.lightTheme,
    false,
    theme
  );
  const darkTheme = resolveBoundTheme(
    params,
    'darkTheme',
    saved?.darkTheme,
    true,
    theme
  );

  // ---- only india ------------------------------------------------------
  const hasOnlyIndiaParam =
    params.has('onlyIndia') || params.has('indiaOnly');
  const onlyIndiaFromUrl =
    params.get('onlyIndia') === 'true' || params.get('indiaOnly') === 'true';
  const onlyIndia = hasOnlyIndiaParam
    ? onlyIndiaFromUrl
    : typeof saved?.onlyIndia === 'boolean'
      ? saved.onlyIndia
      : false;

  // ---- rotation --------------------------------------------------------
  const speedParam = params.get('speed');
  const parsedSpeed = speedParam ? Number.parseFloat(speedParam) : NaN;
  const savedSpeed = saved?.autoRotateSpeed;
  const autoRotateSpeed = speedParam
    ? Number.isNaN(parsedSpeed)
      ? 1.2
      : parsedSpeed
    : typeof savedSpeed === 'number' && Number.isFinite(savedSpeed)
      ? savedSpeed
      : 1.2;

  const rotateDirection: RotateDirection =
    saved?.rotateDirection === 'east-to-west' ||
    saved?.rotateDirection === 'west-to-east'
      ? saved.rotateDirection
      : 'west-to-east';

  // ---- layers ----------------------------------------------------------
  const showStateBorders = resolveBoolSetting(
    params,
    'borders',
    saved?.showStateBorders,
    true
  );
  const showGraticule = resolveBoolSetting(
    params,
    'grid',
    saved?.showGraticule,
    true
  );
  const showAtmosphere = resolveBoolSetting(
    params,
    'atmosphere',
    saved?.showAtmosphere,
    true
  );
  const showStars = resolveBoolSetting(params, 'stars', saved?.showStars, true);

  // ---- backdrop --------------------------------------------------------
  // `background` is the visibility switch only; colours live in their own
  // per-polarity parameters so light and dark themes never inherit each other.
  const backgroundParam = params.get('background');
  const showBackground = hasParam(backgroundParam)
    ? parseShowBackground(backgroundParam)
    : typeof saved?.showBackground === 'boolean'
      ? saved.showBackground
      : true;

  const lightBackground = resolveBackgroundColor(
    params.get('lightBackground'),
    saved?.lightBackground
  );
  const darkBackground = resolveBackgroundColor(
    params.get('darkBackground'),
    saved?.darkBackground
  );

  // ---- interaction -----------------------------------------------------
  // `zoom` is the master off-switch: the granular switches can disable an input
  // path but must never re-enable what `zoom=false` killed.
  const zoomEnabled = !isOff(params.get('zoom'));
  const zoomButtonsEnabled = zoomEnabled && !isOff(params.get('zoomButtons'));
  const scrollZoomEnabled = zoomEnabled && !isOff(params.get('scrollZoom'));

  const parsedZoomLevel = params.get('zoomLevel')
    ? Number.parseFloat(params.get('zoomLevel')!)
    : NaN;
  const initialZoom = embedZoomControls
    ? Number.isNaN(parsedZoomLevel)
      ? DEFAULT_EMBED_ZOOM
      : Math.min(MAX_ZOOM_LEVEL, Math.max(MIN_ZOOM_LEVEL, parsedZoomLevel))
    : 1.2;

  // ---- size ------------------------------------------------------------
  const size = params.get('size');
  const width = params.get('width') || size || '100%';
  const height = params.get('height') || size || '100%';

  // ---- highlight & marker signals --------------------------------------
  const latParam = params.get('lat');
  const lngParam = params.get('lng');
  const parsedLat = latParam ? Number.parseFloat(latParam) : NaN;
  const parsedLng = lngParam ? Number.parseFloat(lngParam) : NaN;
  const hasLatLng =
    latParam != null &&
    lngParam != null &&
    !Number.isNaN(parsedLat) &&
    !Number.isNaN(parsedLng);

  return {
    theme,
    lightTheme,
    darkTheme,
    onlyIndia,
    autoRotate: resolveBoolSetting(params, 'rotate', saved?.autoRotate, true),
    autoRotateSpeed,
    rotateDirection,
    showStateBorders,
    showGraticule,
    showAtmosphere,
    showStars,
    showBackground,
    lightBackground,
    darkBackground,
    dragEnabled: !isOff(params.get('drag')),
    zoomEnabled,
    zoomButtonsEnabled,
    scrollZoomEnabled,
    initialZoom,
    width,
    height,
    highlightState: params.get('state') || opts.savedHighlightState || null,
    isEmbedMode,
    urls: {
      markerId: params.get('marker'),
      markerName: params.get('name'),
      markerRegion: params.get('region'),
      lat: hasLatLng ? parsedLat : null,
      lng: hasLatLng ? parsedLng : null,
      hasLatLng,
    },
  };
};