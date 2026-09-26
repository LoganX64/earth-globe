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
import { EarthGlobeProps, GlobeMarker, GlobeThemeColors } from './types';
import { THEME_PRESETS, DEFAULT_THEME_ID } from './themePresets';

export interface EarthGlobeRef {
  flyTo: (lat: number, lng: number, zoomMultiplier?: number) => void;
  focusState: (stateName: string, zoomMultiplier?: number) => void;
  resetView: () => void;
  toggleAutoRotate: () => void;
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
      theme = DEFAULT_THEME_ID,
      customColors,
      autoRotate = true,
      autoRotateSpeed = 1.2,
      enableDrag = true,
      enableZoom = true,
      initialCenter = [78.9629, 20.5937], // Centered on India [lng, lat]
      initialZoom = 1.0,
      minZoom = 0.65,
      maxZoom = 3.8,
      showGraticule = true,
      showAtmosphere = true,
      showStars = true,
      onlyIndia = false,
      className = '',
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Color theme resolution
    const activeTheme: GlobeThemeColors = {
      ...(THEME_PRESETS[theme] || THEME_PRESETS[DEFAULT_THEME_ID]),
      ...customColors,
    };

    // Normalize highlighted state(s) array - empty if null or empty string
    const highlightedStatesList = Array.isArray(highlightState)
      ? highlightState.map((s) => s?.toLowerCase().trim()).filter(Boolean)
      : highlightState && typeof highlightState === 'string' && highlightState.trim()
      ? [highlightState.toLowerCase().trim()]
      : [];

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
        const stateFeature = INDIA_OFFICIAL_FEATURES.find(
          (f) => f.properties?.st_nm?.toLowerCase() === stateName.toLowerCase()
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

      let animationFrameId: number;
      let lastTimestamp = performance.now();
      const graticuleGenerator = geoGraticule().step([15, 15]);
      const graticuleLines = graticuleGenerator();

      const render = (now: number) => {
        const deltaTime = (now - lastTimestamp) / 1000;
        lastTimestamp = now;

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
              velocityRef.current[0] *= 0.93;
              velocityRef.current[1] *= 0.93;
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
          animationFrameId = requestAnimationFrame(render);
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

        // Clear canvas with space background
        ctx.fillStyle = activeTheme.background;
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
            ctx.fillStyle = activeTheme.isDark
              ? `rgba(255, 255, 255, ${alphaMod})`
              : `rgba(24, 24, 27, ${alphaMod * 0.35})`;
            ctx.beginPath();
            ctx.arc(sx, sy, star.r, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // Calculate projection
        const radius = Math.min(width, height) * 0.42 * zoomRef.current;
        const cx = width / 2;
        const cy = height / 2;

        const projection: GeoProjection = geoOrthographic()
          .scale(radius)
          .translate([cx, cy])
          .rotate(rotationRef.current)
          .clipAngle(90)
          .precision(0.3);

        const path = geoPath(projection, ctx);

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
            activeTheme.isDark
              ? 'rgba(255, 255, 255, 0.40)'
              : 'rgba(0, 0, 0, 0.25)'
          );
          glowGrad.addColorStop(
            0.35,
            activeTheme.isDark
              ? 'rgba(255, 255, 255, 0.16)'
              : 'rgba(0, 0, 0, 0.09)'
          );
          glowGrad.addColorStop(
            0.7,
            activeTheme.isDark
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(0, 0, 0, 0.02)'
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
          activeTheme.isDark ? '#000000' : '#d4d4d8'
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
          ctx.strokeStyle = activeTheme.landBorder;
          ctx.lineWidth = 0.55;
          ctx.stroke();
        }

        // 5. OFFICIAL INDIA MAP (Survey of India: J&K, Ladakh, Kerala, Maharashtra, etc.)
        ctx.save();

        // 5a. Base fill for all Indian States & Union Territories (solid unified land color)
        ctx.beginPath();
        for (const stateFeature of INDIA_OFFICIAL_FEATURES) {
          path(stateFeature);
        }
        ctx.fillStyle = activeTheme.land;
        ctx.fill();

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
          for (const stateFeature of INDIA_OFFICIAL_FEATURES) {
            const stName = (stateFeature.properties?.st_nm || '').toLowerCase().trim();
            const isHighlighted = highlightedStatesList.includes(stName);

            if (isHighlighted) {
              ctx.save();
              ctx.shadowColor = activeTheme.highlightGlow;
              ctx.shadowBlur = 18;

              ctx.beginPath();
              path(stateFeature);

              // Distinct highlight fill for the requested state only
              ctx.fillStyle =
                highlightStateColor ||
                (activeTheme.isDark
                  ? '#ffffff'
                  : '#18181b');
              ctx.fill();

              ctx.strokeStyle = activeTheme.isDark ? '#000000' : '#ffffff';
              ctx.lineWidth = 1.8;
              ctx.stroke();

              // Subtle glowing rim
              ctx.strokeStyle = activeTheme.highlightGlow;
              ctx.lineWidth = 2.4;
              ctx.stroke();
              ctx.restore();
            }
          }
        }

        // 5e. Hovered State Preview (gentle translucent outline when pointer is over a state)
        const hoveredSt = hoveredStateRef.current?.toLowerCase().trim();
        if (hoveredSt && !highlightedStatesList.includes(hoveredSt)) {
          const hoveredFeature = INDIA_OFFICIAL_FEATURES.find(
            (f) => f.properties?.st_nm?.toLowerCase().trim() === hoveredSt
          );
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

          if (isPrimary) {
            // === Primary Location Beacon (e.g. Thrissur, Kerala or Mumbai, Maharashtra) ===
            // Radar pulse ring animation
            const pulsePhase = (now % 2400) / 2400; // 0 to 1 cycle
            const pulseRadius = 8 + pulsePhase * 24;
            const pulseAlpha = (1 - pulsePhase) * 0.85;

            // Outer radar ring
            ctx.beginPath();
            ctx.arc(mx, my, pulseRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${pulseAlpha})`;
            ctx.lineWidth = 1.4;
            ctx.stroke();

            // Second secondary pulse wave
            const pulsePhase2 = ((now + 1200) % 2400) / 2400;
            const pulseRadius2 = 8 + pulsePhase2 * 24;
            const pulseAlpha2 = (1 - pulsePhase2) * 0.7;
            ctx.beginPath();
            ctx.arc(mx, my, pulseRadius2, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${pulseAlpha2})`;
            ctx.lineWidth = 1.0;
            ctx.stroke();

            // Concentric target rings
            ctx.beginPath();
            ctx.arc(mx, my, 7, 0, Math.PI * 2);
            ctx.fillStyle = activeTheme.isDark
              ? 'rgba(0, 0, 0, 0.7)'
              : 'rgba(255, 255, 255, 0.8)';
            ctx.fill();
            ctx.strokeStyle = activeTheme.markerPrimary;
            ctx.lineWidth = 2.0;
            ctx.stroke();

            // Center glowing core dot
            ctx.beginPath();
            ctx.arc(mx, my, 3.2, 0, Math.PI * 2);
            ctx.fillStyle = activeTheme.markerPrimary;
            ctx.shadowColor = activeTheme.markerPulse;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;

            // Vertical beacon stalk & pinhead
            const stalkHeight = 28;
            ctx.beginPath();
            ctx.moveTo(mx, my - 7);
            ctx.lineTo(mx, my - stalkHeight);
            ctx.strokeStyle = activeTheme.markerPrimary;
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Pin diamond / circle at top of stalk
            ctx.beginPath();
            ctx.arc(mx, my - stalkHeight, 4, 0, Math.PI * 2);
            ctx.fillStyle = activeTheme.markerPrimary;
            ctx.fill();
            ctx.strokeStyle = activeTheme.isDark ? '#09090b' : '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Clean callout label for active location
            const labelX = mx + 12;
            const labelY = my - stalkHeight - 4;

            ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
            const title = marker.name.toUpperCase();
            const sub = `${marker.region || 'State'} · ${marker.country || 'India'}`;
            const titleWidth = ctx.measureText(title).width;
            ctx.font = '500 8.5px "Plus Jakarta Sans", sans-serif';
            const subWidth = ctx.measureText(sub).width;
            const boxWidth = Math.max(titleWidth, subWidth) + 16;
            const boxHeight = 28;

            // Callout background box
            ctx.fillStyle = activeTheme.isDark
              ? 'rgba(9, 9, 11, 0.88)'
              : 'rgba(255, 255, 255, 0.94)';
            ctx.strokeStyle = activeTheme.isDark
              ? 'rgba(255, 255, 255, 0.28)'
              : 'rgba(0, 0, 0, 0.2)';
            ctx.lineWidth = 1;

            ctx.beginPath();
            ctx.rect(labelX, labelY - 14, boxWidth, boxHeight);
            ctx.fill();
            ctx.stroke();

            // Callout connecting line
            ctx.beginPath();
            ctx.moveTo(mx + 4, my - stalkHeight);
            ctx.lineTo(labelX, my - stalkHeight);
            ctx.strokeStyle = activeTheme.markerPrimary;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Text rendering
            ctx.fillStyle = activeTheme.isDark ? '#ffffff' : '#09090b';
            ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
            ctx.fillText(title, labelX + 8, labelY - 2);

            ctx.fillStyle = activeTheme.isDark ? '#a1a1aa' : '#52525b';
            ctx.font = '500 8.5px "Plus Jakarta Sans", sans-serif';
            ctx.fillText(sub, labelX + 8, labelY + 9);
          } else {
            // Secondary Location Marker
            const markerR = isHovered || isSelected ? 5.5 : 4;

            ctx.beginPath();
            ctx.arc(mx, my, markerR + 3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(mx, my, markerR, 0, Math.PI * 2);
            ctx.fillStyle = activeTheme.markerSecondary;
            ctx.fill();
            ctx.strokeStyle = activeTheme.isDark ? '#000000' : '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            if (isHovered || isSelected) {
              ctx.font = '500 10px "Plus Jakarta Sans", sans-serif';
              ctx.fillStyle = activeTheme.isDark ? '#ffffff' : '#09090b';
              ctx.fillText(marker.name, mx + 8, my - 6);
            }
          }

          ctx.restore();
        }

        // 9. Floating Hovered State Badge (e.g. Kerala, Jammu and Kashmir, Maharashtra)
        if (hoveredStateRef.current && hoveredStatePointRef.current) {
          const stateName = hoveredStateRef.current;
          const { x: hx, y: hy } = hoveredStatePointRef.current;

          ctx.save();
          ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
          const badgeText = `${stateName}, India`;
          const textW = ctx.measureText(badgeText).width;
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
        animationFrameId = requestAnimationFrame(render);
      };

      animationFrameId = requestAnimationFrame(render);
      return () => cancelAnimationFrame(animationFrameId);
    }, [
      dimensions,
      activeTheme,
      autoRotateSpeed,
      rotateDirection,
      showGraticule,
      showAtmosphere,
      showStars,
      showStateBorders,
      highlightState,
      highlightStateColor,
      onlyIndia,
      markers,
      selectedMarkerId,
      highlightCountry,
    ]);

    // Pointer Drag Handlers
    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!enableDrag) return;
      isDraggingRef.current = true;
      lastMousePosRef.current = [e.clientX, e.clientY];
      velocityRef.current = [0, 0];
      lastDragTimeRef.current = performance.now();
      animationRef.current = null; // Cancel any active fly-to animation

      // Capture pointer
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

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
        // Hit-test markers and Indian states on hover
        const radius =
          Math.min(dimensions.w, dimensions.h) * 0.42 * zoomRef.current;
        const cx = dimensions.w / 2;
        const cy = dimensions.h / 2;

        const projection: GeoProjection = geoOrthographic()
          .scale(radius)
          .translate([cx, cy])
          .rotate(rotationRef.current)
          .clipAngle(90);

        const currentRot = rotationRef.current;
        const centerCoord: [number, number] = [-currentRot[0], -currentRot[1]];

        let foundMarker: GlobeMarker | null = null;

        for (const marker of markers) {
          const dist = geoDistance(centerCoord, [marker.lng, marker.lat]);
          if (dist >= Math.PI / 2) continue;

          const projected = projection([marker.lng, marker.lat]);
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
            const invertedCoord = projection.invert?.([mouseX, mouseY]);
            if (invertedCoord && !isNaN(invertedCoord[0]) && !isNaN(invertedCoord[1])) {
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

        canvas.style.cursor =
          foundMarker || detectedStateName
            ? 'pointer'
            : isDraggingRef.current
            ? 'grabbing'
            : 'grab';
      }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if already released
      }
    };

    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
      const onWheelNative = (e: WheelEvent) => {
        e.preventDefault();
        const zoomDelta = e.deltaY < 0 ? 1.08 : 0.92;
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
        className={`relative w-full h-full select-none overflow-hidden ${className}`}
        style={{
          width: width || '100%',
          height: height || '100%',
          touchAction: 'none',
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
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    );
  }
);

EarthGlobe.displayName = 'EarthGlobe';
export default EarthGlobe;
