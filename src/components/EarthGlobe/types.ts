/**
 * Reusable Earth Globe TypeScript Definitions
 */

export interface GlobeMarker {
  id: string;
  name: string;
  region?: string;
  country?: string;
  lat: number;
  lng: number;
  description?: string;
  isPrimary?: boolean;
  color?: string;
  pulse?: boolean;
  data?: Record<string, string | number>;
}

export interface GlobeThemeColors {
  name: string;
  id: string;
  ocean: string;
  oceanBorder?: string;
  land: string;
  landBorder: string;
  highlightLand: string;
  highlightLandBorder: string;
  highlightGlow: string;
  atmosphereInner: string;
  atmosphereOuter: string;
  markerPrimary: string;
  markerSecondary: string;
  markerPulse: string;
  background: string;
  isDark: boolean;
}

export interface EarthGlobeProps {
  /** Width of the globe in pixels or responsive string (defaults to 100% of container) */
  width?: number | string;
  /** Height of the globe in pixels or responsive string (defaults to 100% of container) */
  height?: number | string;
  /** Primary country code to highlight (ISO 3166-1 numeric e.g. "356" for India, or country name "India") */
  highlightCountry?: string | number | (string | number)[];
  /** List of markers / pins to render on the globe */
  markers?: GlobeMarker[];
  /** The ID of the currently selected marker */
  selectedMarkerId?: string | null;
  /** Callback fired when a marker is clicked */
  onMarkerClick?: (marker: GlobeMarker) => void;
  /** Callback fired when a marker is hovered */
  onMarkerHover?: (marker: GlobeMarker | null) => void;
  /** Callback fired when country is clicked */
  onCountryClick?: (countryName: string, id: string | number) => void;
  /** Mode indicator ('dark' | 'light' | 'auto') for seamless dark/light mode switching in host apps */
  mode?: 'dark' | 'light' | 'auto';
  /** Current color theme */
  theme?: string;
  /** Custom colors overriding active theme */
  customColors?: Partial<GlobeThemeColors>;
  /** Whether auto-rotation is active */
  autoRotate?: boolean;
  /** Speed of auto rotation in degrees per second (default: 1.5) */
  autoRotateSpeed?: number;
  /** Enable mouse/touch drag to rotate (default: true) */
  enableDrag?: boolean;
  /** Enable mouse wheel zoom (default: true) */
  enableZoom?: boolean;
  /** Initial rotation [longitude, latitude] */
  initialCenter?: [number, number];
  /** Initial scale multiplier (default: 1) */
  initialZoom?: number;
  /** Min zoom scale multiplier (default: 0.6) */
  minZoom?: number;
  /** Max zoom scale multiplier (default: 3.5) */
  maxZoom?: number;
  /** Display graticule (lat/long grid) lines (default: true) */
  showGraticule?: boolean;
  /** Display atmospheric haze / glow effect (default: true) */
  showAtmosphere?: boolean;
  /** Display deep space star field (default: true) */
  showStars?: boolean;
  /** When true, renders ONLY the India map on the globe sphere, omitting all other world landmasses */
  onlyIndia?: boolean;
  /** Highlight a specific Indian state or array of states on request (default: null, no predefined highlight) */
  highlightState?: string | string[] | null;
  /** Custom highlight color for highlighted state(s) */
  highlightStateColor?: string;
  /** Whether to show Indian state borders (default: true) */
  showStateBorders?: boolean;
  /** Rotation direction ('east-to-west' | 'west-to-east', default: 'west-to-east') */
  rotateDirection?: 'east-to-west' | 'west-to-east';
  /** Callback fired when an Indian state is hovered */
  onStateHover?: (stateName: string | null) => void;
  /** Callback fired when an Indian state is clicked */
  onStateClick?: (stateName: string) => void;
  /** Additional CSS class names for the container */
  className?: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

/** Zoom bounds shared by the globe, the embed URL params and the generator slider */
export const MIN_ZOOM_LEVEL = 0.65;
export const MAX_ZOOM_LEVEL = 3.8;

/** Zoom level an embed starts at when no `zoomLevel` param is supplied */
export const DEFAULT_EMBED_ZOOM = 1.1;
