import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { EarthGlobe, EarthGlobeRef } from './components/EarthGlobe';
import {
  GlobeMarker,
  MIN_ZOOM_LEVEL,
  MAX_ZOOM_LEVEL,
  DEFAULT_EMBED_ZOOM,
} from './components/EarthGlobe/types';
import {
  THEME_PRESETS,
  DEFAULT_THEME_ID,
  DEFAULT_DARK_THEME_ID,
  DEFAULT_LIGHT_THEME_ID,
} from './components/EarthGlobe/themePresets';
import { inject } from '@vercel/analytics';
import './index.css';

// Vercel Analytics — auto-tracks pageviews and custom events when hosted on Vercel
inject();

// ---------------------------------------------------------------------------
// postMessage trust boundary
// ---------------------------------------------------------------------------
// Driving the embed from a host page is a PUBLIC, UNAUTHENTICATED API: anyone
// may embed embed.html and script it. What is not allowed is a third party
// messaging an embed that is already on screen, so commands are accepted only
// from window.parent itself.
//
// To additionally restrict which sites may drive the embed, list their origins
// here. Empty (the default) means "any parent page may script its own embed".
const EMBED_ALLOWED_PARENT_ORIGINS: string[] = [];

const isTrustedHostMessage = (event: MessageEvent): boolean => {
  // Must come from the window that actually framed us. This is what stops a
  // pop-up, opener, or any other frame from driving the globe.
  if (event.source !== window.parent) return false;
  if (EMBED_ALLOWED_PARENT_ORIGINS.length === 0) return true;
  return EMBED_ALLOWED_PARENT_ORIGINS.includes(event.origin);
};

// Origin of the page that framed us, when the browser tells us. Used to scope
// the outbound 'ready' handshake instead of broadcasting it to any parent.
const getParentOrigin = (): string => {
  try {
    return document.referrer ? new URL(document.referrer).origin : '';
  } catch {
    return '';
  }
};

const urlParams = new URLSearchParams(window.location.search);

const modeParam = urlParams.get('mode')?.toLowerCase();
const themeParam = urlParams.get('theme');

let initialTheme = DEFAULT_THEME_ID;
if (modeParam === 'light') {
  if (themeParam && themeParam in THEME_PRESETS && !THEME_PRESETS[themeParam].isDark) {
    initialTheme = themeParam;
  } else {
    initialTheme = DEFAULT_LIGHT_THEME_ID;
  }
} else if (modeParam === 'dark') {
  if (themeParam && themeParam in THEME_PRESETS && THEME_PRESETS[themeParam].isDark) {
    initialTheme = themeParam;
  } else {
    initialTheme = DEFAULT_DARK_THEME_ID;
  }
} else if (themeParam && themeParam in THEME_PRESETS) {
  initialTheme = themeParam;
}

const lightThemeParam = urlParams.get('lightTheme');
const darkThemeParam = urlParams.get('darkTheme');

const initialLightTheme =
  lightThemeParam && lightThemeParam in THEME_PRESETS && !THEME_PRESETS[lightThemeParam].isDark
    ? lightThemeParam
    : DEFAULT_LIGHT_THEME_ID;

const initialDarkTheme =
  darkThemeParam && darkThemeParam in THEME_PRESETS && THEME_PRESETS[darkThemeParam].isDark
    ? darkThemeParam
    : DEFAULT_DARK_THEME_ID;

const initialOnlyIndia = urlParams.get('onlyIndia') === 'true' || urlParams.get('indiaOnly') === 'true';
const initialWidth = urlParams.get('width') || urlParams.get('size') || '100%';
const initialHeight = urlParams.get('height') || urlParams.get('size') || '100%';
const initialSpeed = urlParams.get('speed') ? parseFloat(urlParams.get('speed')!) : 1.2;
const embedDragEnabled = urlParams.get('drag') !== 'false';
// `zoom` is the master off-switch for zooming; the two granular params let a host
// keep one input path and drop the other, but never re-enable what zoom=false killed.
const embedZoomEnabled = urlParams.get('zoom') !== 'false';
const embedZoomButtonsEnabled =
  embedZoomEnabled && urlParams.get('zoomButtons') !== 'false';
const embedScrollZoomEnabled =
  embedZoomEnabled && urlParams.get('scrollZoom') !== 'false';

// Zoom bounds live in types.ts so the globe and the generator stay in step.
const parsedZoomLevel = urlParams.get('zoomLevel')
  ? parseFloat(urlParams.get('zoomLevel')!)
  : NaN;
const initialZoomLevel = isNaN(parsedZoomLevel)
  ? DEFAULT_EMBED_ZOOM
  : Math.min(MAX_ZOOM_LEVEL, Math.max(MIN_ZOOM_LEVEL, parsedZoomLevel));
const initialAutoRotate = urlParams.get('rotate') !== 'false';
const initialHighlightState = urlParams.get('state') || null;
const initialShowStateBorders = urlParams.get('borders') !== 'false';
const initialShowGraticule = urlParams.get('grid') !== 'false';
const initialShowAtmosphere = urlParams.get('atmosphere') !== 'false';
const initialShowStars = urlParams.get('stars') !== 'false';

const getInitialMarker = (): GlobeMarker | null => {
  const markerParam = urlParams.get('marker');
  const latParam = urlParams.get('lat');
  const lngParam = urlParams.get('lng');
  const nameParam = urlParams.get('name');
  const regionParam = urlParams.get('region');

  if (latParam && lngParam) {
    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);
    if (!isNaN(lat) && !isNaN(lng)) {
      return {
        id: markerParam || `embed-marker-${lat}-${lng}`,
        name: nameParam || 'Location',
        region: regionParam || undefined,
        country: 'India',
        lat,
        lng,
        isPrimary: true,
      };
    }
  }

  if (markerParam) {
    return {
      id: markerParam,
      name: nameParam || markerParam,
      region: regionParam || undefined,
      country: 'India',
      lat: 20.5937,
      lng: 78.9629,
      isPrimary: true,
    };
  }

  return null;
};

function EmbedApp() {
  const globeRef = useRef<EarthGlobeRef>(null);
  const [theme, setTheme] = useState<string>(initialTheme);
  const [onlyIndia, setOnlyIndia] = useState<boolean>(initialOnlyIndia);
  const [highlightState, setHighlightState] = useState<string | null>(initialHighlightState);
  const [autoRotate, setAutoRotate] = useState<boolean>(initialAutoRotate);
  const [autoRotateSpeed, setAutoRotateSpeed] = useState<number>(isNaN(initialSpeed) ? 1.2 : initialSpeed);
  const [showStateBorders, setShowStateBorders] = useState<boolean>(initialShowStateBorders);
  const [showGraticule, setShowGraticule] = useState<boolean>(initialShowGraticule);
  const [showAtmosphere, setShowAtmosphere] = useState<boolean>(initialShowAtmosphere);
  const [showStars, setShowStars] = useState<boolean>(initialShowStars);
  const [activeMarker, setActiveMarker] = useState<GlobeMarker | null>(getInitialMarker);

  const currentThemeConfig = THEME_PRESETS[theme] || THEME_PRESETS[DEFAULT_THEME_ID];
  const isDark = currentThemeConfig.isDark;

  const formattedWidth = typeof initialWidth === 'number' ? `${initialWidth}px` : initialWidth;
  const formattedHeight = typeof initialHeight === 'number' ? `${initialHeight}px` : initialHeight;

  const handleZoomIn = () => {
    const z = globeRef.current?.getZoom() || 1.0;
    globeRef.current?.setZoom(z * 1.25);
  };

  const handleZoomOut = () => {
    const z = globeRef.current?.getZoom() || 1.0;
    globeRef.current?.setZoom(z * 0.8);
  };

  useEffect(() => {
    const handleResize = () => {
      window.dispatchEvent(new Event('resize'));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isTrustedHostMessage(event)) return;
      if (event.data?.type !== 'earth-globe') return;

      const { command, payload } = event.data;

      switch (command) {
        case 'flyTo':
          if (payload?.lat != null && payload?.lng != null) {
            globeRef.current?.flyTo(payload.lat, payload.lng, payload.zoomMultiplier);
          }
          break;
        case 'focusState':
          if (payload?.stateName) {
            globeRef.current?.focusState(payload.stateName, payload.zoomMultiplier);
            setHighlightState(payload.stateName);
          }
          break;
        case 'setMarker':
          if (payload?.marker) {
            setActiveMarker(payload.marker);
            globeRef.current?.flyTo(payload.marker.lat, payload.marker.lng, 1.8);
          } else {
            setActiveMarker(null);
          }
          break;
        case 'clearMarker':
          setActiveMarker(null);
          break;
        case 'setHighlightState':
          setHighlightState(payload?.stateName || null);
          if (payload?.stateName) {
            globeRef.current?.focusState(payload.stateName, 2.2);
          }
          break;
        case 'clearHighlightState':
          setHighlightState(null);
          break;
        case 'setTheme':
          if (payload?.themeId && payload.themeId in THEME_PRESETS) {
            setTheme(payload.themeId);
          }
          break;
        case 'resetView':
          globeRef.current?.resetView();
          break;
        case 'toggleAutoRotate':
          globeRef.current?.toggleAutoRotate();
          setAutoRotate(globeRef.current?.getRotation ? true : true);
          break;
        case 'setZoom':
          if (payload?.zoom != null) {
            globeRef.current?.setZoom(payload.zoom);
          }
          break;
        case 'setOnlyIndia':
          setOnlyIndia(payload?.onlyIndia ?? false);
          break;
        case 'setShowStateBorders':
          setShowStateBorders(payload?.show ?? true);
          break;
        case 'setShowGraticule':
          setShowGraticule(payload?.show ?? true);
          break;
        case 'setShowAtmosphere':
          setShowAtmosphere(payload?.show ?? true);
          break;
        case 'setShowStars':
          setShowStars(payload?.show ?? true);
          break;
        case 'setAutoRotate':
          setAutoRotate(payload?.enabled ?? true);
          break;
        case 'setAutoRotateSpeed':
          setAutoRotateSpeed(payload?.speed ?? 1.2);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.parent !== window) {
      const parentOrigin = getParentOrigin();
      window.parent.postMessage(
        { type: 'earth-globe', command: 'ready' },
        parentOrigin || '*',
      );
    }
  }, []);

  return (
    <div
      className="w-full h-[100dvh] flex items-center justify-center overflow-hidden relative transition-colors duration-500"
      style={{
        backgroundColor: currentThemeConfig.background,
        overscrollBehavior: 'contain',
      }}
    >
      <div
        style={{
          width: formattedWidth,
          height: formattedHeight,
          maxWidth: '100%',
          maxHeight: '100%',
          position: 'relative',
        }}
        className="flex items-center justify-center overflow-hidden"
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
          initialCenter={activeMarker ? [activeMarker.lng, activeMarker.lat] : [78.9629, 20.5937]}
          initialZoom={initialZoomLevel}
          className="w-full h-full"
        />

        {embedZoomButtonsEnabled && (
          <div
            className={`hud-bottom absolute right-2 z-50 flex flex-col items-center gap-1 rounded-xl p-1 border backdrop-blur-md shadow-xl sm:right-6 ${
              /* Same glass surface as the app's floating HUD and customizer. */
              isDark
                ? 'bg-zinc-950/80 border-zinc-800/80 text-zinc-300'
                : 'bg-white/85 border-neutral-200/80 text-neutral-700'
            }`}
          >
            <button
              onClick={handleZoomIn}
              className={`w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-base font-bold ${
                isDark
                  ? 'hover:bg-zinc-800 hover:text-white'
                  : 'hover:bg-neutral-200 hover:text-neutral-950'
              }`}
              title="Zoom In"
              aria-label="Zoom In"
            >
              +
            </button>
            <div className={`w-5 h-px ${isDark ? 'bg-zinc-800' : 'bg-neutral-200'}`} />
            <button
              onClick={handleZoomOut}
              className={`w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-base font-bold ${
                isDark
                  ? 'hover:bg-zinc-800 hover:text-white'
                  : 'hover:bg-neutral-200 hover:text-neutral-950'
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EmbedApp />
  </StrictMode>,
);
