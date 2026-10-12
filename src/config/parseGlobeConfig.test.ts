import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  parseGlobeConfig,
  resolveThemeId,
  resolveBoundTheme,
  resolveBoolSetting,
  type SavedMapSettings,
} from './parseGlobeConfig';

const parse = (search: string, opts = {}) =>
  parseGlobeConfig(search, opts);

describe('resolveThemeId', () => {
  it('defaults to the light atlas palette', () => {
    expect(resolveThemeId(new URLSearchParams(''))).toBe('daylight-atlas');
  });

  it('honours a valid theme', () => {
    expect(resolveThemeId(new URLSearchParams('theme=cyber-emerald'))).toBe(
      'cyber-emerald'
    );
  });

  it('ignores an unknown theme id', () => {
    expect(resolveThemeId(new URLSearchParams('theme=does-not-exist'))).toBe(
      'daylight-atlas'
    );
  });

  // mode wins over theme, and a mismatched polarity is discarded rather than
  // honoured — a light palette inside a dark frame would be wrong.
  it('constrains theme to the requested polarity', () => {
    expect(
      resolveThemeId(new URLSearchParams('mode=dark&theme=paper-cartography'))
    ).toBe('black-and-white');
    expect(
      resolveThemeId(new URLSearchParams('mode=light&theme=cyber-emerald'))
    ).toBe('daylight-atlas');
  });

  it('accepts a theme that matches the requested polarity', () => {
    expect(
      resolveThemeId(new URLSearchParams('mode=dark&theme=cyber-emerald'))
    ).toBe('cyber-emerald');
    expect(
      resolveThemeId(new URLSearchParams('mode=light&theme=paper-cartography'))
    ).toBe('paper-cartography');
  });

  it('treats mode case-insensitively', () => {
    expect(resolveThemeId(new URLSearchParams('mode=DARK'))).toBe(
      'black-and-white'
    );
  });
});

describe('resolveBoundTheme', () => {
  const p = (s: string) => new URLSearchParams(s);

  it('prefers the URL parameter', () => {
    expect(
      resolveBoundTheme(p('lightTheme=azure-daylight'), 'lightTheme', 'nordic-frost', false, 'ceramic-pearl')
    ).toBe('azure-daylight');
  });

  it('falls back to the saved id', () => {
    expect(
      resolveBoundTheme(p(''), 'lightTheme', 'nordic-frost', false, 'ceramic-pearl')
    ).toBe('nordic-frost');
  });

  it('uses the active theme when it already fits the polarity', () => {
    expect(resolveBoundTheme(p(''), 'lightTheme', undefined, false, 'paper-cartography')).toBe(
      'paper-cartography'
    );
  });

  it('rejects a candidate of the wrong polarity and keeps walking', () => {
    // cyber-emerald is dark, so it cannot serve the light switcher; the chain
    // continues and lands on the light default.
    expect(resolveBoundTheme(p(''), 'lightTheme', 'cyber-emerald', false, 'cyber-emerald')).toBe(
      'daylight-atlas'
    );
  });

  it('rejects an unknown id without breaking the chain', () => {
    expect(resolveBoundTheme(p('lightTheme=nope'), 'lightTheme', 'nordic-frost', false, 'x')).toBe(
      'nordic-frost'
    );
  });

  it('lands on the polarity default when nothing fits', () => {
    expect(resolveBoundTheme(p(''), 'lightTheme', 'nope', false, 'nope')).toBe(
      'daylight-atlas'
    );
    expect(resolveBoundTheme(p(''), 'darkTheme', 'nope', true, 'nope')).toBe(
      'black-and-white'
    );
  });

  it('prefers URL over saved when both are valid', () => {
    expect(
      resolveBoundTheme(p('darkTheme=deep-sapphire'), 'darkTheme', 'silver-titanium', true, 'x')
    ).toBe('deep-sapphire');
  });
});

describe('resolveBoolSetting', () => {
  const p = (s: string) => new URLSearchParams(s);

  it('treats absence of the parameter as absent, not false', () => {
    expect(resolveBoolSetting(p(''), 'stars', undefined, true)).toBe(true);
  });

  it('reads the literal "false" as off', () => {
    expect(resolveBoolSetting(p('stars=false'), 'stars', true, true)).toBe(false);
  });

  it('treats any other value as on', () => {
    for (const v of ['true', '1', 'yes', 'on', '']) {
      expect(resolveBoolSetting(p(`stars=${v}`), 'stars', false, false)).toBe(true);
    }
  });

  it('honours a bare flag with no value', () => {
    expect(resolveBoolSetting(p('stars'), 'stars', false, false)).toBe(true);
  });

  it('falls back to a boolean saved value', () => {
    expect(resolveBoolSetting(p(''), 'stars', false, true)).toBe(false);
    expect(resolveBoolSetting(p(''), 'stars', true, false)).toBe(true);
  });

  it('falls back to the default when the saved value is not a boolean', () => {
    expect(resolveBoolSetting(p(''), 'stars', 'yes', true)).toBe(true);
    expect(resolveBoolSetting(p(''), 'stars', 0, false)).toBe(false);
  });
});

describe('parseGlobeConfig — defaults', () => {
  it('produces the documented defaults from an empty query', () => {
    const c = parse('');
    expect(c.theme).toBe('daylight-atlas');
    expect(c.lightTheme).toBe('daylight-atlas');
    expect(c.darkTheme).toBe('black-and-white');
    expect(c.onlyIndia).toBe(false);
    expect(c.autoRotate).toBe(true);
    expect(c.autoRotateSpeed).toBe(1.2);
    expect(c.rotateDirection).toBe('west-to-east');
    expect(c.showStateBorders).toBe(true);
    expect(c.showGraticule).toBe(true);
    expect(c.showAtmosphere).toBe(true);
    expect(c.showStars).toBe(true);
    expect(c.showBackground).toBe(true);
    expect(c.lightBackground).toBeNull();
    expect(c.darkBackground).toBeNull();
    expect(c.dragEnabled).toBe(true);
    expect(c.zoomEnabled).toBe(true);
    expect(c.width).toBe('100%');
    expect(c.height).toBe('100%');
    expect(c.highlightState).toBeNull();
    expect(c.isEmbedMode).toBe(false);
    expect(c.urls.hasLatLng).toBe(false);
  });

  it('defaults to a fixed 1.2 zoom without embed zoom controls', () => {
    expect(parse('zoomLevel=3.0').initialZoom).toBe(1.2);
  });
});

describe('parseGlobeConfig — embed mode flags', () => {
  it.each([
    'embed=true',
    'pure=true',
    'mode=embed',
  ])('detects %s', (q) => {
    expect(parse(q).isEmbedMode).toBe(true);
  });

  it('does not confuse mode=light with embed mode', () => {
    expect(parse('mode=light').isEmbedMode).toBe(false);
  });
});

describe('parseGlobeConfig — onlyIndia', () => {
  it('reads true from either spelling', () => {
    expect(parse('onlyIndia=true').onlyIndia).toBe(true);
    expect(parse('indiaOnly=true').onlyIndia).toBe(true);
  });

  it('reads an explicit false, and does not fall through to saved', () => {
    const c = parse('onlyIndia=false', { saved: { onlyIndia: true } });
    expect(c.onlyIndia).toBe(false);
  });

  it('falls back to the saved value when the parameter is absent', () => {
    expect(parse('', { saved: { onlyIndia: true } }).onlyIndia).toBe(true);
  });
});

describe('parseGlobeConfig — rotation speed', () => {
  it('parses the parameter', () => {
    expect(parse('speed=2.5').autoRotateSpeed).toBe(2.5);
  });

  it('falls back to 1.2 for unparseable input', () => {
    expect(parse('speed=abc').autoRotateSpeed).toBe(1.2);
  });

  it('is deliberately NOT clamped', () => {
    // Documented in README and EMBED.md: 0 stops rotation, and the slider's
    // own range is 0.0-4.0. Out-of-range values pass through.
    expect(parse('speed=99').autoRotateSpeed).toBe(99);
    expect(parse('speed=-3').autoRotateSpeed).toBe(-3);
    expect(parse('speed=0').autoRotateSpeed).toBe(0);
  });

  it('reads a finite saved speed when the parameter is absent', () => {
    expect(parse('', { saved: { autoRotateSpeed: 3 } }).autoRotateSpeed).toBe(3);
  });

  it('ignores a non-finite saved speed', () => {
    const saved = { autoRotateSpeed: NaN } as SavedMapSettings;
    expect(parse('', { saved }).autoRotateSpeed).toBe(1.2);
  });
});

describe('parseGlobeConfig — layers', () => {
  it.each(['borders', 'grid', 'atmosphere', 'stars'])(
    'turns %s off with =false',
    (key) => {
      const c = parse(`${key}=false`);
      const flags: Record<string, boolean> = {
        borders: c.showStateBorders,
        grid: c.showGraticule,
        atmosphere: c.showAtmosphere,
        stars: c.showStars,
      };
      expect(flags[key]).toBe(false);
    }
  );

  it('lets the URL override a saved layer value', () => {
    expect(parse('stars=true', { saved: { showStars: false } }).showStars).toBe(
      true
    );
    expect(parse('stars=false', { saved: { showStars: true } }).showStars).toBe(
      false
    );
  });
});

describe('parseGlobeConfig — backdrop', () => {
  it('treats the off keywords as visibility', () => {
    for (const v of ['false', 'none', 'transparent']) {
      expect(parse(`background=${v}`).showBackground).toBe(false);
    }
  });

  it('does not read a hex from the background parameter as a colour', () => {
    const c = parse('background=%23ffffff');
    expect(c.showBackground).toBe(true);
    expect(c.lightBackground).toBeNull();
  });

  it('normalises per-polarity colours', () => {
    const c = parse('lightBackground=%23ABC&darkBackground=0a0a0a');
    expect(c.lightBackground).toBe('#aabbcc');
    expect(c.darkBackground).toBe('#0a0a0a');
  });

  it('keeps the polarities independent', () => {
    expect(parse('darkBackground=0a0a0a').lightBackground).toBeNull();
    expect(parse('lightBackground=ffffff').darkBackground).toBeNull();
  });

  it('falls through to the saved colour when the URL value is invalid', () => {
    const c = parse('lightBackground=nonsense', {
      saved: { lightBackground: '#123456' },
    });
    expect(c.lightBackground).toBe('#123456');
  });
});

describe('parseGlobeConfig — interaction', () => {
  it('disables drag and zoom independently', () => {
    expect(parse('drag=false').dragEnabled).toBe(false);
    expect(parse('zoom=false').zoomEnabled).toBe(false);
    expect(parse('drag=false').zoomEnabled).toBe(true);
  });

  it('zoom=false is a master switch over the granular zoom paths', () => {
    const c = parse('zoom=false&zoomButtons=true&scrollZoom=true');
    expect(c.zoomEnabled).toBe(false);
    expect(c.zoomButtonsEnabled).toBe(false);
    expect(c.scrollZoomEnabled).toBe(false);
  });

  it('lets the granular switches disable one path each', () => {
    const c = parse('zoomButtons=false&scrollZoom=false');
    expect(c.zoomEnabled).toBe(true);
    expect(c.zoomButtonsEnabled).toBe(false);
    expect(c.scrollZoomEnabled).toBe(false);
  });
});

describe('parseGlobeConfig — embed zoom controls', () => {
  const embedParse = (search: string) =>
    parseGlobeConfig(search, { embedZoomControls: true });

  it('defaults to 1.1', () => {
    expect(embedParse('').initialZoom).toBe(1.1);
  });

  it('parses zoomLevel', () => {
    expect(embedParse('zoomLevel=2.0').initialZoom).toBe(2);
  });

  // Deliberately clamped, unlike speed.
  it('clamps to the shared bounds', () => {
    expect(embedParse('zoomLevel=99').initialZoom).toBe(3.8);
    expect(embedParse('zoomLevel=0.01').initialZoom).toBe(0.65);
  });

  it('falls back to the default for unparseable input', () => {
    expect(embedParse('zoomLevel=abc').initialZoom).toBe(1.1);
  });
});

describe('parseGlobeConfig — size', () => {
  it('reads width and height', () => {
    const c = parse('width=500px&height=600px');
    expect(c.width).toBe('500px');
    expect(c.height).toBe('600px');
  });

  it('size sets both', () => {
    const c = parse('size=500px');
    expect(c.width).toBe('500px');
    expect(c.height).toBe('500px');
  });

  it('lets width/height win over size', () => {
    const c = parse('size=500px&width=100%');
    expect(c.width).toBe('100%');
    expect(c.height).toBe('500px');
  });
});

describe('parseGlobeConfig — highlight and marker signals', () => {
  it('reads the state parameter', () => {
    expect(parse('state=Kerala').highlightState).toBe('Kerala');
  });

  it('prefers the URL over the saved highlight', () => {
    expect(
      parse('state=Goa', { savedHighlightState: 'Kerala' }).highlightState
    ).toBe('Goa');
  });

  it('falls back to the saved highlight', () => {
    expect(parse('', { savedHighlightState: 'Kerala' }).highlightState).toBe(
      'Kerala'
    );
  });

  it('parses a lat/lng pair', () => {
    const c = parse('lat=19.0760&lng=72.8777');
    expect(c.urls.hasLatLng).toBe(true);
    expect(c.urls.lat).toBeCloseTo(19.076);
    expect(c.urls.lng).toBeCloseTo(72.8777);
  });

  // lat and lng must be given as a pair; a lone one is inert.
  it('ignores a half pair', () => {
    expect(parse('lat=19.0760').urls.hasLatLng).toBe(false);
    expect(parse('lng=72.8777').urls.hasLatLng).toBe(false);
  });

  it('rejects a pair where one side is unparseable', () => {
    expect(parse('lat=abc&lng=72.8777').urls.hasLatLng).toBe(false);
  });

  it('passes marker signals through for the caller to resolve', () => {
    const c = parse('marker=mumbai&name=Mumbai&region=Maharashtra');
    expect(c.urls.markerId).toBe('mumbai');
    expect(c.urls.markerName).toBe('Mumbai');
    expect(c.urls.markerRegion).toBe('Maharashtra');
  });
});

describe('parseGlobeConfig — saved theme precedence', () => {
  it('uses the saved theme when the URL says nothing about the theme', () => {
    expect(parse('', { saved: { theme: 'cyber-emerald' } }).theme).toBe(
      'cyber-emerald'
    );
  });

  it('lets any URL theme instruction win over the saved one', () => {
    expect(
      parse('theme=golden-noir', { saved: { theme: 'cyber-emerald' } }).theme
    ).toBe('golden-noir');
    expect(
      parse('mode=dark', { saved: { theme: 'azure-daylight' } }).theme
    ).toBe('black-and-white');
    expect(
      parse('mode=light', { saved: { theme: 'golden-noir' } }).theme
    ).toBe('daylight-atlas');
  });

  it('ignores an unknown saved theme', () => {
    expect(parse('', { saved: { theme: 'gone' } }).theme).toBe(
      'daylight-atlas'
    );
  });

  it('derives the bound palettes from the resolved theme', () => {
    const c = parse('', { saved: { theme: 'cyber-emerald' } });
    expect(c.theme).toBe('cyber-emerald');
    // The active theme is dark, so it can only serve the dark switcher.
    expect(c.darkTheme).toBe('cyber-emerald');
    expect(c.lightTheme).toBe('daylight-atlas');
  });

  it('prefers saved bound palettes over the active theme', () => {
    const c = parse('', {
      saved: { theme: 'cyber-emerald', darkTheme: 'deep-sapphire' },
    });
    expect(c.darkTheme).toBe('deep-sapphire');
  });
});

describe('parseGlobeConfig — saved rotate direction', () => {
  it('reads a valid saved value', () => {
    expect(
      parse('', { saved: { rotateDirection: 'east-to-west' } }).rotateDirection
    ).toBe('east-to-west');
  });

  it('ignores an unrecognised saved value', () => {
    const saved = { rotateDirection: 'sideways' } as unknown as SavedMapSettings;
    expect(parse('', { saved }).rotateDirection).toBe('west-to-east');
  });
});
// `respectReducedMotion` is opt-in precisely so it cannot change the behaviour
// of an embed that predates it. These tests pin that: a host who never passes
// the param must get a rotating globe even on a device that asks for reduced
// motion, because that is the documented default.
describe('parseGlobeConfig - respectReducedMotion (opt-in)', () => {
  const withReducedMotion = (matches: boolean) => {
    vi.stubGlobal('window', {
      matchMedia: (query: string) => ({
        matches,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is off when the parameter is absent', () => {
    expect(parse('').respectReducedMotion).toBe(false);
  });

  it('leaves auto-rotation untouched when off, even with the OS preference set', () => {
    withReducedMotion(true);
    const c = parse('');
    expect(c.respectReducedMotion).toBe(false);
    expect(c.autoRotate).toBe(true);
  });

  it('reads an explicit =false as off', () => {
    withReducedMotion(true);
    const c = parse('respectReducedMotion=false');
    expect(c.respectReducedMotion).toBe(false);
    expect(c.autoRotate).toBe(true);
  });

  it('suppresses the rotation default when opted in and the OS asks', () => {
    withReducedMotion(true);
    const c = parse('respectReducedMotion=true');
    expect(c.respectReducedMotion).toBe(true);
    expect(c.autoRotate).toBe(false);
  });

  it('still rotates when opted in but no preference is expressed', () => {
    withReducedMotion(false);
    expect(parse('respectReducedMotion=true').autoRotate).toBe(true);
  });

  it('lets an explicit rotate=true win over the opt-in', () => {
    withReducedMotion(true);
    expect(parse('respectReducedMotion=true&rotate=true').autoRotate).toBe(true);
  });

  it('lets an explicit rotate=false win over the opt-in', () => {
    withReducedMotion(false);
    expect(parse('respectReducedMotion=true&rotate=false').autoRotate).toBe(false);
  });

  it('treats a missing matchMedia as no preference rather than throwing', () => {
    vi.stubGlobal('window', {});
    expect(parse('respectReducedMotion=true').autoRotate).toBe(true);
  });
});
