/**
 * EarthGlobe - High-Performance Interactive Reusable 3D Globe Component
 * Built for full reusability and customization:
 * - Dynamic state highlighting (e.g. Kerala, Maharashtra, Gujarat, etc. or multiple states)
 * - Configurable rotation speed & direction
 * - Custom pins/markers anywhere in India or the world
 * - Authentic Survey of India cartography with J&K and Ladakh integrated
 * - High-contrast Black & White aesthetic with optional color palettes
 */

import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useMemo,
} from 'react';
import {
  geoOrthographic,
  geoPath,
  geoGraticule,
  geoDistance,
  geoContains,
  geoCentroid,
  GeoProjection,
} from 'd3-geo';
import { feature } from 'topojson-client';
import worldData from 'world-atlas/countries-110m.json';
import indiaOfficialGeo from '../../data/india-official.json';
import indiaOuterBoundary from '../../data/india-outer-boundary.json';
import indiaInternalBorders from '../../data/india-internal-borders.json';
import { EarthGlobeProps, GlobeMarker, GlobeThemeColors, MIN_ZOOM_LEVEL, MAX_ZOOM_LEVEL } from './types';
import { neutralBackground } from './background';
import { THEME_PRESETS, DEFAULT_THEME_ID, DEFAULT_DARK_THEME_ID, DEFAULT_LIGHT_THEME_ID } from './themePresets';

export interface EarthGlobeRef {
  flyTo: (lat: number, lng: number, zoomMultiplier?: number) => void;
  focusState: (stateName: string, zoomMultiplier?: number) => void;
  resetView: () => void;
  toggleAutoRotate: () => void;
  getIsAutoRotating: () => boolean;
  getZoom: () => number;
  setZoom: (zoom: number) => void;
  getRotation: () => [number, number];
}

// Convert world TopoJSON to GeoJSON features
const countriesGeo = (feature(
  worldData as any,
  (worldData as any).objects.countries
) as any).features as any[];

// Exclude default clipped India (ISO 356) from world-atlas so we use the authentic Survey of India official map
const OTHER_COUNTRIES = countriesGeo.filter(
  (f) =>
    f.id !== '356' &&
    f.id !== 356 &&
    f.properties?.name !== 'India'
);

// Authoritative Indian States & Union Territories (including Jammu & Kashmir and Ladakh)
const INDIA_OFFICIAL_FEATURES = (indiaOfficialGeo as any).features as any[];

// Lookup by lowercased, trimmed state name. The highlight pass still walks
// INDIA_OFFICIAL_FEATURES in order (it has to, to preserve draw order), but
// focusState, the hover preview and the camera centroid all want a single
// feature by name and were doing a linear scan with a case-sensitive compare.
const INDIA_FEATURE_BY_NAME = new Map<string, any>();
for (const stateFeature of INDIA_OFFICIAL_FEATURES) {
  const stName = stateFeature.properties?.st_nm;
  if (typeof stName === 'string') {
    INDIA_FEATURE_BY_NAME.set(stName.toLowerCase().trim(), stateFeature);
  }
}

/**
 * Formatted once at module load rather than per frame. Building an
 * `Intl.DateTimeFormat` — or the equivalent `toLocaleTimeString` call — is
 * markedly more expensive than the rest of the primary pin's callout put
 * together, and this value is rebuilt 60 times a second while a pin is
 * visible.
 */
const IST_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});

// Star generation for space background
interface Star {
  x: number;
  y: number;
  r: number;
  alpha: number;
  twinkleSpeed: number;
}

const generateStars = (count: number): Star[] => {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.6 + 0.4,
      alpha: Math.random() * 0.75 + 0.25,
      twinkleSpeed: Math.random() * 0.003 + 0.001,
    });
  }
  return stars;
};

const STATIC_STARS = generateStars(280);

/**
 * Sphere radius as a fraction of the shorter viewport edge, per unit of zoom.
 * The atmosphere halo is painted out to 1.2× the radius, so this is sized to
 * keep the whole globe AND its glow on screen at zoom 1 — at 0.42 the halo ran
 * past the edges and the default view read as zoomed in and cropped.
 */
const BASE_RADIUS_FACTOR = 0.38;

export const EarthGlobe = forwardRef<EarthGlobeRef, EarthGlobeProps>(
  (
    {
      width,
      height,
      highlightCountry = '356',
      highlightState = null,
      highlightStateColor,
      showStateBorders = true,
      rotateDirection = 'west-to-east',
      onStateHover,
      onStateClick,
      markers = [],
      selectedMarkerId = null,
      onMarkerClick,
      onMarkerHover,
      onCountryClick,
      mode,
      theme = DEFAULT_THEME_ID,
      customColors,
      autoRotate = true,
      autoRotateSpeed = 1.2,
      enableDrag = true,
      enableZoom = true,
      initialCenter = [78.9629, 20.5937], // Centered on India [lng, lat]
      initialZoom = 1.0,
      minZoom = MIN_ZOOM_LEVEL,
      maxZoom = MAX_ZOOM_LEVEL,
      showGraticule = true,
      showAtmosphere = true,
      showStars = true,
      showBackground = true,
      backgroundColor = null,
      onlyIndia = false,
      className = '',
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Resolve theme based on mode ('dark' | 'light' | 'auto') or explicit theme prop
    const resolvedThemeId = (() => {
      if (mode === 'light') {
        if (theme && theme in THEME_PRESETS && !THEME_PRESETS[theme].isDark) {
          return theme;
        }
        return DEFAULT_LIGHT_THEME_ID;
      } else if (mode === 'dark') {
        if (theme && theme in THEME_PRESETS && THEME_PRESETS[theme].isDark) {
          return theme;
        }
        return DEFAULT_DARK_THEME_ID;
      }
      return theme in THEME_PRESETS ? theme : DEFAULT_THEME_ID;
    })();

    // Color theme resolution
    const activeTheme: GlobeThemeColors = useMemo(
      () => ({
        ...(THEME_PRESETS[resolvedThemeId] || THEME_PRESETS[DEFAULT_THEME_ID]),
        ...customColors,
      }),
      [resolvedThemeId, customColors]
    );

    // Normalize highlighted state(s) array - empty if null or empty string
    const highlightedStatesList = useMemo(
      () =>
        Array.isArray(highlightState)
          ? highlightState.map((s) => s?.toLowerCase().trim()).filter(Boolean)
          : highlightState && typeof highlightState === 'string' && highlightState.trim()
          ? [highlightState.toLowerCase().trim()]
          : [],
      [highlightState]
    );

    // Dynamic render configuration ref: allows the 60fps canvas loop to read
    // latest props every frame without cancelling and restarting the RAF loop.
    const renderPropsRef = useRef({
      activeTheme,
      autoRotateSpeed,
      rotateDirection,
      showGraticule,
      showAtmosphere,
      showStars,
      showBackground,
      backgroundColor,
      showStateBorders,
      highlightedStatesList,
      highlightStateColor,
      onlyIndia,
      markers,
      selectedMarkerId,
      highlightCountry,
    });

    renderPropsRef.current = {
      activeTheme,
      autoRotateSpeed,
      rotateDirection,
      showGraticule,
      showAtmosphere,
      showStars,
      showBackground,
      backgroundColor,
      showStateBorders,
      highlightedStatesList,
      highlightStateColor,
      onlyIndia,
      markers,
      selectedMarkerId,
      highlightCountry,
    };

    // Globe transformation state: rotation is [longitude, latitude, roll]
    const rotationRef = useRef<[number, number, number]>([
      -initialCenter[0],
      -initialCenter[1],
      0,
    ]);
    const zoomRef = useRef<number>(initialZoom);
    const isAutoRotatingRef = useRef<boolean>(autoRotate);
    const hoveredMarkerRef = useRef<GlobeMarker | null>(null);
    const hoveredStateRef = useRef<string | null>(null);
    const hoveredStatePointRef = useRef<{ x: number; y: number } | null>(null);

    // Drag interaction tracking
    const isDraggingRef = useRef<boolean>(false);
    const lastMousePosRef = useRef<[number, number]>([0, 0]);
    const velocityRef = useRef<[number, number]>([0, 0]);
    const lastDragTimeRef = useRef<number>(0);

    // Multi-touch (pinch) tracking. Pointer Events already cover touch, so a
    // second concurrent pointer is all the signal we need — no touch listeners
    // and no browser-specific gesture events.
    const activePointersRef = useRef<Map<number, [number, number]>>(new Map());
    const pinchStartRef = useRef<{ distance: number; zoom: number } | null>(null);
    // Hover hit-testing is far too expensive to run per pointermove event —
    // devices emit those well above display refresh rate — so the latest
    // position is stashed here and resolved at most once per animation frame.
    const hoverPosRef = useRef<{ x: number; y: number } | null>(null);
    const hoverRafRef = useRef<number | null>(null);
    // Browsers still fire a click after a two-finger gesture. Without this the
    // end of a pinch would select whatever marker or state happens to be under
    // the fingers.
    const pinchEndedAtRef = useRef<number>(0);

    // Animation / Fly-To interpolation state
    const animationRef = useRef<{
      startTime: number;
      duration: number;
      startRot: [number, number, number];
      targetRot: [number, number, number];
      startZoom: number;
      targetZoom: number;
    } | null>(null);

    // Dimensions
    const [dimensions, setDimensions] = useState<{ w: number; h: number }>({
      w: typeof width === 'number' ? width : 600,
      h: typeof height === 'number' ? height : 600,
    });

    // Sync autoRotate prop
    useEffect(() => {
      isAutoRotatingRef.current = autoRotate;
    }, [autoRotate]);

    // Resize observer to keep canvas sized to container
    useEffect(() => {
      if (!containerRef.current) return;
      const obs = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width: w, height: h } = entry.contentRect;
          if (w > 0 && h > 0) {
            setDimensions({ w: Math.round(w), h: Math.round(h) });
          }
        }
      });
      obs.observe(containerRef.current);
      return () => obs.disconnect();
    }, []);

    // Expose imperative API
    useImperativeHandle(ref, () => ({
      flyTo: (lat: number, lng: number, targetZoomMultiplier?: number) => {
        const startRot = [...rotationRef.current] as [number, number, number];
        const targetRot: [number, number, number] = [-lng, -lat, 0];

        // Shortest rotational path for longitude
        let diffLng = (targetRot[0] - startRot[0]) % 360;
        if (diffLng > 180) diffLng -= 360;
        if (diffLng < -180) diffLng += 360;
        targetRot[0] = startRot[0] + diffLng;

        const currentZoom = zoomRef.current;
        const targetZ = targetZoomMultiplier ?? Math.max(currentZoom, 1.4);

        animationRef.current = {
          startTime: performance.now(),
          duration: 1200,
          startRot,
          targetRot,
          startZoom: currentZoom,
          targetZoom: targetZ,
        };
      },
      focusState: (stateName: string, targetZoomMultiplier?: number) => {
        const stateFeature = INDIA_FEATURE_BY_NAME.get(
          stateName.toLowerCase().trim()
        );
        if (stateFeature) {
          const [cLng, cLat] = geoCentroid(stateFeature);
          const startRot = [...rotationRef.current] as [number, number, number];
          const targetRot: [number, number, number] = [-cLng, -cLat, 0];

          let diffLng = (targetRot[0] - startRot[0]) % 360;
          if (diffLng > 180) diffLng -= 360;
          if (diffLng < -180) diffLng += 360;
          targetRot[0] = startRot[0] + diffLng;

          const currentZoom = zoomRef.current;
          const targetZ = targetZoomMultiplier ?? 2.1;

          animationRef.current = {
            startTime: performance.now(),
            duration: 1200,
            startRot,
            targetRot,
            startZoom: currentZoom,
            targetZoom: targetZ,
          };
        }
      },
      resetView: () => {
        const startRot = [...rotationRef.current] as [number, number, number];
        const targetRot: [number, number, number] = [
          -initialCenter[0],
          -initialCenter[1],
          0,
        ];
        let diffLng = (targetRot[0] - startRot[0]) % 360;
        if (diffLng > 180) diffLng -= 360;
        if (diffLng < -180) diffLng += 360;
        targetRot[0] = startRot[0] + diffLng;

        animationRef.current = {
          startTime: performance.now(),
          duration: 1000,
          startRot,
          targetRot,
          startZoom: zoomRef.current,
          targetZoom: initialZoom,
        };
      },
      toggleAutoRotate: () => {
        isAutoRotatingRef.current = !isAutoRotatingRef.current;
      },
      getIsAutoRotating: () => isAutoRotatingRef.current,
      getZoom: () => zoomRef.current,
      setZoom: (z: number) => {
        zoomRef.current = Math.min(maxZoom, Math.max(minZoom, z));
      },
      getRotation: () => [-rotationRef.current[0], -rotationRef.current[1]],
    }));

    // Main 60fps render loop
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      let animationFrameId: number | null = null;
      let lastTimestamp = performance.now();
      const graticuleGenerator = geoGraticule().step([15, 15]);
      const graticuleLines = graticuleGenerator();

      // Configured once and re-read every frame. d3-geo projections are mutable
      // and designed to be configured this way; recreating one per frame threw
      // away its internal caches 60 times a second. Only the values that change
      // are reset below.
      const projection: GeoProjection = geoOrthographic()
        .clipAngle(90)
        .precision(0.3);
      const path = geoPath(projection, ctx);

      // Text metrics for the primary pin's callout. The title and the
      // sub-heading never change for a given marker, so they are measured once
      // and reused; the cache is bounded by the number of markers ever shown.
      const TITLE_FONT = '700 10px "Plus Jakarta Sans", sans-serif';
      const SUB_FONT = '500 8.5px "Plus Jakarta Sans", sans-serif';
      const BADGE_FONT = '600 10px "Plus Jakarta Sans", sans-serif';
      const widthCache = new Map<string, number>();
      const measureStable = (text: string, font: string): number => {
        const key = `${font} ${text}`;
        const cached = widthCache.get(key);
        if (cached !== undefined) return cached;
        ctx.font = font;
        const width = ctx.measureText(text).width;
        widthCache.set(key, width);
        return width;
      };

      // The clock changes once a second, so it is re-measured on change rather
      // than every frame — and deliberately NOT stored in widthCache, which
      // would otherwise grow by an entry per second for as long as a pin stayed
      // on screen.
      let cachedTimeLine = '';
      let cachedTimeWidth = 0;
      const measureClock = (text: string): number => {
        if (text !== cachedTimeLine) {
          ctx.font = SUB_FONT;
          cachedTimeWidth = ctx.measureText(text).width;
          cachedTimeLine = text;
        }
        return cachedTimeWidth;
      };

      const render = (now: number) => {
        const deltaTime = (now - lastTimestamp) / 1000;
        lastTimestamp = now;

        const {
          activeTheme,
          autoRotateSpeed,
          rotateDirection,
          showGraticule,
          showAtmosphere,
          showStars,
          showBackground,
          backgroundColor,
          showStateBorders,
          highlightedStatesList,
          highlightStateColor,
          onlyIndia,
          markers,
          selectedMarkerId,
          highlightCountry,
        } = renderPropsRef.current;

        // Handle fly-to animation
        if (animationRef.current) {
          const anim = animationRef.current;
          const elapsed = now - anim.startTime;
          const progress = Math.min(1, elapsed / anim.duration);

          // Smooth cubic ease out
          const ease = 1 - Math.pow(1 - progress, 3);

          rotationRef.current = [
            anim.startRot[0] + (anim.targetRot[0] - anim.startRot[0]) * ease,
            anim.startRot[1] + (anim.targetRot[1] - anim.startRot[1]) * ease,
            0,
          ];
          zoomRef.current =
            anim.startZoom + (anim.targetZoom - anim.startZoom) * ease;

          if (progress >= 1) {
            animationRef.current = null;
          }
        } else {
          // Inertia damping after release
          if (!isDraggingRef.current) {
            if (
              Math.abs(velocityRef.current[0]) > 0.01 ||
              Math.abs(velocityRef.current[1]) > 0.01
            ) {
              rotationRef.current[0] += velocityRef.current[0];
              rotationRef.current[1] = Math.max(
                -85,
                Math.min(85, rotationRef.current[1] + velocityRef.current[1])
              );
              // Decay is scaled to elapsed time rather than applied per frame. A flat 0.93
              // per frame stops roughly twice as fast in wall-clock terms on a
              // 120Hz display as on a 60Hz one, so a flick travelled half as
              // far. Reference frame is 16ms, matching how the drag velocity
              // below is captured, and the same delta-scaling the auto-rotation
              // further down already uses.
              const inertiaDecay = Math.pow(0.93, deltaTime * 60);
              velocityRef.current[0] *= inertiaDecay;
              velocityRef.current[1] *= inertiaDecay;
            } else if (isAutoRotatingRef.current && autoRotateSpeed > 0) {
              // Smooth ambient rotation with configurable speed & direction
              const dirMult = rotateDirection === 'east-to-west' ? -1 : 1;
              rotationRef.current[0] += autoRotateSpeed * deltaTime * 10 * dirMult;
              if (rotationRef.current[0] > 360) rotationRef.current[0] -= 360;
              if (rotationRef.current[0] < -360) rotationRef.current[0] += 360;
            }
          }
        }

        const width = dimensions.w;
        const height = dimensions.h;
        if (width <= 0 || height <= 0) {
          animationFrameId = requestAnimationFrame(safeRender);
          return;
        }

        // Handle High-DPI screens
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const bufferW = Math.floor(width * dpr);
        const bufferH = Math.floor(height * dpr);

        if (canvas.width !== bufferW || canvas.height !== bufferH) {
          canvas.width = bufferW;
          canvas.height = bufferH;
        }

        ctx.save();
        ctx.scale(dpr, dpr);

        // Clear canvas with the space background. Switching the theme's own
        // background off substitutes a neutral white/black backdrop rather than
        // transparency, so the canvas keeps its opaque context and every frame
        // is fully painted — no clearRect, and no letterbox showing through.
        //
        // backgroundColor is applied HERE and nowhere else on purpose: painting
        // the wrapper as well recoloured the whole page and made the globe read
        // as recoloured with it.
        ctx.fillStyle = showBackground
          ? backgroundColor || activeTheme.background
          : neutralBackground(activeTheme.isDark);
        ctx.fillRect(0, 0, width, height);

        // Render cosmic starfield
        if (showStars) {
          ctx.save();
          for (const star of STATIC_STARS) {
            const sx = star.x * width;
            const sy = star.y * height;
            const alphaMod =
              star.alpha *
              (0.65 + 0.35 * Math.sin(now * star.twinkleSpeed + star.x * 25));
            // Polarity still predicts the backdrop even when the theme's own
            // background is off, since that falls back to white or black.
            ctx.fillStyle = activeTheme.isDark
              ? `rgba(255, 255, 255, ${alphaMod})`
              : `rgba(24, 24, 27, ${alphaMod * 0.35})`;
            ctx.beginPath();
            ctx.arc(sx, sy, star.r, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // Calculate projection — reconfigured, not rebuilt
        const radius = Math.min(width, height) * BASE_RADIUS_FACTOR * zoomRef.current;
        const cx = width / 2;
        const cy = height / 2;

        projection
          .scale(radius)
          .translate([cx, cy])
          .rotate(rotationRef.current);

        // 1. Atmosphere Outer Glow
        if (showAtmosphere) {
          const glowGrad = ctx.createRadialGradient(
            cx,
            cy,
            radius * 0.98,
            cx,
            cy,
            radius * 1.20
          );
          glowGrad.addColorStop(
            0,
            activeTheme.atmosphereOuter ||
              (activeTheme.isDark
                ? 'rgba(255, 255, 255, 0.40)'
                : 'rgba(56, 189, 248, 0.25)')
          );
          glowGrad.addColorStop(
            0.4,
            activeTheme.atmosphereInner ||
              (activeTheme.isDark
                ? 'rgba(255, 255, 255, 0.14)'
                : 'rgba(56, 189, 248, 0.08)')
          );
          glowGrad.addColorStop(1, 'transparent');

          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 1.20, 0, Math.PI * 2);
          ctx.fill();
        }

        // 2. Earth Sphere / Ocean Fill with 3D Spherical Gradient
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.clip();

        // 3D spherical depth shading for ocean
        const oceanGrad = ctx.createRadialGradient(
          cx - radius * 0.28,
          cy - radius * 0.28,
          radius * 0.08,
          cx,
          cy,
          radius
        );
        oceanGrad.addColorStop(0, activeTheme.ocean);
        oceanGrad.addColorStop(
          1,
          activeTheme.oceanBorder || (activeTheme.isDark ? '#000000' : '#a1a1aa')
        );

        ctx.fillStyle = oceanGrad;
        ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

        // 3. Graticule Lines (Latitude & Longitude grid)
        if (showGraticule) {
          ctx.beginPath();
          path(graticuleLines);
          ctx.strokeStyle = activeTheme.isDark
            ? 'rgba(255, 255, 255, 0.28)'
            : 'rgba(0, 0, 0, 0.22)';
          ctx.lineWidth = 0.85;
          ctx.stroke();

          // Highlight Equator
          const equator = {
            type: 'LineString',
            coordinates: Array.from({ length: 73 }, (_, i) => [
              -180 + i * 5,
              0,
            ]),
          };
          ctx.beginPath();
          path(equator as any);
          ctx.strokeStyle = activeTheme.isDark
            ? 'rgba(255, 255, 255, 0.65)'
            : 'rgba(0, 0, 0, 0.55)';
          ctx.lineWidth = 1.3;
          ctx.stroke();
        }

        // 4. Base Landmasses / Non-highlighted Countries (Rendered when onlyIndia is false)
        if (!onlyIndia) {
          ctx.beginPath();
          for (const country of OTHER_COUNTRIES) {
            path(country);
          }
          ctx.fillStyle = activeTheme.land;
          ctx.fill();

          // Understroke with land color to completely seal sub-pixel seam gaps with neighboring countries
          ctx.strokeStyle = activeTheme.land;
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Border outlines for other countries
          ctx.strokeStyle = activeTheme.landBorder;
          ctx.lineWidth = 0.55;
          ctx.stroke();
        }

        // 5. OFFICIAL INDIA MAP (Survey of India: J&K, Ladakh, Kerala, Maharashtra, etc.)
        ctx.save();

        // 5a. Base fill & seam seal for all Indian States & Union Territories
        ctx.beginPath();
        for (const stateFeature of INDIA_OFFICIAL_FEATURES) {
          path(stateFeature);
        }
        ctx.fillStyle = activeTheme.land;
        ctx.fill();

        // Understroke with land color to seal state polygon borders seamlessly
        ctx.strokeStyle = activeTheme.land;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // 5b. Internal State Boundaries (ONLY drawn when showStateBorders is enabled!)
        if (showStateBorders) {
          ctx.beginPath();
          path(indiaInternalBorders as any);
          ctx.strokeStyle = activeTheme.isDark
            ? 'rgba(255, 255, 255, 0.50)'
            : 'rgba(0, 0, 0, 0.40)';
          ctx.lineWidth = 0.95;
          ctx.stroke();
        }

        // 5c. National Boundary Perimeter of India (authoritative Survey of India outer border)
        ctx.beginPath();
        path(indiaOuterBoundary as any);
        ctx.strokeStyle = activeTheme.isDark
          ? 'rgba(255, 255, 255, 0.70)'
          : 'rgba(0, 0, 0, 0.70)';
        ctx.lineWidth = 1.25;
        ctx.stroke();

        // 5d. ON-REQUEST STATE HIGHLIGHT ONLY
        // Highlights strictly and exclusively the state(s) requested by the user
        if (highlightedStatesList.length > 0) {
          ctx.save();
          // Clip state highlight rendering inside India boundary to prevent blue glow/stroke spilling into water
          ctx.beginPath();
          path(indiaOuterBoundary as any);
          ctx.clip();

          for (const stateFeature of INDIA_OFFICIAL_FEATURES) {
            const stName = (stateFeature.properties?.st_nm || '').toLowerCase().trim();
            const isHighlighted = highlightedStatesList.includes(stName);

            if (isHighlighted) {
              const hFill =
                highlightStateColor ||
                activeTheme.highlightLand ||
                (activeTheme.isDark ? '#3b82f6' : '#1565c0');
              const hStroke =
                activeTheme.highlightLandBorder ||
                (activeTheme.isDark ? '#60a5fa' : '#0d47a1');

              // === INWARD GLOW TECHNIQUE ===
              // Clip to the state's OWN polygon so any shadow/stroke stays
              // strictly inside the state — zero bleed onto neighboring countries.
              ctx.save();
              ctx.beginPath();
              path(stateFeature);
              ctx.clip(); // shadow + stroke now confined to inside this state

              // Fill with shadow — radiates inward only (cannot cross the clip)
              ctx.shadowColor = activeTheme.highlightGlow;
              ctx.shadowBlur = 18;
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = 0;
              ctx.beginPath();
              path(stateFeature);
              ctx.fillStyle = hFill;
              ctx.fill();

              // Inside-stroke: clear shadow, draw at 2× lineWidth so only the
              // inner half is visible (outer half is clipped away)
              ctx.shadowColor = 'transparent';
              ctx.shadowBlur = 0;
              ctx.beginPath();
              path(stateFeature);
              ctx.strokeStyle = hStroke;
              ctx.lineWidth = 3.2;
              ctx.stroke();

              ctx.restore(); // release state clip
            }
          }
          ctx.restore();
        }

        // 5e. Hovered State Preview (gentle translucent outline when pointer is over a state)
        const hoveredSt = hoveredStateRef.current?.toLowerCase().trim();
        if (hoveredSt && !highlightedStatesList.includes(hoveredSt)) {
          const hoveredFeature = INDIA_FEATURE_BY_NAME.get(hoveredSt);
          if (hoveredFeature) {
            ctx.save();
            ctx.beginPath();
            path(hoveredFeature);
            ctx.fillStyle = activeTheme.isDark
              ? 'rgba(255, 255, 255, 0.18)'
              : 'rgba(0, 0, 0, 0.12)';
            ctx.fill();
            ctx.strokeStyle = activeTheme.isDark ? '#ffffff' : '#000000';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.restore();
          }
        }

        ctx.restore();

        // 6. Volumetric Sphere Shading (Terminator / Edge Shadow)
        const shadowGrad = ctx.createRadialGradient(
          cx - radius * 0.1,
          cy - radius * 0.1,
          radius * 0.75,
          cx,
          cy,
          radius
        );
        shadowGrad.addColorStop(0, 'transparent');
        shadowGrad.addColorStop(
          0.85,
          activeTheme.isDark
            ? 'rgba(0, 0, 0, 0.4)'
            : 'rgba(0, 0, 0, 0.08)'
        );
        shadowGrad.addColorStop(
          1,
          activeTheme.isDark
            ? 'rgba(0, 0, 0, 0.82)'
            : 'rgba(0, 0, 0, 0.22)'
        );

        ctx.fillStyle = shadowGrad;
        ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

        // 7. Subtle Rim Light (Atmospheric limb)
        if (showAtmosphere) {
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.strokeStyle = activeTheme.isDark
            ? 'rgba(255, 255, 255, 0.40)'
            : 'rgba(0, 0, 0, 0.22)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        ctx.restore(); // Restore sphere clipping

        // 8. Location Markers (Active Pin & Secondary Points)
        const currentRot = rotationRef.current;
        const centerCoord: [number, number] = [-currentRot[0], -currentRot[1]];

        for (const marker of markers) {
          // Angular distance test: point is visible on front hemisphere if distance < 90 deg (pi/2)
          const dist = geoDistance(centerCoord, [marker.lng, marker.lat]);
          const isFront = dist < Math.PI / 2;

          if (!isFront) continue;

          const projected = projection([marker.lng, marker.lat]);
          if (!projected) continue;

          const [mx, my] = projected;
          const isPrimary = (marker.isPrimary ?? false) || selectedMarkerId === marker.id;
          const isHovered = hoveredMarkerRef.current?.id === marker.id;
          const isSelected = selectedMarkerId === marker.id;

          ctx.save();

          const primaryPinColor = activeTheme.markerPrimary || (activeTheme.isDark ? '#ef4444' : '#dc2626');
          const secondaryPinColor = activeTheme.markerSecondary || (activeTheme.isDark ? '#38bdf8' : '#2563eb');
          const pulseColor = activeTheme.markerPulse || primaryPinColor;

          if (isPrimary) {
            // === PRIMARY 3D LOCATION PIN (Thrissur, Mumbai, Ulhasnagar, etc.) ===
            
            // 1. Radar Pulse Animation at ground level
            const pulsePhase = (now % 2400) / 2400;
            const pulseRadius = 8 + pulsePhase * 26;
            const pulseAlpha = (1 - pulsePhase) * 0.85;

            ctx.save();
            ctx.beginPath();
            ctx.arc(mx, my, pulseRadius, 0, Math.PI * 2);
            ctx.strokeStyle = pulseColor;
            ctx.globalAlpha = pulseAlpha;
            ctx.lineWidth = 1.6;
            ctx.stroke();

            const pulsePhase2 = ((now + 1200) % 2400) / 2400;
            const pulseRadius2 = 8 + pulsePhase2 * 26;
            const pulseAlpha2 = (1 - pulsePhase2) * 0.7;
            ctx.beginPath();
            ctx.arc(mx, my, pulseRadius2, 0, Math.PI * 2);
            ctx.strokeStyle = pulseColor;
            ctx.globalAlpha = pulseAlpha2;
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.restore();

            // 2. Ground Contact Target Rings at (mx, my)
            ctx.beginPath();
            ctx.arc(mx, my, 6.5, 0, Math.PI * 2);
            ctx.fillStyle = activeTheme.isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.95)';
            ctx.fill();
            ctx.strokeStyle = primaryPinColor;
            ctx.lineWidth = 2.2;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = primaryPinColor;
            ctx.fill();

            // 3. Stalk Line with Contrast Background Shadow Line
            const pinY = my - 30; // Center of pin head badge
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 3;

            // Background outline stalk stroke
            ctx.beginPath();
            ctx.moveTo(mx, my - 4);
            ctx.lineTo(mx, pinY + 8);
            ctx.strokeStyle = activeTheme.isDark ? '#000000' : '#ffffff';
            ctx.lineWidth = 3.6;
            ctx.stroke();

            // Foreground stalk line
            ctx.beginPath();
            ctx.moveTo(mx, my - 4);
            ctx.lineTo(mx, pinY + 8);
            ctx.strokeStyle = primaryPinColor;
            ctx.lineWidth = 2.0;
            ctx.stroke();

            // 4. Teardrop 3D Map Pin Badge at (mx, pinY)
            const pinR = 10.5;
            ctx.beginPath();
            ctx.arc(mx, pinY, pinR, Math.PI * 0.75, Math.PI * 0.25, true);
            ctx.lineTo(mx, my - 14);
            ctx.closePath();

            // Vibrant Pin Fill
            ctx.fillStyle = primaryPinColor;
            ctx.fill();

            // Solid 2.2px Outline for sharp visibility on any background
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.2;
            ctx.stroke();

            // Inner White Core Dot
            ctx.beginPath();
            ctx.arc(mx, pinY, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();

            // 5. High-Visibility Callout Label Card
            const labelX = mx + 16;
            const labelY = pinY;

            const title = marker.name.toUpperCase();
            const sub = `${marker.region || 'State'} · ${marker.country || 'India'}`;
            const timeLine = IST_TIME_FORMATTER.format(new Date());
            const boxWidth =
              Math.max(
                measureStable(title, TITLE_FONT),
                measureStable(sub, SUB_FONT),
                measureClock(timeLine)
              ) + 18;
            const boxHeight = 38;

            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 2;

            // Connecting leader line to label
            ctx.beginPath();
            ctx.moveTo(mx + pinR, pinY);
            ctx.lineTo(labelX, labelY);
            ctx.strokeStyle = primaryPinColor;
            ctx.lineWidth = 1.8;
            ctx.stroke();

            // Callout Box Background
            ctx.fillStyle = activeTheme.isDark
              ? 'rgba(9, 9, 11, 0.94)'
              : 'rgba(255, 255, 255, 0.98)';
            ctx.strokeStyle = activeTheme.isDark
              ? 'rgba(255, 255, 255, 0.35)'
              : 'rgba(0, 0, 0, 0.25)';
            ctx.lineWidth = 1.2;

            ctx.beginPath();
            ctx.rect(labelX, labelY - 14, boxWidth, boxHeight);
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // Text rendering
            ctx.fillStyle = activeTheme.isDark ? '#ffffff' : '#09090b';
            ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
            ctx.fillText(title, labelX + 9, labelY - 2);

            ctx.fillStyle = activeTheme.isDark ? '#a1a1aa' : '#52525b';
            ctx.font = '500 8.5px "Plus Jakarta Sans", sans-serif';
            ctx.fillText(sub, labelX + 9, labelY + 9);

            // Live local time (IST) — third line of the callout
            ctx.fillText(timeLine, labelX + 9, labelY + 20);
          } else {
            // === SECONDARY LOCATION MARKERS ===
            const markerR = isHovered || isSelected ? 6.5 : 5;

            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 2;

            // Outer Halo
            ctx.beginPath();
            ctx.arc(mx, my, markerR + 2.5, 0, Math.PI * 2);
            ctx.fillStyle = activeTheme.isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.9)';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.6;
            ctx.stroke();

            // Inner Core Dot
            ctx.beginPath();
            ctx.arc(mx, my, markerR - 0.5, 0, Math.PI * 2);
            ctx.fillStyle = secondaryPinColor;
            ctx.fill();
            ctx.restore();

            if (isHovered || isSelected) {
              ctx.save();
              ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
              ctx.shadowBlur = 6;
              ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
              ctx.fillStyle = activeTheme.isDark ? '#ffffff' : '#09090b';
              ctx.fillText(marker.name, mx + 10, my + 3);
              ctx.restore();
            }
          }

          ctx.restore();
        }

        // 9. Floating Hovered State Badge (e.g. Kerala, Jammu and Kashmir, Maharashtra)
        if (hoveredStateRef.current && hoveredStatePointRef.current) {
          const stateName = hoveredStateRef.current;
          const { x: hx, y: hy } = hoveredStatePointRef.current;

          ctx.save();
          const badgeText = `${stateName}, India`;
          // Stable for as long as the pointer stays on one state, so this goes
          // through the same metrics cache as the pin callout.
          const textW = measureStable(badgeText, BADGE_FONT);
          ctx.font = BADGE_FONT;
          const padX = 8;
          const bW = textW + padX * 2;
          const bH = 20;

          const bX = Math.min(width - bW - 10, Math.max(10, hx - bW / 2));
          const bY = Math.max(10, hy - 32);

          ctx.fillStyle = activeTheme.isDark
            ? 'rgba(0, 0, 0, 0.88)'
            : 'rgba(255, 255, 255, 0.95)';
          ctx.strokeStyle = activeTheme.isDark
            ? 'rgba(255, 255, 255, 0.4)'
            : 'rgba(0, 0, 0, 0.3)';
          ctx.lineWidth = 1;

          ctx.beginPath();
          ctx.rect(bX, bY, bW, bH);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = activeTheme.isDark ? '#ffffff' : '#09090b';
          ctx.fillText(badgeText, bX + padX, bY + 14);
          ctx.restore();
        }

        ctx.restore();
        animationFrameId = requestAnimationFrame(safeRender);
      };

    // A throw anywhere in `render` used to kill the frame chain outright: the
      // two `requestAnimationFrame` calls above are the only things that queue
      // the next frame, so one exception left the last painted pixels on screen
      // forever — no error surfaced, no retry, no recovery. `ErrorBoundary`
      // cannot help either, since this runs in a requestAnimationFrame callback,
      // outside React's rendering.
      //
      // The message is painted onto the canvas rather than only logged because in
      // an embed this iframe's console is invisible from the host page: a throw
      // here shows up in nobody's devtools except ours.
      let frameFailureReported = false;

      // Single exit point for the frame chain. Clearing the id to null is what
      // makes "is a frame pending?" answerable, which is what the visibility
      // handler and the unmount cleanup both need to decide.
      const stopRenderLoop = () => {
        if (animationFrameId === null) return;
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      };

      const paintRenderFailure = (err: unknown) => {
        if (frameFailureReported) return;
        frameFailureReported = true;
        console.error('EarthGlobe render loop halted:', err);
        try {
          const { activeTheme } = renderPropsRef.current;
          // setTransform drops any unbalanced save/scale left by the failed
          // frame, so the notice is drawn in buffer pixels at a known scale.
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.fillStyle = activeTheme.isDark ? '#000000' : '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = activeTheme.isDark ? '#ffffff' : '#09090b';
          ctx.font = '600 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            'The globe could not be drawn.',
            canvas.width / 2,
            canvas.height / 2,
          );
        } catch {
          // The context is unusable too; the console.error above is all we have.
        }
      };

      const safeRender = (now: number) => {
        try {
          render(now);
        } catch (err) {
          // Nothing reschedules after a throw, so the loop is already stopped;
          // this makes that explicit and covers the early-return path above.
          stopRenderLoop();
          paintRenderFailure(err);
        }
      };

      // A backgrounded tab still asks for frames: the browser throttles them but
      // never to zero, and this is the heaviest thing on the page. Pausing is
      // invisible to a host — a backgrounded iframe is not being looked at, and
      // the globe resumes in exactly the state it paused in.
      const onVisibilityChange = () => {
        if (document.hidden) {
          stopRenderLoop();
        } else if (animationFrameId === null && !frameFailureReported) {
          // Resetting the clock is the point of this branch. Without it the
          // first frame back reports a deltaTime measured in minutes, which
          // underflows pow(0.93, deltaTime * 60) and throws the rotation.
          lastTimestamp = performance.now();
          animationFrameId = requestAnimationFrame(safeRender);
        }
      };

      document.addEventListener('visibilitychange', onVisibilityChange);
      animationFrameId = requestAnimationFrame(safeRender);
      return () => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        stopRenderLoop();
      };
    }, [dimensions]);

    // Distance between the first two tracked pointers, or null when fewer than
    // two are down.
    const getPinchDistance = (): number | null => {
      const points = Array.from(activePointersRef.current.values());
      if (points.length < 2) return null;
      const [a, b] = points;
      return Math.hypot(b[0] - a[0], b[1] - a[1]);
    };

    // Pointer Drag Handlers
    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      activePointersRef.current.set(e.pointerId, [e.clientX, e.clientY]);

      // A second finger means pinch, not drag. Record the gesture's starting
      // distance and zoom so subsequent moves can scale relatively. When zoom
      // is disabled the extra finger is simply ignored rather than being
      // mistaken for a second drag.
      if (activePointersRef.current.size >= 2) {
        if (enableZoom) {
          const distance = getPinchDistance();
          if (distance && distance > 0) {
            pinchStartRef.current = { distance, zoom: zoomRef.current };
          }
        }
        // Stop the drag inertia fighting the pinch
        isDraggingRef.current = false;
        velocityRef.current = [0, 0];
        return;
      }

      if (!enableDrag) return;
      isDraggingRef.current = true;
      lastMousePosRef.current = [e.clientX, e.clientY];
      velocityRef.current = [0, 0];
      lastDragTimeRef.current = performance.now();
      animationRef.current = null; // Cancel any active fly-to animation

      // Capture pointer
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    /**
     * Hover hit-test for markers and Indian states.
     *
     * Runs at most once per animation frame rather than once per pointermove
     * event: this builds a projection, inverts it, and can point-in-polygon
     * test up to 37 full-resolution boundaries, while pointermove fires well
     * above the display's refresh rate. Bails while a drag is in progress, so a
     * pointer sweep cannot fire hover callbacks mid-spin.
     */
    const runHoverHitTest = (mouseX: number, mouseY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || isDraggingRef.current) return;

      const radius =
        Math.min(dimensions.w, dimensions.h) * BASE_RADIUS_FACTOR * zoomRef.current;
      const cx = dimensions.w / 2;
      const cy = dimensions.h / 2;

      // Deliberately a separate projection from the render loop's: the two run
      // on different cadences and must not share rotation state mid-frame.
      const hoverProjection: GeoProjection = geoOrthographic()
        .scale(radius)
        .translate([cx, cy])
        .rotate(rotationRef.current)
        .clipAngle(90);

      const currentRot = rotationRef.current;
      const centerCoord: [number, number] = [-currentRot[0], -currentRot[1]];

      let foundMarker: GlobeMarker | null = null;
      const currentMarkers = renderPropsRef.current.markers;

      for (const marker of currentMarkers) {
        const dist = geoDistance(centerCoord, [marker.lng, marker.lat]);
        if (dist >= Math.PI / 2) continue;

        const projected = hoverProjection([marker.lng, marker.lat]);
        if (!projected) continue;

        const [px, py] = projected;
        const hitRadius = marker.isPrimary ? 24 : 14;
        const dX = mouseX - px;
        const dY = mouseY - py;
        if (dX * dX + dY * dY < hitRadius * hitRadius) {
          foundMarker = marker;
          break;
        }
      }

      // Test if pointer is over any Indian state
      let detectedStateName: string | null = null;
      if (!foundMarker) {
        try {
          const invertedCoord = hoverProjection.invert?.([mouseX, mouseY]);
          if (
            invertedCoord &&
            !isNaN(invertedCoord[0]) &&
            !isNaN(invertedCoord[1])
          ) {
            const distToCenter = geoDistance(centerCoord, invertedCoord);
            if (distToCenter < Math.PI / 2) {
              for (const stateFeature of INDIA_OFFICIAL_FEATURES) {
                if (geoContains(stateFeature, invertedCoord)) {
                  detectedStateName = stateFeature.properties?.st_nm || null;
                  break;
                }
              }
            }
          }
        } catch {
          // Ignore projection inversion errors near singularities
        }
      }

      if (detectedStateName !== hoveredStateRef.current) {
        hoveredStateRef.current = detectedStateName;
        hoveredStatePointRef.current = detectedStateName
          ? { x: mouseX, y: mouseY }
          : null;
        onStateHover?.(detectedStateName);
      } else if (detectedStateName) {
        hoveredStatePointRef.current = { x: mouseX, y: mouseY };
      }

      if (foundMarker !== hoveredMarkerRef.current) {
        hoveredMarkerRef.current = foundMarker;
        onMarkerHover?.(foundMarker);
      }

      // `grabbing` was unreachable here: this only runs in the branch where
      // isDraggingRef is false.
      canvas.style.cursor =
        foundMarker || detectedStateName ? 'pointer' : 'grab';
    };

    const scheduleHoverHitTest = (mouseX: number, mouseY: number) => {
      hoverPosRef.current = { x: mouseX, y: mouseY };
      if (hoverRafRef.current !== null) return;
      hoverRafRef.current = requestAnimationFrame(() => {
        hoverRafRef.current = null;
        const pos = hoverPosRef.current;
        if (!pos) return;
        runHoverHitTest(pos.x, pos.y);
      });
    };

    // A queued hover hit-test must not outlive the component.
    useEffect(() => {
      return () => {
        if (hoverRafRef.current !== null) {
          cancelAnimationFrame(hoverRafRef.current);
        }
      };
    }, []);

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Pinch path runs before anything else — during a pinch the first finger
      // is also moving, and it must not be treated as a drag.
      if (activePointersRef.current.has(e.pointerId)) {
        activePointersRef.current.set(e.pointerId, [e.clientX, e.clientY]);
      }
      const pinchStart = pinchStartRef.current;
      if (pinchStart && activePointersRef.current.size >= 2) {
        const distance = getPinchDistance();
        if (distance && distance > 0) {
          const scale = distance / pinchStart.distance;
          zoomRef.current = Math.min(
            maxZoom,
            Math.max(minZoom, pinchStart.zoom * scale)
          );
        }
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (isDraggingRef.current) {
        const dx = e.clientX - lastMousePosRef.current[0];
        const dy = e.clientY - lastMousePosRef.current[1];
        lastMousePosRef.current = [e.clientX, e.clientY];

        const now = performance.now();
        const dt = Math.max(1, now - lastDragTimeRef.current);
        lastDragTimeRef.current = now;

        // Rotation sensitivity scaled by current radius / zoom
        const sensitivity = 0.28 / zoomRef.current;
        const dRotX = dx * sensitivity;
        const dRotY = -dy * sensitivity;

        rotationRef.current[0] += dRotX;
        // Clamp latitude rotation to avoid flipping upside down
        rotationRef.current[1] = Math.max(
          -85,
          Math.min(85, rotationRef.current[1] + dRotY)
        );

        // Store velocity for inertia
        velocityRef.current = [dRotX * (16 / dt), dRotY * (16 / dt)];
      } else {
        scheduleHoverHitTest(mouseX, mouseY);
      }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      activePointersRef.current.delete(e.pointerId);

      // Below two pointers the pinch gesture is over. Re-seed the remaining
      // finger as a fresh drag origin so lifting one finger mid-gesture does not
      // snap the globe when the other keeps moving.
      if (pinchStartRef.current) {
        pinchStartRef.current = null;
        pinchEndedAtRef.current = performance.now();
        isDraggingRef.current = false;
        const remaining = Array.from(activePointersRef.current.entries());
        if (remaining.length === 1) {
          lastMousePosRef.current = remaining[0][1];
          velocityRef.current = [0, 0];
          lastDragTimeRef.current = performance.now();
          if (enableDrag) isDraggingRef.current = true;
        }
        return;
      }

      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if already released
      }
    };

    const handleClick = () => {
      // Swallow the click the browser synthesises at the end of a pinch
      if (performance.now() - pinchEndedAtRef.current < 350) return;
      if (hoveredMarkerRef.current) {
        onMarkerClick?.(hoveredMarkerRef.current);
      } else if (hoveredStateRef.current) {
        onStateClick?.(hoveredStateRef.current);
        onCountryClick?.(hoveredStateRef.current, '356');
      }
    };

    // Wheel Zoom Handler — native + non-passive so preventDefault() actually
    // stops the browser from scrolling the page/host document under the map.
    // (React binds wheel listeners as passive, which silently ignores it.)
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !enableZoom) return;
      // Symmetric steps: 0.92 is not the reciprocal of 1.08, so the old pair lost
        // ~1.6% of zoom per scroll-in/scroll-out round trip and never returned
        // to where it started. Zooming out by 1/1.08 makes it exactly reversible.
        const ZOOM_STEP = 1.08;
        const onWheelNative = (e: WheelEvent) => {
          e.preventDefault();
          const zoomDelta = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
        zoomRef.current = Math.min(
          maxZoom,
          Math.max(minZoom, zoomRef.current * zoomDelta)
        );
      };
      canvas.addEventListener('wheel', onWheelNative, { passive: false });
      return () => canvas.removeEventListener('wheel', onWheelNative);
    }, [enableZoom, minZoom, maxZoom]);

    return (
      <div
        ref={containerRef}
        className={`relative w-full h-full select-none overflow-hidden touch-none ${className}`}
        style={{
          width: width || '100%',
          height: height || '100%',
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={handleClick}
          className="w-full h-full block cursor-grab active:cursor-grabbing"
        />
      </div>
    );
  }
);

EarthGlobe.displayName = 'EarthGlobe';
export default EarthGlobe;
