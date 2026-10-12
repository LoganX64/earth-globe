import { useState, useEffect, useCallback } from 'react';
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
    const raw = localStorage.getItem(LAST_LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const saved: unknown = JSON.parse(raw);
    if (!isValidSavedMarker(saved)) return null;
    return { isPrimary: true, country: 'India', ...saved } as GlobeMarker;
  } catch {
    // Corrupted storage key — fall through to no selection
  }
  return null;
};

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
    try {
      localStorage.setItem(
        MAP_SETTINGS_STORAGE_KEY,
        JSON.stringify({
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
        })
      );
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
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key !== MAP_SETTINGS_STORAGE_KEY) return;
      adopt(e.newValue);
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

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