/**
 * Coordinate formatting shared by every place that displays a location.
 *
 * The hardcoded `° N` / `° E` suffixes this replaces were correct for India and
 * wrong everywhere else: a pin at -33.8688° rendered as "33.8688° N", and a
 * pin at -122° rendered as "122.0000° E". Three separate call sites had the
 * same defect while a fourth (the Nominatim result mapper in geocoding.ts)
 * already derived the hemisphere correctly — so the inconsistency was live.
 */

const formatDegrees = (value: number, positive: string, negative: string): string =>
  `${Math.abs(value).toFixed(4)}° ${value >= 0 ? positive : negative}`;

export const formatLat = (lat: number): string => formatDegrees(lat, 'N', 'S');

export const formatLng = (lng: number): string => formatDegrees(lng, 'E', 'W');

/** "19.0760° N, 72.8777° E" */
export const formatLatLng = (lat: number, lng: number): string =>
  `${formatLat(lat)}, ${formatLng(lng)}`;