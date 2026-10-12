/**
 * Marker resolution from URL signals.
 *
 * Kept out of `parseGlobeConfig` on purpose: the two entrypoints resolve a
 * `marker` id differently, and that is a semantic difference rather than a
 * vocabulary one. The app has a table of curated Indian cities to look the id
 * up in; the embed has no such table, so it drops a pin at India's centroid.
 * Both are pure functions over the signals the parser returns.
 */

import { GlobeMarker } from '../components/EarthGlobe/types';
import {
  ULHASNAGAR_MARKER,
  THRISSUR_MARKER,
  MUMBAI_MARKER,
  POPULAR_INDIAN_LOCATIONS,
} from '../data/defaultLocations';
import type { GlobeConfig } from './parseGlobeConfig';

/** India's centroid, the fallback the embed drops a pin at. */
export const INDIA_CENTROID: [number, number] = [78.9629, 20.5937];

/** Shape persisted under `bharat-atlas-active-location`. */
export const isValidSavedMarker = (raw: unknown): raw is GlobeMarker => {
  if (!raw || typeof raw !== 'object') return false;
  const m = raw as Partial<GlobeMarker>;
  return (
    typeof m.lat === 'number' &&
    Number.isFinite(m.lat) &&
    typeof m.lng === 'number' &&
    Number.isFinite(m.lng) &&
    typeof m.name === 'string' &&
    m.name.length > 0
  );
};

/**
 * Build a marker from an explicit lat/lng pair.
 *
 * The id fallback and the name fallback are configured separately because the
 * two entrypoints differ on both: the app prefixes ids with `url-marker` and
 * rounds coordinates to 4dp, while the embed prefixes with `embed-marker` and
 * keeps full precision. Neither is worth changing for its own sake — these ids
 * end up in generated embed URLs.
 */
const customMarker = (
  urls: GlobeConfig['urls'],
  idFallback: (lat: number, lng: number) => string,
  defaultName: string
): GlobeMarker => ({
  id: urls.markerId || idFallback(urls.lat!, urls.lng!),
  name: urls.markerName || defaultName,
  lat: urls.lat!,
  lng: urls.lng!,
  region: urls.markerRegion || undefined,
  country: 'India',
  isPrimary: true,
});

/**
 * Main app: an explicit lat/lng pair always wins. Otherwise a `marker` id is
 * resolved against the curated table, and with no id at all the last selection
 * from the previous session comes back.
 */
export const resolveAppMarker = (
  urls: GlobeConfig['urls'],
  savedMarker: GlobeMarker | null
): GlobeMarker | null => {
  if (urls.hasLatLng)
    return customMarker(
      urls,
      (lat, lng) => `url-marker-${lat.toFixed(4)}-${lng.toFixed(4)}`,
      'Selected Location'
    );

  const markerParam = urls.markerId;
  if (!markerParam) return savedMarker;

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

/**
 * Embed: an explicit lat/lng pair wins. A bare `marker` id has no table to
 * resolve against, so it drops a pin at India's centroid labelled with that
 * id — which is what EMBED.md documents. There is no saved selection.
 */
export const resolveEmbedMarker = (
  urls: GlobeConfig['urls']
): GlobeMarker | null => {
  if (urls.hasLatLng)
    return customMarker(
      urls,
      (lat, lng) => `embed-marker-${lat}-${lng}`,
      'Location'
    );

  const markerParam = urls.markerId;
  if (!markerParam) return null;

  return {
    id: markerParam,
    name: urls.markerName || markerParam,
    region: urls.markerRegion || undefined,
    country: 'India',
    lat: INDIA_CENTROID[1],
    lng: INDIA_CENTROID[0],
    isPrimary: true,
  };
};