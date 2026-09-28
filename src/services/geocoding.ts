import { GlobeMarker } from '../components/EarthGlobe/types';

export interface GeocodeResult {
  id: string;
  name: string;
  displayName: string;
  state?: string;
  country?: string;
  lat: number;
  lng: number;
  marker: GlobeMarker;
}

// Built-in instant locations for offline resilience and instant fuzzy search
const KNOWN_INDIAN_PLACES: Array<{
  name: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
  role?: string;
}> = [
  {
    name: 'Ulhasnagar',
    state: 'Maharashtra',
    country: 'India',
    lat: 19.2236,
    lng: 73.1672,
    role: 'Prominent City in Thane District, Maharashtra',
  },
  {
    name: 'Thrissur',
    state: 'Kerala',
    country: 'India',
    lat: 10.5276,
    lng: 76.2144,
    role: 'Cultural Capital of Kerala',
  },
  {
    name: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    lat: 19.076,
    lng: 72.8777,
    role: 'Financial Capital of India & Maharashtra Capital',
  },
  {
    name: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    lat: 18.5204,
    lng: 73.8567,
    role: 'Oxford of the East & Cultural Capital of Maharashtra',
  },
  {
    name: 'Nagpur',
    state: 'Maharashtra',
    country: 'India',
    lat: 21.1458,
    lng: 79.0882,
    role: 'Orange City & Winter Capital of Maharashtra',
  },
  {
    name: 'Nashik',
    state: 'Maharashtra',
    country: 'India',
    lat: 19.9975,
    lng: 73.7898,
    role: 'Wine Capital of India & Holy Pilgrimage Center',
  },
  {
    name: 'Thane',
    state: 'Maharashtra',
    country: 'India',
    lat: 19.2183,
    lng: 72.9781,
    role: 'City of Lakes, Maharashtra',
  },
  {
    name: 'Kalyan',
    state: 'Maharashtra',
    country: 'India',
    lat: 19.2403,
    lng: 73.1305,
    role: 'Major Railway & Commercial Junction, Maharashtra',
  },
  {
    name: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    lat: 12.9716,
    lng: 77.5946,
    role: 'Silicon Valley of India',
  },
  {
    name: 'Kochi',
    state: 'Kerala',
    country: 'India',
    lat: 9.9312,
    lng: 76.2673,
    role: 'Queen of the Arabian Sea',
  },
  {
    name: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    lat: 28.6139,
    lng: 77.209,
    role: 'National Capital of India',
  },
  {
    name: 'Srinagar',
    state: 'Jammu and Kashmir',
    country: 'India',
    lat: 34.0837,
    lng: 74.7973,
    role: 'Summer Capital of Jammu & Kashmir',
  },
  {
    name: 'Leh',
    state: 'Ladakh',
    country: 'India',
    lat: 34.1526,
    lng: 77.5771,
    role: 'Capital of Ladakh Territory',
  },
  {
    name: 'Ahmedabad',
    state: 'Gujarat',
    country: 'India',
    lat: 23.0225,
    lng: 72.5714,
    role: 'Commercial Capital of Gujarat & UNESCO World Heritage City',
  },
  {
    name: 'Jaipur',
    state: 'Rajasthan',
    country: 'India',
    lat: 26.9124,
    lng: 75.7873,
    role: 'The Pink City & Capital of Rajasthan',
  },
  {
    name: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    lat: 13.0827,
    lng: 80.2707,
    role: 'Detroit of India & Capital of Tamil Nadu',
  },
  {
    name: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    lat: 17.385,
    lng: 78.4867,
    role: 'City of Pearls & Cyberabad',
  },
  {
    name: 'Kolkata',
    state: 'West Bengal',
    country: 'India',
    lat: 22.5726,
    lng: 88.3639,
    role: 'City of Joy & Cultural Capital',
  },
];

/**
 * Searches for any location worldwide or in India by query (e.g. "Ulhasnagar, MH, India", "Thrissur", etc.)
 * Uses OpenStreetMap Nominatim with local instant fallback.
 */
export async function searchLocation(
  query: string,
  signal?: AbortSignal
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const lower = trimmed.toLowerCase();

  // 1. Instant local matches first
  const localMatches: GeocodeResult[] = [];
  for (const place of KNOWN_INDIAN_PLACES) {
    if (
      place.name.toLowerCase().includes(lower) ||
      place.state.toLowerCase().includes(lower) ||
      `${place.name}, ${place.state}`.toLowerCase().includes(lower) ||
      lower.includes(place.name.toLowerCase())
    ) {
      localMatches.push({
        id: `local-${place.name.toLowerCase()}`,
        name: place.name,
        displayName: `${place.name}, ${place.state}, ${place.country}`,
        state: place.state,
        country: place.country,
        lat: place.lat,
        lng: place.lng,
        marker: {
          id: `pin-${place.name.toLowerCase()}`,
          name: place.name,
          region: place.state,
          country: place.country,
          lat: place.lat,
          lng: place.lng,
          isPrimary: true,
          description: `${place.role || place.name} in ${place.state}, India.`,
          data: {
            state: place.state,
            country: place.country,
            role: place.role || 'Indian City',
            coordinatesFormatted: `${place.lat.toFixed(4)}° N, ${place.lng.toFixed(4)}° E`,
          },
        },
      });
    }
  }

  // 2. Fetch live geocoding results from Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(
      trimmed
    )}&limit=6`;

    const res = await fetch(url, {
      signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return localMatches;
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return localMatches;
    }

    const remoteResults: GeocodeResult[] = data.map((item: any) => {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      const address = item.address || {};
      const cityName =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.suburb ||
        item.name ||
        'Location';
      const stateName = address.state || address.region || address.province || '';
      const countryName = address.country || 'India';

      const marker: GlobeMarker = {
        id: `geo-${item.place_id || Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: cityName,
        region: stateName,
        country: countryName,
        lat,
        lng,
        isPrimary: true,
        description: item.display_name,
        data: {
          state: stateName,
          country: countryName,
          role: address.state_district ? `District: ${address.state_district}` : 'Searched Location',
          coordinatesFormatted: `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(
            lng
          ).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`,
        },
      };

      return {
        id: `osm-${item.place_id}`,
        name: cityName,
        displayName: item.display_name,
        state: stateName,
        country: countryName,
        lat,
        lng,
        marker,
      };
    });

    // Merge without exact duplicates
    const combined = [...remoteResults];
    for (const loc of localMatches) {
      if (!combined.some((c) => Math.abs(c.lat - loc.lat) < 0.05 && Math.abs(c.lng - loc.lng) < 0.05)) {
        combined.push(loc);
      }
    }

    return combined;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return [];
    }
    // Return local fallback on network errors
    return localMatches;
  }
}
