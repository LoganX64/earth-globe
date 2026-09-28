import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { EarthGlobe, EarthGlobeRef } from './components/EarthGlobe';
import { GlobeMarker } from './components/EarthGlobe/types';
import {
  THEME_PRESETS,
  DEFAULT_THEME_ID,
  DEFAULT_DARK_THEME_ID,
  DEFAULT_LIGHT_THEME_ID,
} from './components/EarthGlobe/themePresets';
import './index.css';

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

const initialOnlyIndia = urlParams.get('onlyIndia') === 'true' || urlParams.get('indiaOnly') === 'true';
const initialWidth = urlParams.get('width') || urlParams.get('size') || '100%';
const initialHeight = urlParams.get('height') || urlParams.get('size') || '100%';
const initialSpeed = urlParams.get('speed') ? parseFloat(urlParams.get('speed')!) : 1.2;
const embedDragEnabled = urlParams.get('drag') !== 'false';
const embedZoomEnabled = urlParams.get('zoom') !== 'false';
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
      window.parent.postMessage({ type: 'earth-globe', command: 'ready' }, '*');
    }
  }, []);

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
          enableZoom={embedZoomEnabled}
          showGraticule={showGraticule}
          showAtmosphere={showAtmosphere}
          showStars={showStars}
          initialCenter={activeMarker ? [activeMarker.lng, activeMarker.lat] : [78.9629, 20.5937]}
          initialZoom={1.2}
          className="w-full h-full"
        />

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
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EmbedApp />
  </StrictMode>,
);
