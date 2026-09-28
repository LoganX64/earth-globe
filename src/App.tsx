/**
 * Earth Globe Application
 * Interactive reusable 3D globe with official Survey of India cartography.
 * Supports customizable speeds, dynamic state highlighting, custom location pins,
 * pure embed / component mode, light & dark mode globes, and isolated "Only India" map projection.
 * 100% Client-side React + Vite SPA (Zero backend needed, Vercel Free Tier ready).
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  EarthGlobe,
  EarthGlobeRef,
  GlobeMarker,
  DEFAULT_THEME_ID,
  DEFAULT_DARK_THEME_ID,
  DEFAULT_LIGHT_THEME_ID,
  THEME_PRESETS,
} from './components/EarthGlobe';
import {
  MUMBAI_MARKER,
  THRISSUR_MARKER,
  ULHASNAGAR_MARKER,
  POPULAR_INDIAN_LOCATIONS,
} from './data/defaultLocations';
import { LocationDetailsCard } from './components/MumbaiDetailsCard';
import { GlobeControls } from './components/GlobeControls';
import { TopBar } from './components/TopBar';
import { CodeExportModal } from './components/CodeExportModal';
import {
  SlidersHorizontal,
  MapPin,
  RotateCcw,
  Sparkles,
  Maximize2,
  X,
} from 'lucide-react';

const LAST_LOCATION_STORAGE_KEY = 'bharat-atlas-active-location';
const HIGHLIGHT_STATE_STORAGE_KEY = 'bharat-atlas-highlight-state';
const MAP_SETTINGS_STORAGE_KEY = 'bharat-atlas-map-settings';

type SavedMapSettings = {
  theme?: string;
  onlyIndia?: boolean;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  rotateDirection?: 'west-to-east' | 'east-to-west';
  showStateBorders?: boolean;
  showGraticule?: boolean;
  showAtmosphere?: boolean;
  showStars?: boolean;
};

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

export default function App() {
  const globeRef = useRef<EarthGlobeRef>(null);

  // Read URL query parameters for embed mode and customizations
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialEmbed = urlParams?.get('embed') === 'true' || urlParams?.get('pure') === 'true' || urlParams?.get('mode') === 'embed';
  const initialOnlyIndia = urlParams?.get('onlyIndia') === 'true' || urlParams?.get('indiaOnly') === 'true';
  const initialWidth = urlParams?.get('width') || urlParams?.get('size') || '100%';
  const initialHeight = urlParams?.get('height') || urlParams?.get('size') || '100%';

  // URL mode or theme resolution
  const modeParam = urlParams?.get('mode')?.toLowerCase();
  const themeParam = urlParams?.get('theme');

  let defaultInitialTheme = DEFAULT_THEME_ID;
  if (modeParam === 'light') {
    if (themeParam && themeParam in THEME_PRESETS && !THEME_PRESETS[themeParam].isDark) {
      defaultInitialTheme = themeParam;
    } else {
      defaultInitialTheme = DEFAULT_LIGHT_THEME_ID;
    }
  } else if (modeParam === 'dark') {
    if (themeParam && themeParam in THEME_PRESETS && THEME_PRESETS[themeParam].isDark) {
      defaultInitialTheme = themeParam;
    } else {
      defaultInitialTheme = DEFAULT_DARK_THEME_ID;
    }
  } else if (themeParam && themeParam in THEME_PRESETS) {
    defaultInitialTheme = themeParam;
  }

  const initialSpeed = urlParams?.get('speed') ? parseFloat(urlParams.get('speed')!) : 1.2;
  // Embed output controls — pre-selected via URL (defaults keep old links working)
  const embedDragEnabled = urlParams?.get('drag') !== 'false';
  const embedZoomEnabled = urlParams?.get('zoom') !== 'false';

  // Embed Mode state (shows ONLY globe and map)
  const [isEmbedMode, setIsEmbedMode] = useState<boolean>(initialEmbed);
  const [embedWidth, setEmbedWidth] = useState<string | number>(initialWidth);
  const [embedHeight, setEmbedHeight] = useState<string | number>(initialHeight);

  // Core configuration states — URL params win, then saved settings, then defaults
  const [savedSettings] = useState<SavedMapSettings>(readSavedMapSettings);
  const urlThemeSpecified =
    Boolean(themeParam && themeParam in THEME_PRESETS) || modeParam === 'light' || modeParam === 'dark';
  const initialTheme =
    !urlThemeSpecified && savedSettings.theme && savedSettings.theme in THEME_PRESETS
      ? savedSettings.theme
      : defaultInitialTheme;
  const resolveBoolSetting = (urlKey: string, savedValue: unknown, fallback: boolean): boolean => {
    if (urlParams?.has(urlKey)) return urlParams.get(urlKey) !== 'false';
    return typeof savedValue === 'boolean' ? savedValue : fallback;
  };
  const savedSpeed =
    typeof savedSettings.autoRotateSpeed === 'number' && Number.isFinite(savedSettings.autoRotateSpeed)
      ? savedSettings.autoRotateSpeed
      : 1.2;

  const [theme, setTheme] = useState<string>(initialTheme);
  const urlOnlyIndia = Boolean(urlParams?.has('onlyIndia') || urlParams?.has('indiaOnly'));
  const [onlyIndia, setOnlyIndia] = useState<boolean>(
    urlOnlyIndia
      ? initialOnlyIndia
      : typeof savedSettings.onlyIndia === 'boolean'
        ? savedSettings.onlyIndia
        : false,
  );
  const getInitialHighlightState = (): string | null => {
    const urlState = urlParams?.get('state');
    if (urlState) return urlState;
    try {
      const saved = localStorage.getItem(HIGHLIGHT_STATE_STORAGE_KEY);
      if (saved && saved.trim()) return saved;
    } catch {
      // Storage unavailable — fall through to no highlight
    }
    return null;
  };
  const [highlightState, setHighlightState] = useState<string | null>(getInitialHighlightState);
  const [autoRotate, setAutoRotate] = useState<boolean>(
    resolveBoolSetting('rotate', savedSettings.autoRotate, true),
  );
  const [autoRotateSpeed, setAutoRotateSpeed] = useState<number>(
    urlParams?.get('speed') ? (isNaN(initialSpeed) ? 1.2 : initialSpeed) : savedSpeed,
  );
  const [rotateDirection, setRotateDirection] = useState<'west-to-east' | 'east-to-west'>(
    savedSettings.rotateDirection === 'east-to-west' || savedSettings.rotateDirection === 'west-to-east'
      ? savedSettings.rotateDirection
      : 'west-to-east',
  );
  const [showStateBorders, setShowStateBorders] = useState<boolean>(
    resolveBoolSetting('borders', savedSettings.showStateBorders, true),
  );
  const [showGraticule, setShowGraticule] = useState<boolean>(
    resolveBoolSetting('grid', savedSettings.showGraticule, true),
  );
  const [showAtmosphere, setShowAtmosphere] = useState<boolean>(
    resolveBoolSetting('atmosphere', savedSettings.showAtmosphere, true),
  );
  const [showStars, setShowStars] = useState<boolean>(
    resolveBoolSetting('stars', savedSettings.showStars, true),
  );
  const [showSecondaryMarkers, setShowSecondaryMarkers] = useState<boolean>(false);

  // Active marker states
  const getInitialMarker = (): GlobeMarker | null => {
    const markerParam = urlParams?.get('marker');
    const latParam = urlParams?.get('lat');
    const lngParam = urlParams?.get('lng');
    const nameParam = urlParams?.get('name');
    const regionParam = urlParams?.get('region');

    // 1. If explicit lat and lng coordinates are passed in URL query parameters:
    if (latParam && lngParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);
      if (!isNaN(lat) && !isNaN(lng)) {
        return {
          id: markerParam || `url-marker-${lat.toFixed(4)}-${lng.toFixed(4)}`,
          name: nameParam || 'Selected Location',
          lat,
          lng,
          region: regionParam || undefined,
          country: 'India',
          isPrimary: true,
        };
      }
    }

    // 2. Fall back to the location saved from the previous session:
    if (!markerParam) {
      try {
        const raw = localStorage.getItem(LAST_LOCATION_STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as Partial<GlobeMarker>;
          if (
            typeof saved?.lat === 'number' &&
            Number.isFinite(saved.lat) &&
            typeof saved?.lng === 'number' &&
            Number.isFinite(saved.lng) &&
            typeof saved?.name === 'string' &&
            saved.name
          ) {
            return { isPrimary: true, country: 'India', ...saved, lat: saved.lat, lng: saved.lng, name: saved.name } as GlobeMarker;
          }
        }
      } catch {
        // Corrupted storage key — fall through to no selection
      }
      return null;
    }

    // 3. Lookup by ID or location name:
    const lower = markerParam.toLowerCase();
    if (lower === 'ulhasnagar') return ULHASNAGAR_MARKER;
    if (lower === 'thrissur') return THRISSUR_MARKER;
    if (lower === 'mumbai') return MUMBAI_MARKER;

    return (
      POPULAR_INDIAN_LOCATIONS.find(
        (p) =>
          p.id.toLowerCase() === lower ||
          p.name.toLowerCase() === lower ||
          p.name.toLowerCase().includes(lower)
      ) || null
    );
  };

  const initialMarkerParam = urlParams?.get('marker') || urlParams?.get('lat');
  const [activeMarker, setActiveMarker] = useState<GlobeMarker | null>(getInitialMarker);
  const [isControlsOpen, setIsControlsOpen] = useState<boolean>(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(
    Boolean(initialMarkerParam) || activeMarker !== null,
  );
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(false);

  // Remember the selected location across refreshes (deselect clears it)
  useEffect(() => {
    if (activeMarker) {
      try {
        localStorage.setItem(LAST_LOCATION_STORAGE_KEY, JSON.stringify(activeMarker));
      } catch {
        // Storage unavailable (private mode / quota) — ignore
      }
    } else {
      localStorage.removeItem(LAST_LOCATION_STORAGE_KEY);
    }
  }, [activeMarker]);

  // Remember the highlighted state across refreshes (clearing it removes the key)
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

  // Persist Globe Customizer settings across refreshes (URL params win on load;
  // embed mode never overwrites the visitor's saved settings)
  useEffect(() => {
    if (isEmbedMode) return;
    try {
      localStorage.setItem(
        MAP_SETTINGS_STORAGE_KEY,
        JSON.stringify({
          theme,
          onlyIndia,
          autoRotate,
          autoRotateSpeed,
          rotateDirection,
          showStateBorders,
          showGraticule,
          showAtmosphere,
          showStars,
        }),
      );
    } catch {
      // Storage unavailable — ignore
    }
  }, [
    isEmbedMode,
    theme,
    onlyIndia,
    autoRotate,
    autoRotateSpeed,
    rotateDirection,
    showStateBorders,
    showGraticule,
    showAtmosphere,
    showStars,
  ]);

  const currentThemeConfig = THEME_PRESETS[theme] || THEME_PRESETS[DEFAULT_THEME_ID];

  // Map theme darkness — drives ONLY the globe and pure-view overlays.
  // The site chrome itself is always light mode.
  const isDark = currentThemeConfig.isDark;

  // Theme switch changes ONLY the map theme; website UI never leaves light mode
  const handleToggleDarkMode = useCallback(() => {
    setTheme((prevTheme) => {
      const currentIsDark = THEME_PRESETS[prevTheme]?.isDark ?? false;
      return currentIsDark ? DEFAULT_LIGHT_THEME_ID : DEFAULT_DARK_THEME_ID;
    });
  }, []);

  // Active markers passed to the globe
  const markersToRender: GlobeMarker[] = activeMarker
    ? showSecondaryMarkers
      ? [activeMarker, ...POPULAR_INDIAN_LOCATIONS.filter((p) => p.id !== activeMarker.id)]
      : [activeMarker]
    : showSecondaryMarkers
    ? POPULAR_INDIAN_LOCATIONS
    : [];

  // Handle location selection - toggles off if already selected, or selects new marker
  const handleSelectLocation = useCallback((marker: GlobeMarker | null) => {
    if (!marker) {
      setActiveMarker(null);
      setIsDetailsOpen(false);
      return;
    }

    setActiveMarker((current) => {
      if (current?.id === marker.id) {
        setIsDetailsOpen(false);
        return null;
      }
      setIsDetailsOpen(true);
      return marker;
    });

    globeRef.current?.flyTo(marker.lat, marker.lng, 1.8);
  }, []);

  const handleHighlightStateChange = useCallback((stateName: string | null) => {
    setHighlightState(stateName);
    if (stateName) {
      globeRef.current?.focusState(stateName, 2.2);
    }
  }, []);

  const handleSearchSelectLocation = useCallback(
    (marker: GlobeMarker, stateName?: string) => {
      setActiveMarker(marker);
      setIsDetailsOpen(true);
      if (stateName) {
        setHighlightState(stateName);
      }
      globeRef.current?.flyTo(marker.lat, marker.lng, 2.2);
    },
    []
  );

  const handleAddCustomLocation = (marker: GlobeMarker) => {
    setActiveMarker(marker);
    setIsDetailsOpen(true);
    globeRef.current?.flyTo(marker.lat, marker.lng, 2.0);
  };

  const handleResetView = () => {
    globeRef.current?.resetView();
  };

  const handleZoomIn = () => {
    const currentZ = globeRef.current?.getZoom() || 1.0;
    globeRef.current?.setZoom(currentZ * 1.25);
  };

  const handleZoomOut = () => {
    const currentZ = globeRef.current?.getZoom() || 1.0;
    globeRef.current?.setZoom(currentZ * 0.8);
  };

  // Keyboard shortcut navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEmbedMode) {
        if (!initialEmbed && (e.key === 'x' || e.key === 'X' || e.key === 'Escape')) {
          setIsEmbedMode(false);
        }
        return;
      }
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setAutoRotate((prev) => !prev);
      } else if (e.key === 'x' || e.key === 'X' || e.key === 'Escape') {
        handleSelectLocation(null);
      } else if (e.key === 'r' || e.key === 'R') {
        handleResetView();
      } else if (e.key === 'c' || e.key === 'C') {
        setIsControlsOpen((prev) => !prev);
      } else if (e.key === 't' || e.key === 'T') {
        handleToggleDarkMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSelectLocation, isEmbedMode, handleToggleDarkMode]);

  // =========================================================================
  // PURE EMBED / COMPONENT MODE: ONLY THE GLOBE AND MAP WITH SIZE CUSTOMIZATION
  // =========================================================================
  if (isEmbedMode) {
    const formattedWidth = typeof embedWidth === 'number' ? `${embedWidth}px` : embedWidth;
    const formattedHeight = typeof embedHeight === 'number' ? `${embedHeight}px` : embedHeight;

    return (
      <div
        className="w-screen h-screen flex items-center justify-center overflow-hidden relative transition-colors duration-500"
        style={{
          backgroundColor: currentThemeConfig.background,
          overscrollBehavior: 'contain',
        }}
      >
        <div
          style={{
            width: formattedWidth,
            height: formattedHeight,
            maxWidth: '100vw',
            maxHeight: '100vh',
            position: 'relative',
          }}
          className="flex items-center justify-center overflow-hidden"
        >
          <EarthGlobe
            ref={globeRef}
            theme={theme}
            highlightCountry="356" // India Survey of India official map
            onlyIndia={onlyIndia} // Shows only India or world with India featured
            highlightState={highlightState}
            showStateBorders={showStateBorders}
            rotateDirection={rotateDirection}
            markers={markersToRender}
            selectedMarkerId={activeMarker?.id || null}
            autoRotate={autoRotate}
            autoRotateSpeed={autoRotateSpeed}
            enableDrag={embedDragEnabled}
            enableZoom={embedZoomEnabled}
            showGraticule={showGraticule}
            showAtmosphere={showAtmosphere}
            showStars={showStars}
            initialCenter={activeMarker ? [activeMarker.lng, activeMarker.lat] : [78.9629, 20.5937]}
            initialZoom={1.2}
            className="w-full h-full"
          />

          {/* Floating zoom controls */}
          {embedZoomEnabled && (
            <div
              className={`absolute bottom-6 right-6 z-50 flex flex-col items-center gap-1 rounded-xl p-1 border backdrop-blur-md shadow-xl ${
                isDark ? 'bg-zinc-950/80 border-zinc-800/80' : 'bg-white/85 border-zinc-200/80'
              }`}
            >
              <button
                onClick={handleZoomIn}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-base font-bold ${
                  isDark
                    ? 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    : 'text-zinc-700 hover:bg-zinc-200 hover:text-zinc-950'
                }`}
                title="Zoom In"
              >
                +
              </button>
              <div className={`w-5 h-px ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
              <button
                onClick={handleZoomOut}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-base font-bold ${
                  isDark
                    ? 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    : 'text-zinc-700 hover:bg-zinc-200 hover:text-zinc-950'
                }`}
                title="Zoom Out"
              >
                −
              </button>
            </div>
          )}

          {/* Exit Pure View button */}
          {!initialEmbed && (
            <button
              onClick={() => setIsEmbedMode(false)}
              className={`absolute bottom-6 left-6 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed text-xs font-semibold backdrop-blur-md shadow-xl transition-colors cursor-pointer ${
                isDark
                  ? 'bg-zinc-950/80 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                  : 'bg-white/85 border-zinc-200/80 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950'
              }`}
              title="Exit Pure View (or press X / Esc)"
            >
              <X className="w-3.5 h-3.5" />
              <span>Exit Pure View</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // STANDARD INTERACTIVE APPLICATION DASHBOARD
  // =========================================================================
  // =========================================================================
  // STANDARD INTERACTIVE APPLICATION DASHBOARD
  // =========================================================================
  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col transition-colors duration-500 font-sans bg-background text-foreground">
      {/* 1. Header Navigation Bar - light chrome, or the dialogs' dark glass in dark mode */}
      <TopBar
        activeMarker={activeMarker}
        onFocusActiveLocation={() => {
          if (activeMarker) {
            globeRef.current?.flyTo(activeMarker.lat, activeMarker.lng, 2.0);
          } else {
            globeRef.current?.flyTo(20.5937, 78.9629, 1.4);
          }
        }}
        onDeselectLocation={() => handleSelectLocation(null)}
        onSearchSelectLocation={handleSearchSelectLocation}
        onOpenCode={() => setIsCodeModalOpen(true)}
        onToggleControls={() => setIsControlsOpen((prev) => !prev)}
        isControlsOpen={isControlsOpen}
        onToggleEmbedMode={() => setIsEmbedMode(true)}
        onToggleDarkMode={handleToggleDarkMode}
        mapThemeIsDark={isDark}
        isDark={isDark} // Navbar matches the dialogs' dark glass when the map is dark
      />

      {/* 2. Interactive 3D Canvas Globe Viewport */}
      <main className="relative flex-1 w-full h-full min-h-0">
        <EarthGlobe
          ref={globeRef}
          theme={theme}
          highlightCountry="356" // India Survey of India official map
          onlyIndia={onlyIndia} // When true, only India sovereign territory is rendered
          highlightState={highlightState}
          showStateBorders={showStateBorders}
          rotateDirection={rotateDirection}
          markers={markersToRender}
          selectedMarkerId={activeMarker?.id || null}
          autoRotate={autoRotate}
          autoRotateSpeed={autoRotateSpeed}
          enableDrag={true}
          enableZoom={true}
          showGraticule={showGraticule}
          showAtmosphere={showAtmosphere}
          showStars={showStars}
          initialCenter={activeMarker ? [activeMarker.lng, activeMarker.lat] : [78.9629, 20.5937]}
          initialZoom={1.2}
          onMarkerClick={(marker) => {
            handleSelectLocation(marker);
          }}
          onStateClick={(stateName) => {
            handleHighlightStateChange(stateName);
          }}
          className="w-full h-full"
        />

        {/* 3. Floating Left Panel: Active Location Spotlight Card */}
        {isDetailsOpen && activeMarker && (
          <div className="absolute top-6 left-6 z-30 pointer-events-auto transition-all animate-in fade-in slide-in-from-left-4 duration-300">
            <LocationDetailsCard
              marker={activeMarker}
              onFlyTo={(lat, lng, zoom) => globeRef.current?.flyTo(lat, lng, zoom)}
              onDeselect={() => handleSelectLocation(null)}
              isStateHighlighted={Boolean(
                highlightState &&
                  activeMarker.region &&
                  highlightState.toLowerCase().trim() === activeMarker.region.toLowerCase().trim()
              )}
              onToggleStateHighlight={() => {
                if (
                  highlightState &&
                  activeMarker.region &&
                  highlightState.toLowerCase().trim() === activeMarker.region.toLowerCase().trim()
                ) {
                  setHighlightState(null);
                } else if (activeMarker.region) {
                  handleHighlightStateChange(activeMarker.region);
                }
              }}
              isDark={isDark}
            />
          </div>
        )}

        {/* 4. Floating Right Panel: Globe Customizer & Controls HUD */}
        {isControlsOpen && (
          <div className="absolute top-6 right-6 z-30 pointer-events-auto transition-all animate-in fade-in slide-in-from-right-4 duration-300">
            <GlobeControls
              currentTheme={theme}
              onThemeChange={setTheme}
              autoRotate={autoRotate}
              onToggleAutoRotate={() => setAutoRotate((prev) => !prev)}
              autoRotateSpeed={autoRotateSpeed}
              onSpeedChange={setAutoRotateSpeed}
              rotateDirection={rotateDirection}
              onRotateDirectionChange={setRotateDirection}
              highlightState={highlightState}
              onHighlightStateChange={handleHighlightStateChange}
              selectedLocationId={activeMarker?.id || null}
              onSelectLocation={handleSelectLocation}
              onAddCustomLocation={handleAddCustomLocation}
              showStateBorders={showStateBorders}
              onToggleStateBorders={() => setShowStateBorders((prev) => !prev)}
              showGraticule={showGraticule}
              onToggleGraticule={() => setShowGraticule((prev) => !prev)}
              showAtmosphere={showAtmosphere}
              onToggleAtmosphere={() => setShowAtmosphere((prev) => !prev)}
              showStars={showStars}
              onToggleStars={() => setShowStars((prev) => !prev)}
              onlyIndia={onlyIndia}
              onToggleOnlyIndia={() => setOnlyIndia((prev) => !prev)}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onReset={handleResetView}
              onFlyToPreset={(_name, lat, lng, zoom = 1.6) =>
                globeRef.current?.flyTo(lat, lng, zoom)
              }
              onClose={() => setIsControlsOpen(false)}
              onToggleDarkMode={handleToggleDarkMode}
              mapThemeIsDark={isDark}
              isDark={isDark}
            />
          </div>
        )}

        {/* Floating Reopen Controls Button when HUD is collapsed */}
        {!isControlsOpen && (
          <button
            onClick={() => setIsControlsOpen(true)}
            className={`absolute top-4 right-6 z-30 px-3.5 py-2 rounded-xl border backdrop-blur-md shadow-2xl flex items-center gap-2 cursor-pointer transition-colors ${
              isDark
                ? 'bg-zinc-950/80 hover:bg-zinc-800 text-zinc-300 border-zinc-800/80'
                : 'bg-white/95 hover:bg-neutral-100 text-neutral-900 border-neutral-300'
            } shadow-xl`}
            title="Open Globe Customizer & Layers Menu"
          >
            <SlidersHorizontal className={`w-4 h-4 ${isDark ? 'text-zinc-300' : 'text-neutral-900'}`} />
            <span className="text-xs font-bold">Open Customizer Menu</span>
          </button>
        )}

        {/* 5. Floating Quick Actions Buttons */}
        <div className="absolute bottom-10 left-6 z-30 flex items-center gap-2 flex-wrap max-w-[85vw]">
          {/* Active location indicator / Deselect button */}
          {activeMarker ? (
            <button
              onClick={() => handleSelectLocation(null)}
              className={`h-7 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed backdrop-blur-md transition-colors cursor-pointer inline-grid leading-none ${
                isDark
                  ? 'bg-zinc-950/80 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                  : 'bg-white/85 border-zinc-200/80 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950'
              }`}
              title="Deselect active pin so map is completely clean"
            >
              <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5 leading-none">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span className="leading-none">Deselect Pin</span>
                <span className="inline-flex items-center justify-center text-[10px] opacity-60 font-mono leading-none">[X]</span>
              </span>
              <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5 leading-none invisible">
                <span className="w-2 h-2 rounded-full shrink-0" />
                <span className="leading-none">Clean Map (No Point)</span>
              </span>
            </button>
          ) : (
            <div
              className={`h-7 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed backdrop-blur-md inline-grid select-none leading-none ${
                isDark
                  ? 'bg-zinc-950/80 border-zinc-800/80 text-zinc-400'
                  : 'bg-white/85 border-zinc-200/80 text-zinc-600'
              }`}
            >
              <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5 leading-none invisible">
                <span className="w-2 h-2 rounded-full shrink-0" />
                <span className="leading-none">Deselect Pin</span>
                <span className="inline-flex items-center justify-center text-[10px] opacity-60 font-mono leading-none">[X]</span>
              </span>
              <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5 leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 shrink-0" />
                <span className="leading-none">Clean Map (No Point)</span>
              </span>
            </div>
          )}

          {/* Embed / Pure Mode Button */}
          <button
            onClick={() => setIsEmbedMode(true)}
            className={`h-7 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed backdrop-blur-md transition-all cursor-pointer inline-flex items-center gap-1.5 leading-none ${
              isDark
                ? 'bg-zinc-950/80 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                : 'bg-white/85 border-zinc-200/80 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950'
            }`}
            title="Switch to clean isolated globe view (no UI chrome)"
          >
            <Maximize2 className="w-3.5 h-3.5 shrink-0" />
            <span className="leading-none">Pure View</span>
          </button>
        </div>

        {/* 6. Floating Zoom & Orientation HUD */}
        <div className={`absolute bottom-10 right-6 z-30 flex flex-col items-center gap-1 rounded-xl p-1 border backdrop-blur-md shadow-xl ${
          isDark
            ? 'bg-zinc-950/80 border-zinc-800/80 text-zinc-300'
            : 'bg-white/90 border-neutral-200/80 text-neutral-700'
        }`}>
          <button
            onClick={handleZoomIn}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-base font-bold ${
              isDark
                ? 'hover:bg-zinc-800 hover:text-white'
                : 'hover:bg-neutral-200 hover:text-neutral-950'
            }`}
            title="Zoom In"
          >
            +
          </button>
          <div className={`w-5 h-px ${isDark ? 'bg-zinc-800' : 'bg-neutral-200'}`} />
          <button
            onClick={handleZoomOut}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-base font-bold ${
              isDark
                ? 'hover:bg-zinc-800 hover:text-white'
                : 'hover:bg-neutral-200 hover:text-neutral-950'
            }`}
            title="Zoom Out"
          >
            −
          </button>
          <div className={`w-5 h-px ${isDark ? 'bg-zinc-800' : 'bg-neutral-200'}`} />
          <button
            onClick={handleResetView}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-xs ${
              isDark
                ? 'hover:bg-zinc-800 hover:text-white'
                : 'hover:bg-neutral-200 hover:text-neutral-950'
            }`}
            title="Reset to India Center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 7. Bottom Status Bar & Shortcuts Guide */}
        <div className={`absolute bottom-2 left-6 right-6 z-20 flex items-center justify-between text-[11px] font-mono pointer-events-none font-medium ${isDark ? 'text-zinc-500' : 'text-neutral-600'}`}>
          <div className="flex items-center gap-3">
            <span>SURVEY OF INDIA CARTOGRAPHY</span>
            <span>·</span>
            <span>{onlyIndia ? 'MODE: ONLY INDIA (ISOLATED)' : 'MODE: GLOBAL'}</span>
            <span>·</span>
            <span>PROJECTION: ORTHOGRAPHIC 3D</span>
            <span>·</span>
            <span>MAP: {currentThemeConfig.name.toUpperCase()}</span>
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <span>[SPACE] Pause</span>
            <span>·</span>
            <span>[T] Map Theme</span>
            <span>·</span>
            <span>[X] Clear</span>
            <span>·</span>
            <span>[C] Controls</span>
          </div>
        </div>
      </main>

      {/* 8. Code & Embed Modal */}
      <CodeExportModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        activeMarker={activeMarker}
        highlightState={highlightState || undefined}
        autoRotateSpeed={autoRotateSpeed}
        autoRotate={autoRotate}
        theme={theme}
        onlyIndia={onlyIndia}
        isDark={isDark}
      />
    </div>
  );
}
