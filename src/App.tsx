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

  // Core configuration states
  const [theme, setTheme] = useState<string>(defaultInitialTheme);
  const [onlyIndia, setOnlyIndia] = useState<boolean>(initialOnlyIndia);
  const [highlightState, setHighlightState] = useState<string | null>(urlParams?.get('state') || null);
  const [autoRotate, setAutoRotate] = useState<boolean>(urlParams?.get('rotate') !== 'false');
  const [autoRotateSpeed, setAutoRotateSpeed] = useState<number>(isNaN(initialSpeed) ? 1.2 : initialSpeed);
  const [rotateDirection, setRotateDirection] = useState<'west-to-east' | 'east-to-west'>('west-to-east');
  const [showStateBorders, setShowStateBorders] = useState<boolean>(urlParams?.get('borders') !== 'false');
  const [showGraticule, setShowGraticule] = useState<boolean>(urlParams?.get('grid') !== 'false');
  const [showAtmosphere, setShowAtmosphere] = useState<boolean>(urlParams?.get('atmosphere') !== 'false');
  const [showStars, setShowStars] = useState<boolean>(urlParams?.get('stars') !== 'false');
  const [showSecondaryMarkers, setShowSecondaryMarkers] = useState<boolean>(false);

  // Active marker states
  const initialMarkerParam = urlParams?.get('marker');
  const getInitialMarker = (): GlobeMarker | null => {
    if (!initialMarkerParam) return null;
    const lower = initialMarkerParam.toLowerCase();
    if (lower === 'ulhasnagar') return ULHASNAGAR_MARKER;
    if (lower === 'thrissur') return THRISSUR_MARKER;
    if (lower === 'mumbai') return MUMBAI_MARKER;
    return POPULAR_INDIAN_LOCATIONS.find((p) => p.id.toLowerCase() === lower || p.name.toLowerCase().includes(lower)) || null;
  };

  const [activeMarker, setActiveMarker] = useState<GlobeMarker | null>(getInitialMarker);
  const [isControlsOpen, setIsControlsOpen] = useState<boolean>(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(Boolean(initialMarkerParam));
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(false);

  const currentThemeConfig = THEME_PRESETS[theme] || THEME_PRESETS[DEFAULT_THEME_ID];
  const isDark = currentThemeConfig.isDark;

  const handleToggleDarkMode = useCallback(() => {
    setTheme((prevTheme) => {
      const currentIsDark = THEME_PRESETS[prevTheme]?.isDark ?? true;
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
              className={`absolute bottom-6 left-6 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold backdrop-blur-md shadow-xl transition-colors cursor-pointer ${
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
    <div className="relative w-screen h-screen overflow-hidden flex flex-col transition-colors duration-500 font-sans bg-zinc-100 text-zinc-900">
      {/* 1. Header Navigation Bar - ALWAYS LIGHT MODE */}
      <TopBar
        activeLocationName={activeMarker?.name || null}
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
        isDark={false} // Navbar ALWAYS stays in Light Mode UI
      />

      {/* 2. Interactive 3D Canvas Globe Viewport */}
      <main className="relative flex-1 w-full h-full pt-14">
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
          <div className="absolute top-20 left-6 z-30 pointer-events-auto transition-all animate-in fade-in slide-in-from-left-4 duration-300">
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
              isDark={false}
            />
          </div>
        )}

        {/* 4. Floating Right Panel: Globe Customizer & Controls HUD */}
        {isControlsOpen && (
          <div className="absolute top-20 right-6 z-30 pointer-events-auto transition-all animate-in fade-in slide-in-from-right-4 duration-300">
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
              isDark={false}
            />
          </div>
        )}

        {/* Floating Reopen Controls Button when HUD is collapsed */}
        {!isControlsOpen && (
          <button
            onClick={() => setIsControlsOpen(true)}
            className="absolute top-18 right-6 z-30 px-3.5 py-2 rounded-xl border backdrop-blur-md shadow-2xl flex items-center gap-2 cursor-pointer transition-all hover:scale-105 bg-white/95 hover:bg-zinc-100 text-zinc-900 border-zinc-300 shadow-xl"
            title="Open Globe Customizer & Layers Menu"
          >
            <SlidersHorizontal className="w-4 h-4 text-zinc-900" />
            <span className="text-xs font-bold">Open Customizer Menu</span>
          </button>
        )}

        {/* 5. Floating Quick Actions Buttons */}
        <div className="absolute bottom-10 left-6 z-30 flex items-center gap-2 flex-wrap max-w-[85vw]">
          {/* Active location indicator / Deselect button */}
          {activeMarker ? (
            <button
              onClick={() => handleSelectLocation(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border backdrop-blur-md transition-all cursor-pointer shadow-md inline-flex items-center gap-1.5 leading-none bg-white/90 hover:bg-zinc-100 text-zinc-800 hover:text-zinc-950 border-zinc-300"
              title="Deselect active pin so map is completely clean"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <span className="leading-none">Deselect Pin</span>
              <span className="inline-flex items-center justify-center text-[10px] opacity-60 font-mono leading-none">[X]</span>
            </button>
          ) : (
            <div className="px-3 py-1.5 rounded-lg text-xs font-semibold border backdrop-blur-md inline-flex items-center gap-1.5 shadow-sm select-none leading-none bg-white/80 text-zinc-600 border-zinc-200">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0" />
              <span className="leading-none">Clean Map (No Point)</span>
            </div>
          )}

          {/* Embed / Pure Mode Button */}
          <button
            onClick={() => setIsEmbedMode(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border backdrop-blur-md transition-all cursor-pointer shadow-md inline-flex items-center gap-1.5 leading-none bg-white/90 hover:bg-zinc-100 text-zinc-800 hover:text-zinc-950 border-zinc-300"
            title="Switch to clean isolated globe view (no UI chrome)"
          >
            <Maximize2 className="w-3.5 h-3.5 shrink-0" />
            <span className="leading-none">Pure View</span>
          </button>
        </div>

        {/* 6. Floating Zoom & Orientation HUD */}
        <div className="absolute bottom-10 right-6 z-30 flex flex-col items-center gap-1 rounded-xl p-1 border backdrop-blur-md shadow-xl bg-white/90 border-zinc-200/80 text-zinc-700">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-base font-bold hover:bg-zinc-200 hover:text-zinc-950"
            title="Zoom In"
          >
            +
          </button>
          <div className="w-5 h-px bg-zinc-200" />
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-base font-bold hover:bg-zinc-200 hover:text-zinc-950"
            title="Zoom Out"
          >
            −
          </button>
          <div className="w-5 h-px bg-zinc-200" />
          <button
            onClick={handleResetView}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-xs hover:bg-zinc-200 hover:text-zinc-950"
            title="Reset to India Center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 7. Bottom Status Bar & Shortcuts Guide */}
        <div className="absolute bottom-2 left-6 right-6 z-20 flex items-center justify-between text-[11px] font-mono pointer-events-none text-zinc-600 font-medium">
          <div className="flex items-center gap-3">
            <span>SURVEY OF INDIA CARTOGRAPHY</span>
            <span>·</span>
            <span>{onlyIndia ? 'MODE: ONLY INDIA (ISOLATED)' : 'MODE: GLOBAL'}</span>
            <span>·</span>
            <span>PROJECTION: ORTHOGRAPHIC 3D</span>
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <span>[SPACE] Pause</span>
            <span>·</span>
            <span>[T] Map Mode</span>
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
