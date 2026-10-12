import { describe, it, expect } from 'vitest';
import { parseGlobeConfig } from './parseGlobeConfig';
import { resolveAppMarker, resolveEmbedMarker, isValidSavedMarker } from './resolveMarker';

const appUrls = (search: string) => parseGlobeConfig(search).urls;

describe('isValidSavedMarker', () => {
  it('accepts a well-formed marker', () => {
    expect(
      isValidSavedMarker({ id: 'a', name: 'Mumbai', lat: 19.076, lng: 72.8777 })
    ).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', 'mumbai'],
    ['no lat', { name: 'x', lng: 1 }],
    ['no lng', { name: 'x', lat: 1 }],
    ['non-finite lat', { name: 'x', lat: NaN, lng: 1 }],
    ['no name', { lat: 1, lng: 1 }],
    ['empty name', { name: '', lat: 1, lng: 1 }],
  ])('rejects %s', (_label, raw) => {
    expect(isValidSavedMarker(raw)).toBe(false);
  });
});

describe('resolveAppMarker — lat/lng pair', () => {
  it('builds a custom marker from an explicit pair', () => {
    const m = resolveAppMarker(appUrls('lat=19.0760&lng=72.8777'), null);
    expect(m?.lat).toBeCloseTo(19.076);
    expect(m?.lng).toBeCloseTo(72.8777);
    expect(m?.name).toBe('Selected Location');
    expect(m?.country).toBe('India');
    expect(m?.isPrimary).toBe(true);
  });

  it('applies name and region', () => {
    const m = resolveAppMarker(
      appUrls('lat=19.076&lng=72.8777&name=Mumbai&region=Maharashtra'),
      null
    );
    expect(m?.name).toBe('Mumbai');
    expect(m?.region).toBe('Maharashtra');
  });

  it('takes precedence over a saved selection', () => {
    const saved = { id: 's', name: 'Kochi', lat: 9.93, lng: 76.26 };
    const m = resolveAppMarker(appUrls('lat=1&lng=2'), saved);
    expect(m?.lat).toBe(1);
  });
});

describe('resolveAppMarker — id lookup', () => {
  it('resolves the three legacy short names', () => {
    expect(resolveAppMarker(appUrls('marker=mumbai'), null)?.id).toBe(
      'mumbai-maharashtra'
    );
    expect(resolveAppMarker(appUrls('marker=thrissur'), null)?.id).toBe(
      'thrissur-kerala'
    );
    expect(resolveAppMarker(appUrls('marker=ulhasnagar'), null)?.id).toBe(
      'ulhasnagar-maharashtra'
    );
  });

  it('resolves a curated id', () => {
    expect(resolveAppMarker(appUrls('marker=srinagar-jk'), null)?.name).toBe(
      'Srinagar'
    );
  });

  it('resolves by exact name', () => {
    expect(resolveAppMarker(appUrls('marker=Bengaluru'), null)?.id).toBe(
      'bengaluru-karnataka'
    );
  });

  // The third predicate is a substring match, not a prefix one.
  it('resolves by substring', () => {
    expect(resolveAppMarker(appUrls('marker=hri'), null)?.name).toBe('Thrissur');
    expect(resolveAppMarker(appUrls('marker=engal'), null)?.name).toBe('Bengaluru');
  });

  it('does not match a non-substring', () => {
    // 'thrissur' has no 'trin' in it; the substring must be contiguous.
    expect(resolveAppMarker(appUrls('marker=trin'), null)).toBeNull();
  });

  it('returns null for an unknown id', () => {
    expect(resolveAppMarker(appUrls('marker=atlantis'), null)).toBeNull();
  });

  // An explicit but unresolvable id must NOT silently resurrect the last pin.
  it('does not fall back to the saved selection when an id is given', () => {
    const saved = { id: 's', name: 'Kochi', lat: 9.93, lng: 76.26 };
    expect(resolveAppMarker(appUrls('marker=atlantis'), saved)).toBeNull();
  });
});

describe('resolveAppMarker — saved selection', () => {
  it('returns the saved marker when no id and no pair are given', () => {
    const saved = { id: 's', name: 'Kochi', lat: 9.93, lng: 76.26 };
    expect(resolveAppMarker(appUrls(''), saved)).toBe(saved);
  });

  it('returns null with nothing to fall back on', () => {
    expect(resolveAppMarker(appUrls(''), null)).toBeNull();
  });
});

describe('resolveEmbedMarker', () => {
  it('builds a custom marker from an explicit pair', () => {
    const m = resolveEmbedMarker(appUrls('lat=19.076&lng=72.8777'));
    expect(m?.name).toBe('Location');
    expect(m?.lat).toBeCloseTo(19.076);
  });

  // Documented in EMBED.md: there is no id table, so a bare id lands on the
  // centroid and is labelled with the id itself.
  it('drops a bare id at India centroid, labelled with the id', () => {
    const m = resolveEmbedMarker(appUrls('marker=srinagar-jk'));
    expect(m?.id).toBe('srinagar-jk');
    expect(m?.name).toBe('srinagar-jk');
    expect(m?.lat).toBeCloseTo(20.5937);
    expect(m?.lng).toBeCloseTo(78.9629);
  });

  it('uses name and region when supplied', () => {
    const m = resolveEmbedMarker(
      appUrls('marker=x&name=Mumbai&region=Maharashtra')
    );
    expect(m?.name).toBe('Mumbai');
    expect(m?.region).toBe('Maharashtra');
  });

  it('returns null when nothing is specified', () => {
    expect(resolveEmbedMarker(appUrls(''))).toBeNull();
  });

  it('ignores a half pair', () => {
    expect(resolveEmbedMarker(appUrls('lat=19.076'))).toBeNull();
  });
});