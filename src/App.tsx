/**
 * Earth Globe Application
 * Interactive reusable 3D globe with official Survey of India cartography.
 * Supports customizable speeds, dynamic state highlighting, custom location pins,
 * pure embed / component mode, light & dark mode globes, and isolated "Only India" map projection.
 * 100% Client-side React + Vite SPA (Zero backend needed, Vercel Free Tier ready).
 */

import { useState, useRef, useCallback, useMemo } from "react";
import {
  EarthGlobe,
  EarthGlobeRef,
  THEME_PRESETS,
  DEFAULT_THEME_ID,
} from "./components/EarthGlobe";
import type { GlobeMarker } from "./components/EarthGlobe/types";
import { resolveFrameBackground } from "./components/EarthGlobe/background";
import { CityDetailsCard } from "./components/CityDetailsCard";
import { GlobeControls } from "./components/GlobeControls";
import { Navbar } from "./components/Navbar";
import { CodeExportModal } from "./components/CodeExportModal";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useMapSettings } from "./hooks/useMapSettings";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { SlidersHorizontal, RotateCcw, Maximize2, X } from "lucide-react";

/**
 * Stand-in shown when the globe itself fails to render. The rest of the page
 * stays interactive, so the customizer, search and code export all still work —
 * only the map is lost.
 */
const GlobeFailedNotice = ({ isDark }: { isDark: boolean }) => (
  <div
    className={`flex h-full w-full items-center justify-center p-6 text-center ${
      isDark ? "bg-zinc-950 text-zinc-400" : "bg-white text-neutral-500"
    }`}
  >
    <div className="max-w-xs space-y-2">
      <p className="text-sm font-semibold">The globe could not be drawn.</p>
      <p className="text-xs opacity-80">
        Reload the page to try again. Your saved settings are safe.
      </p>
    </div>
  </div>
);

export default function App() {
  const globeRef = useRef<EarthGlobeRef>(null);

  // URL resolution, all settings state, persistence and multi-tab
  // reconciliation live in the hook. `config` is resolved once at mount.
  const [search] = useState(() =>
    typeof window !== "undefined" ? window.location.search : ""
  );
  const settings = useMapSettings(search);
  const {
    config,
    theme,
    lightTheme,
    darkTheme,
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
  } = settings;

  // Pure-view dimensions and interaction switches come from the parsed config.
  const embedWidth = config.width;
  const embedHeight = config.height;
  const embedDragEnabled = config.dragEnabled;
  const embedZoomEnabled = config.zoomEnabled;
  const initialEmbed = config.isEmbedMode;

  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(
    Boolean(config.urls.markerId || config.urls.hasLatLng) || activeMarker !== null
  );
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(false);

  // Selecting a city must never close the customizer, and the "Open Customizer
  // Menu" button must stay reachable, so neither panel closes the other.
  //
  // This used to be gated on `isCompactLayout`, derived from
  // `(min-width: 40rem)` — a query that is true on DESKTOP and false on phones,
  // the exact opposite of what the name and every call site assumed. The gate
  // therefore fired on desktop only: picking a city shut the customizer, and
  // the reopen button was suppressed by the same inverted flag, so the panel
  // vanished with no way back. On phones the flag was always false, so the
  // exclusion never ran there — which is why removing it leaves phone
  // behaviour untouched (both panels already mounted; the card covers the
  // customizer via z-45 over z-40, as the panel comments below describe).
  const openDetailsPanel = useCallback(() => {
    setIsDetailsOpen(true);
  }, []);

  const openControlsPanel = useCallback(() => {
    setIsControlsOpen(true);
  }, []);

  const currentThemeConfig =
    THEME_PRESETS[theme] || THEME_PRESETS[DEFAULT_THEME_ID];

  // Only ever the neutral colour — a custom colour is painted on the canvas
  // alone. Leaving this undefined keeps every theme-aware background class in
  // charge.
  const frameBackground = resolveFrameBackground(
    showBackground,
    currentThemeConfig.isDark,
  );

  // Map theme darkness — drives ONLY the globe and pure-view overlays.
  // The site chrome itself is always light mode.
  const isDark = currentThemeConfig.isDark;

  // The custom colour belongs to whichever polarity is on screen, so a colour
  // set while a dark theme is active is never used by a light one.
  const activeBackgroundColor = isDark ? darkBackground : lightBackground;

  // Provenance of the basemap currently drawn. The India vectors are always
  // Survey of India, but with onlyIndia off the other landmasses come from the
  // world atlas (Natural Earth), so claiming a single source would be wrong.
  // This is about the map, not the selected pin — a pin in Tokyo still sits on
  // Survey of India boundaries.
  const cartographySource = onlyIndia
    ? "Survey of India (Official)"
    : "Survey of India + Natural Earth";

  // Active markers passed to the globe (memoized to prevent render loop restarts)
  const markersToRender: GlobeMarker[] = useMemo(
    () => (activeMarker ? [activeMarker] : []),
    [activeMarker]
  );

  // Handle location selection - selecting the active pin again just reopens its card
  const handleSelectLocation = useCallback(
    (marker: GlobeMarker | null) => {
      if (!marker) {
        setActiveMarker(null);
        setIsDetailsOpen(false);
        return;
      }

      // Re-clicking the active pin reopens its panel. Removing the pin is an
      // explicit action (the card's Deselect button, the HUD, or the X key).
      setActiveMarker((current) =>
        current?.id === marker.id ? current : marker,
      );
      openDetailsPanel();

      globeRef.current?.flyTo(marker.lat, marker.lng, 1.8);
    },
    [openDetailsPanel],
  );

  const handleHighlightStateChange = useCallback((stateName: string | null) => {
    setHighlightState(stateName);
    if (stateName) {
      globeRef.current?.focusState(stateName, 2.2);
    }
  }, []);

  const handleSearchSelectLocation = useCallback(
    (marker: GlobeMarker, stateName?: string) => {
      setActiveMarker(marker);
      openDetailsPanel();
      if (stateName) {
        setHighlightState(stateName);
      }
      globeRef.current?.flyTo(marker.lat, marker.lng, 2.2);
    },
    [openDetailsPanel],
  );

  const handleAddCustomLocation = (marker: GlobeMarker) => {
    setActiveMarker(marker);
    openDetailsPanel();
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
  useKeyboardShortcuts({
    onSelectLocation: handleSelectLocation,
    onResetView: handleResetView,
    onToggleControls: () =>
      setIsControlsOpen((prev) => (prev ? false : true)),
    onToggleDarkMode: handleToggleDarkMode,
    onDismissDetails: () => setIsDetailsOpen(false),
    onExitEmbedMode: () => setIsEmbedMode(false),
    setAutoRotate,
    isControlsOpen,
    isEmbedMode,
    startedInEmbedMode: initialEmbed,
  });

  // =========================================================================
  // PURE EMBED / COMPONENT MODE: ONLY THE GLOBE AND MAP WITH SIZE CUSTOMIZATION
  // =========================================================================
  if (isEmbedMode) {
    const formattedWidth =
      typeof embedWidth === "number" ? `${embedWidth}px` : embedWidth;
    const formattedHeight =
      typeof embedHeight === "number" ? `${embedHeight}px` : embedHeight;

    return (
      <div
        className="w-full h-dvh flex items-center justify-center overflow-hidden relative transition-colors duration-500 overscroll-contain"
        style={{
          backgroundColor: frameBackground ?? currentThemeConfig.background,
        }}
      >
        <div
          style={{ width: formattedWidth, height: formattedHeight }}
          className="flex items-center justify-center overflow-hidden max-w-full max-h-full relative"
        >
          <ErrorBoundary fallback={<GlobeFailedNotice isDark={isDark} />}>
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
              showBackground={showBackground}
              backgroundColor={activeBackgroundColor}
              initialCenter={
                activeMarker
                  ? [activeMarker.lng, activeMarker.lat]
                  : [78.9629, 20.5937]
              }
initialZoom={1.0}
              className="w-full h-full"
            />
          </ErrorBoundary>

          {/* Floating zoom controls */}
          {embedZoomEnabled && (
            <div
              className={`bottom-hud absolute right-2 z-50 flex flex-col items-center gap-1 rounded-xl p-1 border backdrop-blur-md shadow-xl sm:right-6 ${
                /* Same glass surface as the dashboard zoom HUD and the customizer. */
                isDark
                  ? "bg-zinc-950/80 border-zinc-800/80 text-zinc-300"
                  : "bg-white/85 border-neutral-200/80 text-neutral-700"
              }`}
            >
              <button
                onClick={handleZoomIn}
                className={`w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-base font-bold ${
                  isDark
                    ? "hover:bg-zinc-800 hover:text-white"
                    : "hover:bg-neutral-200 hover:text-neutral-950"
                }`}
                title="Zoom In"
                aria-label="Zoom In"
              >
                +
              </button>
              <div
                className={`w-5 h-px ${isDark ? "bg-zinc-800" : "bg-neutral-200"}`}
              />
              <button
                onClick={handleZoomOut}
                className={`w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-base font-bold ${
                  isDark
                    ? "hover:bg-zinc-800 hover:text-white"
                    : "hover:bg-neutral-200 hover:text-neutral-950"
                }`}
                title="Zoom Out"
                aria-label="Zoom Out"
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
                  ? "bg-zinc-950/80 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  : "bg-white/85 border-zinc-200/80 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
              }`}
              title="Exit Pure View (or press X / Esc)"
              aria-label="Exit Pure View"
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
    <div
      className="relative w-full h-dvh overflow-hidden flex flex-col transition-colors duration-500 font-sans bg-background text-foreground"
      style={
        frameBackground ? { backgroundColor: frameBackground } : undefined
      }
    >
      {/* 1. Header Navigation Bar - light chrome, or the dialogs' dark glass in dark mode */}
      <Navbar
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
        onToggleControls={() => {
          if (isControlsOpen) {
            setIsControlsOpen(false);
          } else {
            openControlsPanel();
          }
        }}
        isControlsOpen={isControlsOpen}
        onToggleEmbedMode={() => setIsEmbedMode(true)}
        onToggleDarkMode={handleToggleDarkMode}
        mapThemeIsDark={isDark}
        isDark={isDark} // Navbar matches the dialogs' dark glass when the map is dark
      />

      {/* 2. Interactive 3D Canvas Globe Viewport */}
      <main className="relative flex-1 w-full h-full min-h-0">
        <ErrorBoundary fallback={<GlobeFailedNotice isDark={isDark} />}>
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
            showBackground={showBackground}
            backgroundColor={activeBackgroundColor}
            initialCenter={
              activeMarker
                ? [activeMarker.lng, activeMarker.lat]
                : [78.9629, 20.5937]
            }
            initialZoom={1.0}
            onMarkerClick={(marker) => {
              handleSelectLocation(marker);
            }}
            onStateClick={(stateName) => {
              handleHighlightStateChange(stateName);
            }}
            className="w-full h-full"
          />
        </ErrorBoundary>

        {/* 3. Floating Left Panel: Active Location Spotlight Card.
            Stacking tiers used by every floating overlay in the app:
              z-10 status bar · z-20 bottom HUDs · z-30 customizer (sm+)
              z-40 customizer (mobile) / city card (sm+)
              z-45 city card (mobile) — must outrank the customizer, because at
              640-744px the "desktop" layout still overlaps the 360px card with
              the 384px panel. Stays under the navbar drawer (z-50). */}
        {isDetailsOpen && activeMarker && (
          <div className="absolute inset-x-2 top-2 z-45 pointer-events-auto transition-all animate-in fade-in slide-in-from-left-4 duration-300 sm:inset-x-auto sm:left-6 sm:top-6 sm:z-40">
{/* The card sits on top of the globe, so it gets its own boundary:
                a throw here must not take the map down with it. resetKey lets
                a fresh selection retry after a failure. */}
            <ErrorBoundary fallback={null} resetKey={activeMarker?.id}>
              <CityDetailsCard
                marker={activeMarker}
                onFlyTo={(lat, lng, zoom) =>
                  globeRef.current?.flyTo(lat, lng, zoom)
                }
                onClose={() => setIsDetailsOpen(false)}
                onDeselect={() => handleSelectLocation(null)}
                isStateHighlighted={Boolean(
                  highlightState &&
                    activeMarker.region &&
                    highlightState.toLowerCase().trim() ===
                      activeMarker.region.toLowerCase().trim(),
                )}
                onToggleStateHighlight={() => {
                  if (
                    highlightState &&
                    activeMarker.region &&
                    highlightState.toLowerCase().trim() ===
                      activeMarker.region.toLowerCase().trim()
                  ) {
                    setHighlightState(null);
                  } else if (activeMarker.region) {
                    handleHighlightStateChange(activeMarker.region);
                  }
                }}
                isDark={isDark}
                cartographySource={cartographySource}
              />
            </ErrorBoundary>
          </div>
        )}

        {/* 4. Floating Right Panel: Globe Customizer & Controls HUD.
            Below sm the panel is inset from BOTH edges: the card is w-full, so
            anchoring it to right-6 alone used to push it (and its close button)
            off the right edge on any viewport narrower than 408px. z-40 on
            phones so it also sits above the bottom zoom/quick-action HUDs, which
            share its width and were intercepting clicks on the layer toggles. */}
        {isControlsOpen && (
          <div className="absolute inset-x-2 top-2 z-40 pointer-events-auto transition-all animate-in fade-in slide-in-from-right-4 duration-300 sm:inset-x-auto sm:top-6 sm:right-6 sm:z-30">
            <ErrorBoundary fallback={null} resetKey={theme}>
              <GlobeControls
                currentTheme={theme}
                onThemeChange={handleThemeChange}
                lightTheme={lightTheme}
                darkTheme={darkTheme}
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
                showBackground={showBackground}
                backgroundColor={activeBackgroundColor}
                onToggleStars={() => setShowStars((prev) => !prev)}
                onToggleShowBackground={() => setShowBackground((prev) => !prev)}
                // The picker edits whichever polarity is on screen, so a colour
                // chosen under a dark theme is never reused by a light one.
                onBackgroundColorChange={(color) => {
                  if (isDark) setDarkBackground(color);
                  else setLightBackground(color);
                }}
                onlyIndia={onlyIndia}
                onToggleOnlyIndia={() => setOnlyIndia((prev) => !prev)}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onReset={handleResetView}
                onClose={() => setIsControlsOpen(false)}
                onToggleDarkMode={handleToggleDarkMode}
                mapThemeIsDark={isDark}
                isDark={isDark}
              />
            </ErrorBoundary>
          </div>
        )}

        {/* Floating Reopen Controls Button — shown whenever the customizer is
            closed, so a dismissed panel can always be brought back. The old
            extra condition suppressed this on the very layout that needed it. */}
        {!isControlsOpen && (
            <button
              onClick={openControlsPanel}
              className={`absolute top-2 right-2 z-30 px-3.5 py-2 rounded-xl border backdrop-blur-md shadow-2xl flex items-center gap-2 cursor-pointer transition-colors sm:top-4 sm:right-6 ${
                isDark
                  ? "bg-zinc-950/80 hover:bg-zinc-800 text-zinc-300 border-zinc-800/80"
                  : "bg-white/95 hover:bg-neutral-100 text-neutral-900 border-neutral-300"
              } shadow-xl`}
              title="Open Globe Customizer & Layers Menu"
            >
              <SlidersHorizontal
                className={`w-4 h-4 ${isDark ? "text-zinc-300" : "text-neutral-900"}`}
              />
              <span className="text-xs font-bold">Open Customizer Menu</span>
            </button>
          )}

        {/* 5. Floating Quick Actions Buttons */}
        <div className="bottom-hud absolute left-2 z-20 flex items-center gap-2 flex-wrap max-w-[calc(100vw-4.5rem)] sm:left-6 sm:max-w-[85vw]">
          {/* Active location indicator / Deselect button */}
          {activeMarker ? (
            <button
              onClick={() => handleSelectLocation(null)}
              className={`h-11 sm:h-7 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed backdrop-blur-md transition-colors cursor-pointer inline-grid leading-none ${
                isDark
                  ? "bg-zinc-950/80 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  : "bg-white/85 border-zinc-200/80 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
              }`}
              title="Deselect active pin so map is completely clean"
            >
              <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5 leading-none">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span className="leading-none">Deselect Pin</span>
                <span className="inline-flex items-center justify-center text-[10px] opacity-60 font-mono leading-none">
                  [X]
                </span>
              </span>
              <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5 leading-none invisible">
                <span className="w-2 h-2 rounded-full shrink-0" />
                <span className="leading-none">Clean Map (No Point)</span>
              </span>
            </button>
          ) : (
            <div
              className={`h-11 sm:h-7 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed backdrop-blur-md inline-grid select-none leading-none ${
                isDark
                  ? "bg-zinc-950/80 border-zinc-800/80 text-zinc-400"
                  : "bg-white/85 border-zinc-200/80 text-zinc-600"
              }`}
            >
              <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5 leading-none invisible">
                <span className="w-2 h-2 rounded-full shrink-0" />
                <span className="leading-none">Deselect Pin</span>
                <span className="inline-flex items-center justify-center text-[10px] opacity-60 font-mono leading-none">
                  [X]
                </span>
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
            className={`h-11 sm:h-7 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed backdrop-blur-md transition-colors cursor-pointer inline-flex items-center gap-1.5 leading-none ${
              isDark
                ? "bg-zinc-950/80 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                : "bg-white/85 border-zinc-200/80 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
            }`}
            title="Switch to clean isolated globe view (no UI chrome)"
          >
            <Maximize2 className="w-3.5 h-3.5 shrink-0" />
            <span className="leading-none">Pure View</span>
          </button>
        </div>

        {/* 6. Floating Zoom & Orientation HUD */}
        <div
              className={`bottom-hud absolute right-2 z-20 flex flex-col items-center gap-1 rounded-xl p-1 border backdrop-blur-md shadow-xl sm:right-6 ${
            isDark
              ? "bg-zinc-950/80 border-zinc-800/80 text-zinc-300"
              : "bg-white/85 border-neutral-200/80 text-neutral-700"
          }`}
        >
          {/* 36px on phones to keep the HUD compact; 44px is the ideal touch
              target, so these stay slightly under it on small screens. */}
          <button
            onClick={handleZoomIn}
            className={`w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-base font-bold ${
              isDark
                ? "hover:bg-zinc-800 hover:text-white"
                : "hover:bg-neutral-200 hover:text-neutral-950"
            }`}
            title="Zoom In"
            aria-label="Zoom In"
          >
            +
          </button>
          <div
            className={`w-5 h-px ${isDark ? "bg-zinc-800" : "bg-neutral-200"}`}
          />
          <button
            onClick={handleZoomOut}
            className={`w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-base font-bold ${
              isDark
                ? "hover:bg-zinc-800 hover:text-white"
                : "hover:bg-neutral-200 hover:text-neutral-950"
            }`}
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            −
          </button>
          <div
            className={`w-5 h-px ${isDark ? "bg-zinc-800" : "bg-neutral-200"}`}
          />
          <button
            onClick={handleResetView}
            className={`w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-xs ${
              isDark
                ? "hover:bg-zinc-800 hover:text-white"
                : "hover:bg-neutral-200 hover:text-neutral-950"
            }`}
            title="Reset to India Center"
            aria-label="Reset to India Center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 7. Bottom Status Bar & Shortcuts Guide */}
        <div
          className={`bottom-status absolute left-2 right-2 z-10 flex items-center justify-between gap-3 text-[11px] font-mono pointer-events-none font-medium sm:left-6 sm:right-6 ${isDark ? "text-zinc-500" : "text-neutral-600"}`}
        >
          {/* Trims rather than overflowing: the full row needs ~450px, which a
              phone does not have. */}
          <div className="flex min-w-0 items-center gap-3 overflow-hidden whitespace-nowrap">
            <span className="shrink-0">SURVEY OF INDIA CARTOGRAPHY</span>
            <span className="hidden sm:inline">·</span>
            <span className="truncate">
              {onlyIndia ? "MODE: ONLY INDIA (ISOLATED)" : "MODE: GLOBAL"}
            </span>
            <span className="hidden md:inline">·</span>
            <span className="hidden md:inline">
              PROJECTION: ORTHOGRAPHIC 3D
            </span>
            <span className="hidden md:inline">·</span>
            <span className="hidden md:inline">
              MAP: {currentThemeConfig.name.toUpperCase()}
            </span>
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
      <ErrorBoundary fallback={null} resetKey={isCodeModalOpen}>
        <CodeExportModal
          isOpen={isCodeModalOpen}
          onClose={() => setIsCodeModalOpen(false)}
          activeMarker={activeMarker}
          highlightState={highlightState || undefined}
          autoRotateSpeed={autoRotateSpeed}
          autoRotate={autoRotate}
          respectReducedMotion={config.respectReducedMotion}
          theme={theme}
          lightTheme={lightTheme}
          darkTheme={darkTheme}
          onlyIndia={onlyIndia}
          isDark={isDark}
          showStars={showStars}
          showBackground={showBackground}
          lightBackground={lightBackground}
          darkBackground={darkBackground}
          showGraticule={showGraticule}
          showAtmosphere={showAtmosphere}
          showStateBorders={showStateBorders}
        />
      </ErrorBoundary>
    </div>
  );
}
