import { describe, it, expect } from 'vitest';
import {
  buildEmbedUrl,
  buildIframeSnippet,
  resolveEmbedTheme,
  embedDimensions,
  iframeBackgroundFor,
  type EmbedUrlOptions,
} from './buildEmbedUrl';
import { parseGlobeConfig } from './parseGlobeConfig';
import { resolveEmbedMarker } from './resolveMarker';
import { THEME_PRESETS } from '../components/EarthGlobe/themePresets';
import { GlobeMarker } from '../components/EarthGlobe/types';

const DARK_THEME_IDS = new Set(
  Object.values(THEME_PRESETS)
    .filter((t) => t.isDark)
    .map((t) => t.id)
);

const HOST = 'https://earth-globe-nine.vercel.app';

const defaults: EmbedUrlOptions = {
  host: HOST,
  embedMode: 'light',
  theme: 'daylight-atlas',
  lightTheme: 'daylight-atlas',
  darkTheme: 'black-and-white',
  onlyIndia: false,
  autoRotateSpeed: 1.2,
  drag: true,
  zoom: true,
  zoomButtons: true,
  scrollZoom: true,
  zoomLevel: 1.1,
  rotate: true,
  stars: true,
  grid: true,
  borders: true,
  atmosphere: true,
  size: '500',
  showBackground: true,
  lightBackground: null,
  darkBackground: null,
  marker: null,
  highlightState: null,
};

/** Parse a generated URL back the way the embed entrypoint would. */
const roundTrip = (opts: Partial<EmbedUrlOptions> = {}) => {
  const merged = { ...defaults, ...opts };
  const url = buildEmbedUrl(merged);
  return {
    url,
    opts: merged,
    parsed: parseGlobeConfig(new URL(url).search, {
      embedZoomControls: true,
    }),
  };
};

const mumbai: GlobeMarker = {
  id: 'mumbai-maharashtra',
  name: 'Mumbai',
  region: 'Maharashtra',
  country: 'India',
  lat: 19.076,
  lng: 72.8777,
};

describe('buildEmbedUrl â€” shape', () => {
  it('targets embed.html on the supplied host', () => {
    expect(roundTrip().url.startsWith(`${HOST}/embed.html?`)).toBe(true);
  });

  it('always marks the URL as an embed', () => {
    expect(roundTrip().parsed.isEmbedMode).toBe(true);
  });
});

describe('buildEmbedUrl â€” round trip', () => {
  // This is the whole point of extracting the builder: the emitter and the
  // parser are the two halves of one vocabulary, so a disagreement between
  // them produces a silently broken embed with nothing to catch it.
  it('preserves the theme and mode', () => {
    const { parsed, opts } = roundTrip({ embedMode: 'dark', theme: 'cyber-emerald', darkTheme: 'cyber-emerald' });
    expect(parsed.theme).toBe('cyber-emerald');
    expect(parsed.theme).toBe(opts.darkTheme);
  });

  it('never emits a theme that contradicts the mode', () => {
    // A light theme with mode=dark would be discarded by the reader.
    const dark = roundTrip({ embedMode: 'dark', theme: 'daylight-atlas' });
    expect(dark.parsed.theme).toBe(dark.opts.darkTheme);

    const light = roundTrip({ embedMode: 'light', theme: 'cyber-emerald' });
    expect(light.parsed.theme).toBe(light.opts.lightTheme);
  });

  it('preserves onlyIndia', () => {
    expect(roundTrip({ onlyIndia: true }).parsed.onlyIndia).toBe(true);
    expect(roundTrip({ onlyIndia: false }).parsed.onlyIndia).toBe(false);
  });

  it('preserves rotation speed, including when it is the default', () => {
    expect(roundTrip({ autoRotateSpeed: 2.5 }).parsed.autoRotateSpeed).toBe(2.5);
    // Omitted when it equals the default, and the reader defaults identically.
    expect(roundTrip({ autoRotateSpeed: 1.2 }).url).not.toContain('speed=');
    expect(roundTrip({ autoRotateSpeed: 1.2 }).parsed.autoRotateSpeed).toBe(1.2);
  });

  it('preserves zero speed, which stops rotation', () => {
    expect(roundTrip({ autoRotateSpeed: 0 }).parsed.autoRotateSpeed).toBe(0);
  });

  it('preserves the auto-rotate flag', () => {
    expect(roundTrip({ rotate: false }).parsed.autoRotate).toBe(false);
    expect(roundTrip({ rotate: true }).parsed.autoRotate).toBe(true);
  });

  it('preserves drag', () => {
    expect(roundTrip({ drag: false }).parsed.dragEnabled).toBe(false);
  });

  it('preserves all four layer flags', () => {
    const { parsed } = roundTrip({
      stars: false,
      grid: false,
      borders: false,
      atmosphere: false,
    });
    expect(parsed.showStars).toBe(false);
    expect(parsed.showGraticule).toBe(false);
    expect(parsed.showStateBorders).toBe(false);
    expect(parsed.showAtmosphere).toBe(false);
  });

  it('preserves the zoom controls', () => {
    const off = roundTrip({ zoom: false });
    expect(off.parsed.zoomEnabled).toBe(false);
    expect(off.parsed.zoomButtonsEnabled).toBe(false);
    expect(off.parsed.scrollZoomEnabled).toBe(false);

    const granular = roundTrip({ zoomButtons: false, scrollZoom: false });
    expect(granular.parsed.zoomEnabled).toBe(true);
    expect(granular.parsed.zoomButtonsEnabled).toBe(false);
    expect(granular.parsed.scrollZoomEnabled).toBe(false);
  });

  it('preserves the zoom level', () => {
    expect(roundTrip({ zoomLevel: 2 }).parsed.initialZoom).toBe(2);
    expect(roundTrip({ zoomLevel: 3.5 }).parsed.initialZoom).toBeCloseTo(3.5, 1);
  });

  it('preserves dimensions', () => {
    const fixed = roundTrip({ size: '500' });
    expect(fixed.parsed.width).toBe('500px');
    expect(fixed.parsed.height).toBe('500px');

    const responsive = roundTrip({ size: '100%' });
    expect(responsive.parsed.width).toBe('100%');
    expect(responsive.parsed.height).toBe('600px');
  });

  it('preserves the background visibility switch', () => {
    expect(roundTrip({ showBackground: false }).parsed.showBackground).toBe(false);
    expect(roundTrip({ showBackground: true }).parsed.showBackground).toBe(true);
  });

  it('emits only the colour matching the pinned mode', () => {
    // The embed pins one polarity, so the other slot could never apply unless
    // a host later drove it with setTheme.
    const light = roundTrip({ embedMode: 'light', lightBackground: '#ffffff', darkBackground: '#000000' });
    expect(light.url).toContain('lightBackground=%23ffffff');
    expect(light.url).not.toContain('darkBackground');
    expect(light.parsed.lightBackground).toBe('#ffffff');
    expect(light.parsed.darkBackground).toBeNull();

    const dark = roundTrip({ embedMode: 'dark', lightBackground: '#ffffff', darkBackground: '#000000' });
    expect(dark.url).toContain('darkBackground=%23000000');
    expect(dark.url).not.toContain('lightBackground');
    expect(dark.parsed.darkBackground).toBe('#000000');
  });

  it('lets the visibility switch win over a custom colour', () => {
    const off = roundTrip({ showBackground: false, lightBackground: '#123456', embedMode: 'light' });
    expect(off.url).toContain('background=false');
    expect(off.parsed.lightBackground).toBeNull();
  });

  it('preserves the highlighted state', () => {
    const { parsed } = roundTrip({ highlightState: 'Maharashtra' });
    expect(parsed.highlightState).toBe('Maharashtra');
  });

  it('preserves a marker and its coordinates', () => {
    const { parsed } = roundTrip({ marker: mumbai });
    const marker = resolveEmbedMarker(parsed.urls);
    expect(marker?.id).toBe('mumbai-maharashtra');
    expect(marker?.name).toBe('Mumbai');
    expect(marker?.region).toBe('Maharashtra');
    expect(marker?.lat).toBeCloseTo(19.076, 4);
    expect(marker?.lng).toBeCloseTo(72.8777, 4);
  });

  it('omits the marker when there is none', () => {
    const { parsed } = roundTrip();
    expect(parsed.urls.markerId).toBeNull();
    expect(resolveEmbedMarker(parsed.urls)).toBeNull();
  });

  it('survives a state name needing encoding', () => {
    const { parsed } = roundTrip({ highlightState: 'Jammu & Kashmir' });
    expect(parsed.highlightState).toBe('Jammu & Kashmir');
  });

  it('emits a parseable URL for every combination of the toggles', () => {
    const bits = [true, false];
    let checked = 0;
    for (const onlyIndia of bits)
      for (const drag of bits)
        for (const zoom of bits)
          for (const rotate of bits)
            for (const showBackground of bits)
              for (const mode of ['light', 'dark'] as const) {
                const { url, parsed } = roundTrip({
                  onlyIndia,
                  drag,
                  zoom,
                  rotate,
                  showBackground,
                  embedMode: mode,
                });
                expect(() => new URL(url)).not.toThrow();
                expect(parsed.isEmbedMode).toBe(true);
                expect(DARK_THEME_IDS.has(parsed.theme)).toBe(mode === 'dark');
                checked++;
              }
    expect(checked).toBe(64);
  });
});

// Golden test. Embed URLs generated by earlier builds are already pasted into
// live sites, so this function's output format is a compatibility surface, not
// an implementation detail: reordering or reformatting parameters would change
// every future snippet without breaking the round trip the other tests check.
describe('buildEmbedUrl â€” output format is stable', () => {
  it('emits the documented parameter order for a default light embed', () => {
    expect(buildEmbedUrl(defaults)).toBe(
      `${HOST}/embed.html?embed=true` +
        '&mode=light' +
        '&theme=daylight-atlas' +
        '&lightTheme=daylight-atlas' +
        '&darkTheme=black-and-white' +
        '&drag=true' +
        '&zoom=true' +
        '&zoomButtons=true' +
        '&scrollZoom=true' +
        '&zoomLevel=1.10' +
        '&rotate=true' +
        '&stars=true' +
        '&grid=true' +
        '&borders=true' +
        '&atmosphere=true' +
        '&width=500px' +
        '&height=500px'
    );
  });

  it('places optional params in the documented order', () => {
    const url = buildEmbedUrl({
      ...defaults,
      embedMode: 'dark',
      theme: 'cyber-emerald',
      darkTheme: 'cyber-emerald',
      onlyIndia: true,
      autoRotateSpeed: 2.5,
      showBackground: false,
      highlightState: 'Kerala',
    });
    const order = [...url.matchAll(/[?&]([a-zA-Z]+)=/g)].map((m) => m[1]);
    expect(order).toEqual([
      'embed', 'mode', 'theme', 'lightTheme', 'darkTheme',
      'onlyIndia', 'speed', 'drag', 'zoom', 'zoomButtons', 'scrollZoom',
      'zoomLevel', 'rotate', 'stars', 'grid', 'borders', 'atmosphere',
      'width', 'height', 'background', 'state',
    ]);
  });

  it('always ends with width and height before the optional tail', () => {
    const url = buildEmbedUrl({ ...defaults, marker: mumbai });
    expect(url.indexOf('width=')).toBeLessThan(url.indexOf('marker='));
  });
});

describe('resolveEmbedTheme', () => {
  it('keeps a theme that matches the mode', () => {
    expect(
      resolveEmbedTheme({ embedMode: 'dark', theme: 'cyber-emerald', lightTheme: 'daylight-atlas', darkTheme: 'cyber-emerald' })
    ).toBe('cyber-emerald');
  });

  it('substitutes the bound palette when it does not', () => {
    expect(
      resolveEmbedTheme({ embedMode: 'dark', theme: 'daylight-atlas', lightTheme: 'daylight-atlas', darkTheme: 'deep-sapphire' })
    ).toBe('deep-sapphire');
    expect(
      resolveEmbedTheme({ embedMode: 'light', theme: 'cyber-emerald', lightTheme: 'paper-cartography', darkTheme: 'cyber-emerald' })
    ).toBe('paper-cartography');
  });
});

describe('embedDimensions', () => {
  it('squares a fixed size', () => {
    expect(embedDimensions('600')).toEqual({ width: '600px', height: '600px' });
  });

  it('gives a responsive embed a default height', () => {
    expect(embedDimensions('100%')).toEqual({ width: '100%', height: '600px' });
  });
});

describe('iframeBackgroundFor', () => {
  it('uses the neutral backdrop when the theme background is off', () => {
    expect(iframeBackgroundFor('light', false)).toBe('#ffffff');
    expect(iframeBackgroundFor('dark', false)).toBe('#000000');
  });

  it('uses a light surface when the theme background is on', () => {
    expect(iframeBackgroundFor('light', true)).toBe('#f8fafc');
    expect(iframeBackgroundFor('dark', true)).toBe('#000000');
  });
});

describe('buildIframeSnippet', () => {
  const src = 'https://example.com/embed.html?theme=x';

  it('embeds the given src verbatim', () => {
    expect(buildIframeSnippet(src, 'light', true, '500')).toContain(`src="${src}"`);
  });

  it('carries the dimensions and a matching backdrop', () => {
    const snippet = buildIframeSnippet(src, 'light', false, '500');
    expect(snippet).toContain('width="500px"');
    expect(snippet).toContain('height="500px"');
    expect(snippet).toContain('background: #ffffff;');
  });

  it('is accessible and titled', () => {
    const snippet = buildIframeSnippet(src, 'dark', true, '500');
    expect(snippet).toContain('title="India 3D Interactive Map Globe"');
    expect(snippet).toContain('aria-label="Interactive 3D India Globe"');
  });
});
// The parameter is additive and emitted last so that every URL generated by an
// earlier build stays byte-identical. That matters more than it looks: those
// snippets are already pasted into live sites.
describe('buildEmbedUrl - respectReducedMotion', () => {
  it('omits the parameter entirely by default', () => {
    const url = buildEmbedUrl(defaults);
    expect(url).not.toContain('respectReducedMotion');
    expect(url).toBe(buildEmbedUrl({ ...defaults, respectReducedMotion: false }));
  });

  it('emits it when the host opts in', () => {
    const url = buildEmbedUrl({ ...defaults, respectReducedMotion: true });
    expect(url).toContain('&respectReducedMotion=true');
  });

  it('appends it after every other parameter, so prior output is unchanged', () => {
    const url = buildEmbedUrl({
      ...defaults,
      highlightState: 'Maharashtra',
      respectReducedMotion: true,
    });
    expect(url.endsWith('&state=Maharashtra&respectReducedMotion=true')).toBe(true);
  });

  it('round-trips back through the parser', () => {
    const url = buildEmbedUrl({ ...defaults, respectReducedMotion: true });
    expect(parseGlobeConfig(url.slice(url.indexOf('?'))).respectReducedMotion).toBe(true);
  });
});
