import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchLocation, resetNominatimBudget } from './geocoding';

const stubFetch = (impl: (url: string) => Promise<Response>) => {
  vi.stubGlobal('fetch', vi.fn(impl));
};

/** Minimal Nominatim-shaped payload. */
const osmItem = (over: Partial<Record<string, unknown>> = {}) => ({
  place_id: 1,
  lat: '19.0760',
  lon: '72.8777',
  display_name: 'Mumbai, Maharashtra, India',
  name: 'Mumbai',
  address: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
  ...over,
});

afterEach(() => {
  vi.unstubAllGlobals();
  // The ≤1 req/s budget and the 429 cooldown are module-level by design, so
  // they outlive a single test. Without this reset a test that simulates a
  // rate-limit response would silence every search after it.
  resetNominatimBudget();
});

describe('searchLocation', () => {
  it('returns nothing for an empty or single-character query', async () => {
    expect(await searchLocation('')).toEqual([]);
    expect(await searchLocation('   ')).toEqual([]);
    expect(await searchLocation('a')).toEqual([]);
  });

  it('calls Nominatim with the documented query shape', async () => {
    let seen = '';
    stubFetch(async (url) => {
      seen = url;
      return new Response(JSON.stringify([osmItem()]), { status: 200 });
    });

    await searchLocation('Ulhasnagar, MH');

    expect(seen).toContain('https://nominatim.openstreetmap.org/search?');
    expect(seen).toContain('format=json');
    expect(seen).toContain('addressdetails=1');
    expect(seen).toContain('limit=6');
    expect(seen).toContain(`q=${encodeURIComponent('Ulhasnagar, MH')}`);
  });

  it('matches built-in places without a successful response', async () => {
    stubFetch(async () => new Response('', { status: 500 }));

    const results = await searchLocation('Thrissur');

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.name === 'Thrissur')).toBe(true);
    expect(results.every((r) => r.marker.isPrimary)).toBe(true);
  });

  it('degrades to the offline list on a network error', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch');
    });

    const results = await searchLocation('Mumbai');

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.name === 'Mumbai')).toBe(true);
  });

  it('returns nothing when the request is aborted', async () => {
    stubFetch(async () => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      throw err;
    });

    expect(await searchLocation('Mumbai')).toEqual([]);
  });

  it('falls back to local matches on a non-OK status', async () => {
    stubFetch(async () => new Response('nope', { status: 429 }));

    const results = await searchLocation('Kochi');

    expect(results.some((r) => r.name === 'Kochi')).toBe(true);
  });

  // A 429 is the documented "slow down" response. Recording it means later
  // searches stop calling OSM entirely rather than retrying into the limit.
  it('stops calling Nominatim for a cooldown after a 429', async () => {
    const spy = vi.fn(async () => new Response('nope', { status: 429 }));
    vi.stubGlobal('fetch', spy);

    await searchLocation('Kochi');
    expect(spy).toHaveBeenCalledTimes(1);

    // Inside the cooldown window: no second request, but the curated table is
    // still returned so the search box keeps working.
    const results = await searchLocation('Thrissur');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(results.some((r) => r.name === 'Thrissur')).toBe(true);
  });

  it('falls back to local matches when the body is not an array', async () => {
    stubFetch(async () => new Response('{"error":"nope"}', { status: 200 }));

    const results = await searchLocation('Leh');

    expect(results.some((r) => r.name === 'Leh')).toBe(true);
  });

  it('maps Nominatim results onto markers', async () => {
    stubFetch(async () =>
      new Response(
        JSON.stringify([
          osmItem({
            address: { city: 'Nagpur', state: 'Maharashtra', country: 'India' },
          }),
        ]),
        { status: 200 }
      )
    );

    const [result] = await searchLocation('Nagpur');

    expect(result.name).toBe('Nagpur');
    expect(result.state).toBe('Maharashtra');
    expect(result.lat).toBeCloseTo(19.076);
    expect(result.lng).toBeCloseTo(72.8777);
    expect(result.marker.id).toMatch(/^geo-/);
    expect(result.marker.region).toBe('Maharashtra');
    expect(result.marker.description).toBe('Mumbai, Maharashtra, India');
  });

  it('copes with a result carrying no address detail', async () => {
    stubFetch(async () =>
      new Response(
        JSON.stringify([osmItem({ address: undefined, name: 'Somewhere' })]),
        { status: 200 }
      )
    );

    const [result] = await searchLocation('somewhere');

    expect(result.name).toBe('Somewhere');
    expect(result.country).toBe('India');
    expect(result.state).toBe('');
  });

  // geocoding.ts drops a built-in entry when a remote result already sits
  // within 0.05 degrees in both axes.
  it('suppresses a local match when a remote result covers the same point', async () => {
    stubFetch(async () =>
      new Response(
        JSON.stringify([
          osmItem({ address: { city: 'Mumbai', state: 'Maharashtra', country: 'India' } }),
        ]),
        { status: 200 }
      )
    );

    const results = await searchLocation('Mumbai');

    expect(results.filter((r) => r.name === 'Mumbai')).toHaveLength(1);
  });

  // The local entry must survive when the remote result is somewhere else
  // entirely — otherwise a broad query would lose the curated metadata.
  it('keeps the local match when the remote result is elsewhere', async () => {
    stubFetch(async () =>
      new Response(
        JSON.stringify([
          osmItem({
            lat: '21.1458',
            lon: '79.0882',
            name: 'Nagpur',
            address: { city: 'Nagpur', state: 'Maharashtra', country: 'India' },
          }),
        ]),
        { status: 200 }
      )
    );

    const results = await searchLocation('Mumbai');

    expect(results.filter((r) => r.name === 'Mumbai')).toHaveLength(1);
    expect(results.some((r) => r.name === 'Nagpur')).toBe(true);
  });

  it('passes the abort signal through to fetch', async () => {
    const controller = new AbortController();
    const spy = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.signal).toBe(controller.signal);
      return new Response('[]', { status: 200 });
    });
    vi.stubGlobal('fetch', spy);

    await searchLocation('Bengaluru', controller.signal);

    expect(spy).toHaveBeenCalled();
  });

  it('matches a local place by its state name', async () => {
    stubFetch(async () => new Response('[]', { status: 200 }));

    const results = await searchLocation('Ladakh');

    expect(results.some((r) => r.name === 'Leh')).toBe(true);
  });
});