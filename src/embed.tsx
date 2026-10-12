import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { EarthGlobe, EarthGlobeRef } from "./components/EarthGlobe";
import {
  MAX_ZOOM_LEVEL,
  MIN_ZOOM_LEVEL,
  DEFAULT_ROTATION_SPEED,
  type GlobeMarker,
} from "./components/EarthGlobe/types";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { THEME_PRESETS, DEFAULT_THEME_ID } from "./components/EarthGlobe/themePresets";
import {
  normalizeBackgroundColor,
  resolveFrameBackground,
} from "./components/EarthGlobe/background";
import { inject } from "@vercel/analytics";
import "./index.css";

// Vercel Analytics — auto-tracks pageviews and custom events when hosted on Vercel
inject();

import { isTrustedHostMessage, getParentOrigin } from "./config/embedTrust";
import { parseGlobeConfig } from "./config/parseGlobeConfig";
import { resolveEmbedMarker } from "./config/resolveMarker";

// The embed never reads localStorage and never writes it, so no `saved` layer
// is passed — every saved fallback in the shared parser drops out. The embed
// zoom controls are its own; the main app starts at a fixed zoom instead.
const config = parseGlobeConfig(window.location.search, {
  embedZoomControls: true,
});

const initialTheme = config.theme;
const initialOnlyIndia = config.onlyIndia;
const initialWidth = config.width;
const initialHeight = config.height;
const embedDragEnabled = config.dragEnabled;
// `zoom` is the master off-switch; the two granular params let a host keep one
// input path and drop the other, but never re-enable what zoom=false killed.
const embedZoomEnabled = config.zoomEnabled;
const embedZoomButtonsEnabled = config.zoomButtonsEnabled;
const embedScrollZoomEnabled = config.scrollZoomEnabled;
const initialZoomLevel = config.initialZoom;
const initialAutoRotate = config.autoRotate;
const initialSpeed = config.autoRotateSpeed;
const initialHighlightState = config.highlightState;
const initialShowStateBorders = config.showStateBorders;
const initialShowGraticule = config.showGraticule;
const initialShowAtmosphere = config.showAtmosphere;
const initialShowStars = config.showStars;
const initialShowBackground = config.showBackground;
// Colours are per polarity so a dark theme and a light theme can carry their
// own, and neither inherits the other.
const initialLightBackground = config.lightBackground;
const initialDarkBackground = config.darkBackground;

const getInitialMarker = () => resolveEmbedMarker(config.urls);

// Payload validation for the public postMessage API.
//
// These coerce first and clamp second, rejecting only input that is genuinely
// unusable. That order is deliberate: the unguarded code relied on JS arithmetic
// to coerce numeric strings and on `setZoom`'s internal clamp, so hosts whose
// payloads come off a JSON API (`{ lat: "19.0760" }`) and hosts sending an
// out-of-range `{ zoom: 5 }` both work today. A plain `typeof === "number"`
// check would reject those and silently stop the globe moving.

const toFiniteNumber = (v: unknown): number | null => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

const toLat = (v: unknown): number | null => {
  const n = toFiniteNumber(v);
  return n === null ? null : clamp(n, -90, 90);
};

// Wrap rather than clamp: longitude 200 must land on the same pixels as -160.
const toLng = (v: unknown): number | null => {
  const n = toFiniteNumber(v);
  return n === null ? null : ((((n + 180) % 360) + 360) % 360) - 180;
};

const toZoom = (v: unknown): number | null => {
  const n = toFiniteNumber(v);
  return n === null ? null : clamp(n, MIN_ZOOM_LEVEL, MAX_ZOOM_LEVEL);
};

// `name` and the coordinates are the hard requirements — EarthGlobe calls
// `marker.name.toUpperCase()` and projects [lng, lat]. `id` is deliberately not
// required: a host sending only {name, lat, lng} gets a pin today, and demanding
// `id` would silently remove it from a live page.
const isMarker = (v: unknown): v is GlobeMarker => {
  if (!v || typeof v !== "object") return false;
  const m = v as Partial<GlobeMarker>;
  return (
    typeof m.name === "string" &&
    toLat(m.lat) !== null &&
    toLng(m.lng) !== null
  );
};

// A rejected command must be visible to the host, or a no-op here is
// indistinguishable from a bug in their own code. This is a new outbound event,
// purely additive: hosts that ignore unknown commands are unaffected.
const rejectCommand = (command: unknown, reason: string) => {
  console.warn("[earth-globe] rejected command", { command, reason });
  if (typeof window !== "undefined" && window.parent !== window) {
    window.parent.postMessage(
      {
        type: "earth-globe",
        command: "commandRejected",
        payload: { command, reason },
      },
      getParentOrigin() || "*",
    );
  }
};

function EmbedApp() {
  const globeRef = useRef<EarthGlobeRef>(null);
  const [theme, setTheme] = useState<string>(initialTheme);
  const [onlyIndia, setOnlyIndia] = useState<boolean>(initialOnlyIndia);
  const [highlightState, setHighlightState] = useState<string | null>(
    initialHighlightState,
  );
  const [autoRotate, setAutoRotate] = useState<boolean>(initialAutoRotate);
  const [autoRotateSpeed, setAutoRotateSpeed] = useState<number>(
    isNaN(initialSpeed) ? DEFAULT_ROTATION_SPEED : initialSpeed,
  );
  const [showStateBorders, setShowStateBorders] = useState<boolean>(
    initialShowStateBorders,
  );
  const [showGraticule, setShowGraticule] =
    useState<boolean>(initialShowGraticule);
  const [showAtmosphere, setShowAtmosphere] = useState<boolean>(
    initialShowAtmosphere,
  );
  const [showStars, setShowStars] = useState<boolean>(initialShowStars);
  const [showBackground, setShowBackground] =
    useState<boolean>(initialShowBackground);
  const [lightBackground, setLightBackground] = useState<string | null>(
    initialLightBackground,
  );
  const [darkBackground, setDarkBackground] = useState<string | null>(
    initialDarkBackground,
  );
  const [activeMarker, setActiveMarker] = useState<GlobeMarker | null>(
    getInitialMarker,
  );

  const currentThemeConfig =
    THEME_PRESETS[theme] || THEME_PRESETS[DEFAULT_THEME_ID];
  const isDark = currentThemeConfig.isDark;

  const formattedWidth =
    typeof initialWidth === "number" ? `${initialWidth}px` : initialWidth;
  const formattedHeight =
    typeof initialHeight === "number" ? `${initialHeight}px` : initialHeight;

  const handleZoomIn = () => {
    const z = globeRef.current?.getZoom() || 1.0;
    globeRef.current?.setZoom(z * 1.25);
  };

  const handleZoomOut = () => {
    const z = globeRef.current?.getZoom() || 1.0;
    globeRef.current?.setZoom(z * 0.8);
  };

  // Both entrypoints pin `<html class="scheme-light">`, so a dark embed renders
  // dark canvas inside a light frame: native scrollbars, form controls and the
  // caret come out light. Toggling the real `dark` class and the `color-scheme`
  // property follows the resolved theme, so those widgets match. The class list
  // is set rather than toggled because nothing else owns `dark`.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, [isDark]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isTrustedHostMessage(event)) return;
      if (event.data?.type !== "earth-globe") return;

      const { command, payload } = event.data;

      switch (command) {
        case "flyTo": {
          const lat = toLat(payload?.lat);
          const lng = toLng(payload?.lng);
          if (lat === null || lng === null) {
            rejectCommand(command, "flyTo requires a finite lat and lng");
            break;
          }
          const zoomMultiplier = toZoom(payload?.zoomMultiplier);
          globeRef.current?.flyTo(lat, lng, zoomMultiplier ?? undefined);
          break;
        }
        case "focusState":
          if (payload?.stateName) {
            globeRef.current?.focusState(
              payload.stateName,
              payload.zoomMultiplier,
            );
            setHighlightState(payload.stateName);
          }
          break;
        case "setMarker":
          if (payload?.marker == null) {
            setActiveMarker(null);
          } else if (isMarker(payload.marker)) {
            // Normalise once so nothing downstream sees a stringly-typed lat/lng.
            const lat = toLat(payload.marker.lat)!;
            const lng = toLng(payload.marker.lng)!;
            setActiveMarker({ ...payload.marker, lat, lng });
            globeRef.current?.flyTo(lat, lng, 1.8);
          } else {
            rejectCommand(command, "setMarker requires {name, lat, lng}");
          }
          break;
        case "clearMarker":
          setActiveMarker(null);
          break;
        case "setHighlightState":
          setHighlightState(payload?.stateName || null);
          if (payload?.stateName) {
            globeRef.current?.focusState(payload.stateName, 2.2);
          }
          break;
        case "clearHighlightState":
          setHighlightState(null);
          break;
        case "setTheme":
          if (payload?.themeId && payload.themeId in THEME_PRESETS) {
            setTheme(payload.themeId);
          }
          break;
        case "resetView":
          globeRef.current?.resetView();
          break;
        case "toggleAutoRotate":
          globeRef.current?.toggleAutoRotate();
          // Mirror the globe's post-toggle flag into React state, otherwise the
          // sync effect in EarthGlobe overwrites it on the next render.
          setAutoRotate(globeRef.current?.getIsAutoRotating() ?? true);
          break;
        case "setZoom": {
          const zoom = toZoom(payload?.zoom);
          if (zoom === null) {
            rejectCommand(command, "setZoom requires a finite zoom");
            break;
          }
          globeRef.current?.setZoom(zoom);
          break;
        }
        case "setOnlyIndia":
          setOnlyIndia(payload?.onlyIndia ?? false);
          break;
        case "setShowStateBorders":
          setShowStateBorders(payload?.show ?? true);
          break;
        case "setShowGraticule":
          setShowGraticule(payload?.show ?? true);
          break;
        case "setShowAtmosphere":
          setShowAtmosphere(payload?.show ?? true);
          break;
        case "setShowStars":
          setShowStars(payload?.show ?? true);
          break;
        case "setShowBackground":
          setShowBackground(payload?.show ?? true);
          break;
        case "setLightBackground":
          setLightBackground(normalizeBackgroundColor(payload?.color));
          break;
        case "setDarkBackground":
          setDarkBackground(normalizeBackgroundColor(payload?.color));
          break;
        case "setAutoRotate":
          setAutoRotate(payload?.enabled ?? true);
          break;
        case "setAutoRotateSpeed": {
          // Documented as 0.0–4.0 and explicitly not clamped, so only
          // non-numeric input falls back to the default.
          const speed = toFiniteNumber(payload?.speed);
          setAutoRotateSpeed(speed ?? DEFAULT_ROTATION_SPEED);
          break;
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.parent !== window) {
      const parentOrigin = getParentOrigin();
      window.parent.postMessage(
        { type: "earth-globe", command: "ready" },
        parentOrigin || "*",
      );
    }
  }, []);

  return (
    <div
      className="w-full h-dvh flex items-center justify-center overflow-hidden relative transition-colors duration-500 overscroll-contain"
      style={{
        backgroundColor:
          resolveFrameBackground(showBackground, isDark) ??
          currentThemeConfig.background,
      }}
    >
      <div
        style={{ width: formattedWidth, height: formattedHeight }}
        className="flex items-center justify-center overflow-hidden max-w-full max-h-full relative"
      >
        <ErrorBoundary
          resetKey={activeMarker?.id}
          fallback={
            <div
              className={`flex h-full w-full items-center justify-center p-6 text-center ${
                isDark ? "bg-zinc-950 text-zinc-400" : "bg-white text-neutral-500"
              }`}
            >
              <p className="text-xs opacity-80" role="alert">
                The globe could not be drawn.
              </p>
            </div>
          }
        >
          <EarthGlobe
            ref={globeRef}
            theme={theme}
            highlightCountry="356"
            onlyIndia={onlyIndia}
            highlightState={highlightState}
            showStateBorders={showStateBorders}
            rotateDirection="west-to-east"
            markers={activeMarker ? [activeMarker] : []}
            selectedMarkerId={activeMarker?.id || null}
            autoRotate={autoRotate}
            autoRotateSpeed={autoRotateSpeed}
            enableDrag={embedDragEnabled}
            enableZoom={embedScrollZoomEnabled}
            showGraticule={showGraticule}
            showAtmosphere={showAtmosphere}
            showStars={showStars}
            showBackground={showBackground}
            backgroundColor={isDark ? darkBackground : lightBackground}
            initialCenter={
              activeMarker
                ? [activeMarker.lng, activeMarker.lat]
                : [78.9629, 20.5937]
            }
            initialZoom={initialZoomLevel}
            className="w-full h-full"
          />
        </ErrorBoundary>

        {embedZoomButtonsEnabled && (
          <div
              className={`bottom-hud absolute right-2 z-50 flex flex-col items-center gap-1 rounded-xl p-1 border backdrop-blur-md shadow-xl sm:right-6 ${
              /* Same glass surface as the app's floating HUD and customizer. */
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
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <EmbedApp />
  </StrictMode>,
);
