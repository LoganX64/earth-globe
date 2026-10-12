import { useState, useEffect, useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  parseGlobeConfig,
  type GlobeConfig,
  type SavedMapSettings,
  type RotateDirection,
} from '../config/parseGlobeConfig';
import { resolveAppMarker, isValidSavedMarker } from '../config/resolveMarker';
import type { GlobeMarker } from '../components/EarthGlobe/types';
import {
  THEME_PRESETS,
  DEFAULT_DARK_THEME_ID,
  DEFAULT_LIGHT_THEME_ID,
} from '../components/EarthGlobe/themePresets';
import { normalizeBackgroundColor } from '../components/EarthGlobe/background';

export const LAST_LOCATION_STORAGE_KEY = 'bharat-atlas-active-location';
export const HIGHLIGHT_STATE_STORAGE_KEY = 'bharat-atlas-highlight-state';
export const MAP_SETTINGS_STORAGE_KEY = 'bharat-atlas-map-settings';

/**
 * Every storage read is guarded: Safari private mode and quota-exhausted
 * storage both throw on access, and a broken preference must never stop the
 * app from starting. A write that throws is likewise ignored — the next write
 * will try again.
 */
const readSavedMapSettings = (): SavedMapSettings => {
  try {
    const raw = localStorage.getItem(MAP_SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as SavedMapSettings;
    }
  } catch {
    // Corrupted or unavailable storage — fall through to defaults
  }
  return {};
};

const readSavedHighlight = (): string | null => {
  try {
    const saved = localStorage.getItem(HIGHLIGHT_STATE_STORAGE_KEY);
    if (saved && saved.trim()) return saved;
  } catch {
    // Storage unavailable — fall through to no highlight
  }
  return null;
};

const readSavedMarker = (): GlobeMarker | null => {
  try {
    return parseSavedMarker(localStorage.getItem(LAST_LOCATION_STORAGE_KEY));
  } catch {
    // Storage unavailable — fall through to no selection
  }
  return null;
};

/** Same validation as the mount path, for a value handed over by another tab. */
const parseSavedMarker = (raw: string | null): GlobeMarker | null => {
  if (!raw) return null;
  const saved: unknown = JSON.parse(raw);
  if (!isValidSavedMarker(saved)) return null;
  return { isPrimary: true, country: 'India', ...saved } as GlobeMarker;
};

/**
 * The persisted settings fields, in one list so the writer can diff against
 * what it last stored. Every value is a primitive, so `!==` is an exact
 * comparison and no field needs a deep-equal helper.
 */
const SETTINGS_KEYS = [
  'theme',
  'lightTheme',
  'darkTheme',
  'onlyIndia',
  'autoRotate',
  'autoRotateSpeed',
  'rotateDirection',
  'showStateBorders',
  'showGraticule',
  'showAtmosphere',
  'showStars',
  'showBackground',
  'lightBackground',
  'darkBackground',
  'customizerOpen',
] as const;

export interface MapSettings {
  /** Resolved once at mount. Callers read `isEmbedMode` from state, not here. */
  config: GlobeConfig;
  theme: string;
  setTheme: Dispatch<SetStateAction<string>>;
  lightTheme: string;
  setLightTheme: Dispatch<SetStateAction<string>>;
  darkTheme: string;
  setDarkTheme: Dispatch<SetStateAction<string>>;
  onlyIndia: boolean;
  setOnlyIndia: Dispatch<SetStateAction<boolean>>;
  autoRotate: boolean;
  setAutoRotate: Dispatch<SetStateAction<boolean>>;
  autoRotateSpeed: number;
  setAutoRotateSpeed: Dispatch<SetStateAction<number>>;
  rotateDirection: RotateDirection;
  setRotateDirection: Dispatch<SetStateAction<RotateDirection>>;
  showStateBorders: boolean;
  setShowStateBorders: Dispatch<SetStateAction<boolean>>;
  showGraticule: boolean;
  setShowGraticule: Dispatch<SetStateAction<boolean>>;
  showAtmosphere: boolean;
  setShowAtmosphere: Dispatch<SetStateAction<boolean>>;
  showStars: boolean;
  setShowStars: Dispatch<SetStateAction<boolean>>;
  showBackground: boolean;
  setShowBackground: Dispatch<SetStateAction<boolean>>;
  lightBackground: string | null;
  setLightBackground: Dispatch<SetStateAction<string | null>>;
  darkBackground: string | null;
  setDarkBackground: Dispatch<SetStateAction<string | null>>;
  highlightState: string | null;
  setHighlightState: Dispatch<SetStateAction<string | null>>;
  activeMarker: GlobeMarker | null;
  setActiveMarker: Dispatch<SetStateAction<GlobeMarker | null>>;
  isControlsOpen: boolean;
  setIsControlsOpen: Dispatch<SetStateAction<boolean>>;
  /**
   * Owned here rather than by the caller so the persistence effect can gate on
   * it directly — the alternative is a flag the caller must feed back in, which
   * cannot work because the caller needs this hook's output to compute it.
   */
  isEmbedMode: boolean;
  setIsEmbedMode: Dispatch<SetStateAction<boolean>>;
  handleThemeChange: (themeId: string) => void;
  handleToggleDarkMode: () => void;
}

/**
 * Owns the globe's configuration state: resolves the URL once, holds every
 * setting as React state, persists changes, and reconciles changes made in
 * another tab.
 *
 * URL parameters always win on load. Afterwards localStorage carries the
 * session until a URL instruction overrides it again on the next visit.
 */
export const useMapSettings = (search: string): MapSettings => {
  const [config] = useState<GlobeConfig>(() =>
    parseGlobeConfig(search, {
      saved: readSavedMapSettings(),
      savedHighlightState: readSavedHighlight(),
    })
  );

  const [theme, setTheme] = useState(config.theme);
  const [lightTheme, setLightTheme] = useState(config.lightTheme);
  const [darkTheme, setDarkTheme] = useState(config.darkTheme);
  const [onlyIndia, setOnlyIndia] = useState(config.onlyIndia);
  const [autoRotate, setAutoRotate] = useState(config.autoRotate);
  const [autoRotateSpeed, setAutoRotateSpeed] = useState(config.autoRotateSpeed);
  const [rotateDirection, setRotateDirection] = useState<RotateDirection>(
    config.rotateDirection
  );
  const [showStateBorders, setShowStateBorders] = useState(config.showStateBorders);
  const [showGraticule, setShowGraticule] = useState(config.showGraticule);
  const [showAtmosphere, setShowAtmosphere] = useState(config.showAtmosphere);
  const [showStars, setShowStars] = useState(config.showStars);
  const [showBackground, setShowBackground] = useState(config.showBackground);
  const [lightBackground, setLightBackground] = useState<string | null>(
    config.lightBackground
  );
  const [darkBackground, setDarkBackground] = useState<string | null>(
    config.darkBackground
  );
  const [highlightState, setHighlightState] = useState<string | null>(
    config.highlightState
  );
  const [isControlsOpen, setIsControlsOpen] = useState<boolean>(
    readSavedMapSettings().customizerOpen === true
  );
  const [activeMarker, setActiveMarker] = useState<GlobeMarker | null>(() =>
    resolveAppMarker(config.urls, readSavedMarker())
  );
  const [isEmbedMode, setIsEmbedMode] = useState<boolean>(config.isEmbedMode);

  // What we believe is currently on disk for this key. Every write is a
  // read-modify-write diffed against this, so a sibling tab's change to a
  // *different* field survives ours instead of being clobbered by a full-blob
  // overwrite. Seeded from storage so the first write after mount does not
  // treat every field as freshly changed.
  const lastKnownSettingsRef = useRef<SavedMapSettings | null>(null);
  if (lastKnownSettingsRef.current === null) {
    lastKnownSettingsRef.current = readSavedMapSettings();
  }

  // A marker pinned in the URL outranks whatever another tab last selected, so
  // cross-tab adoption stays out of its way — the same precedence
  // `resolveAppMarker` applies at mount.
  const urlPinsMarker = config.urls.hasLatLng || Boolean(config.urls.markerId);

  // ---- persistence -----------------------------------------------------

  // Remember the selected location across refreshes (deselect clears it).
  // The removeItem sits inside the try as well: it throws in exactly the same
  // private-mode and quota conditions that setItem does.
  useEffect(() => {
    try {
      if (activeMarker) {
        localStorage.setItem(
          LAST_LOCATION_STORAGE_KEY,
          JSON.stringify(activeMarker)
        );
      } else {
        localStorage.removeItem(LAST_LOCATION_STORAGE_KEY);
      }
    } catch {
      // Storage unavailable — ignore
    }
  }, [activeMarker]);

  useEffect(() => {
    try {
      if (highlightState && highlightState.trim()) {
        localStorage.setItem(HIGHLIGHT_STATE_STORAGE_KEY, highlightState);
      } else {
        localStorage.removeItem(HIGHLIGHT_STATE_STORAGE_KEY);
      }
    } catch {
      // Storage unavailable — ignore
    }
  }, [highlightState]);

// One write for the whole blob rather than sixteen, which also means a
  // rapid slider drag collapses into a single serialisation.
  // An embed session must never overwrite the visitor's saved settings.
  useEffect(() => {
    if (isEmbedMode) return;
    const current = {
      theme,
      lightTheme,
      darkTheme,
      onlyIndia,
      autoRotate,
      autoRotateSpeed,
      rotateDirection,
      showStateBorders,
      showGraticule,
      showAtmosphere,
      showStars,
      showBackground,
      lightBackground,
      darkBackground,
      customizerOpen: isControlsOpen,
    } as Record<string, unknown>;

    try {
      const previous = (lastKnownSettingsRef.current ?? {}) as Record<string, unknown>;
      // Start from whatever is on disk, not from our own state: a sibling tab
      // may have written a field we have not touched. Merging over the stored
      // blob is what makes the result the union of every tab's fields, which in
      // turn makes whole-blob adoption below correct rather than destructive.
      const merged: Record<string, unknown> = { ...readSavedMapSettings() };
      let changedAny = false;
      for (const key of SETTINGS_KEYS) {
        const value = current[key];
        if (value !== undefined && value !== previous[key]) {
          merged[key] = value;
          changedAny = true;
        }
      }
      // Nothing changed, so write nothing. This also stops the mount-time write
      // from firing a spurious `storage` event in every other open tab.
      if (!changedAny) return;
      localStorage.setItem(MAP_SETTINGS_STORAGE_KEY, JSON.stringify(merged));
      lastKnownSettingsRef.current = merged as SavedMapSettings;
    } catch {
      // Storage unavailable — ignore
    }
  }, [
    isEmbedMode,
    theme,
    lightTheme,
    darkTheme,
    onlyIndia,
    autoRotate,
    autoRotateSpeed,
    rotateDirection,
    showStateBorders,
    showGraticule,
    showAtmosphere,
    showStars,
    showBackground,
    lightBackground,
    darkBackground,
    isControlsOpen,
  ]);

  // ---- multi-tab reconciliation ---------------------------------------

  // Two tabs on this origin previously raced: last write won and neither
  // noticed. The `storage` event fires only in tabs OTHER than the writer, so
  // adopting the new value here cannot loop back.
  useEffect(() => {
    const adopt = (raw: string | null) => {
      if (raw == null) return;
      let next: SavedMapSettings;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return;
        next = parsed as SavedMapSettings;
      } catch {
        return;
      }

      if (next.theme && next.theme in THEME_PRESETS) setTheme(next.theme);
      if (next.lightTheme && next.lightTheme in THEME_PRESETS) {
        if (!THEME_PRESETS[next.lightTheme].isDark) setLightTheme(next.lightTheme);
      }
      if (next.darkTheme && next.darkTheme in THEME_PRESETS) {
        if (THEME_PRESETS[next.darkTheme].isDark) setDarkTheme(next.darkTheme);
      }
      if (typeof next.onlyIndia === 'boolean') setOnlyIndia(next.onlyIndia);
      if (typeof next.autoRotate === 'boolean') setAutoRotate(next.autoRotate);
      if (
        typeof next.autoRotateSpeed === 'number' &&
        Number.isFinite(next.autoRotateSpeed)
      ) {
        setAutoRotateSpeed(next.autoRotateSpeed);
      }
      if (
        next.rotateDirection === 'east-to-west' ||
        next.rotateDirection === 'west-to-east'
      ) {
        setRotateDirection(next.rotateDirection);
      }
      if (typeof next.showStateBorders === 'boolean') {
        setShowStateBorders(next.showStateBorders);
      }
      if (typeof next.showGraticule === 'boolean') setShowGraticule(next.showGraticule);
      if (typeof next.showAtmosphere === 'boolean') setShowAtmosphere(next.showAtmosphere);
      if (typeof next.showStars === 'boolean') setShowStars(next.showStars);
      if (typeof next.showBackground === 'boolean') setShowBackground(next.showBackground);
      if (next.lightBackground !== undefined) {
        setLightBackground(normalizeBackgroundColor(next.lightBackground));
      }
      if (next.darkBackground !== undefined) {
        setDarkBackground(normalizeBackgroundColor(next.darkBackground));
      }
if (typeof next.customizerOpen === 'boolean') {
        setIsControlsOpen(next.customizerOpen);
      }
      // Adopted values are now what we believe is on disk, so the next write
      // diffs against them instead of treating them as local changes.
      lastKnownSettingsRef.current = next;
    };

    // The highlight and selected-location keys were persisted but never
    // watched, so two tabs could visibly disagree about what was highlighted.
    // They go through the same validators the mount path uses.
    const adoptHighlight = (raw: string | null) => {
      const next = (raw ?? '').trim();
      setHighlightState(next || null);
    };

    const adoptMarker = (raw: string | null) => {
      if (urlPinsMarker) return;
      try {
        setActiveMarker(parseSavedMarker(raw));
      } catch {
        // Corrupted value from another tab — ignore rather than clear
      }
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === MAP_SETTINGS_STORAGE_KEY) {
        adopt(e.newValue);
        return;
      }
      if (e.key === HIGHLIGHT_STATE_STORAGE_KEY) {
        adoptHighlight(e.newValue);
        return;
      }
      if (e.key === LAST_LOCATION_STORAGE_KEY) {
        adoptMarker(e.newValue);
      }
    };

window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
    // urlPinsMarker is derived from `config`, which is resolved once and never
    // changes; listed for honest dependency rather than because it varies.
  }, [urlPinsMarker]);

  // ---- theme binding ---------------------------------------------------

  // Picking a palette from the Globe Customizer applies it AND binds it to its
  // own polarity, so the light/dark switcher lands on the user's own choices.
  const handleThemeChange = useCallback((themeId: string) => {
    if (!(themeId in THEME_PRESETS)) return;
    setTheme(themeId);
    if (THEME_PRESETS[themeId].isDark) setDarkTheme(themeId);
    else setLightTheme(themeId);
  }, []);

  // Flips between the two palettes bound in the Globe Customizer, falling back
  // to the built-in defaults if a binding is somehow unusable.
  const handleToggleDarkMode = useCallback(() => {
    setTheme((prevTheme) => {
      const currentIsDark = THEME_PRESETS[prevTheme]?.isDark ?? false;
      const nextThemeId = currentIsDark ? lightTheme : darkTheme;
      return nextThemeId in THEME_PRESETS
        ? nextThemeId
        : currentIsDark
          ? DEFAULT_LIGHT_THEME_ID
          : DEFAULT_DARK_THEME_ID;
    });
  }, [lightTheme, darkTheme]);

  return {
    config,
    theme,
    setTheme,
    lightTheme,
    setLightTheme,
    darkTheme,
    setDarkTheme,
    onlyIndia,
    setOnlyIndia,
    autoRotate,
    setAutoRotate,
    autoRotateSpeed,
    setAutoRotateSpeed,
    rotateDirection,
    setRotateDirection,
    showStateBorders,
    setShowStateBorders,
    showGraticule,
    setShowGraticule,
    showAtmosphere,
    setShowAtmosphere,
    showStars,
    setShowStars,
    showBackground,
    setShowBackground,
    lightBackground,
    setLightBackground,
    darkBackground,
    setDarkBackground,
    highlightState,
    setHighlightState,
    activeMarker,
    setActiveMarker,
    isControlsOpen,
    setIsControlsOpen,
    isEmbedMode,
    setIsEmbedMode,
    handleThemeChange,
    handleToggleDarkMode,
  };
};