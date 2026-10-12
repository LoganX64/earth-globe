import { describe, it, expect } from 'vitest';
import {
  THEME_PRESETS,
  DARK_THEME_PRESETS,
  LIGHT_THEME_PRESETS,
  DEFAULT_THEME_ID,
  DEFAULT_DARK_THEME_ID,
  DEFAULT_LIGHT_THEME_ID,
} from './themePresets';

// Every colour slot the renderer reads off a theme. A missing one falls back to
// a hardcoded literal in EarthGlobe.tsx, which is exactly the kind of drift
// these assertions exist to catch.
const REQUIRED_SLOTS = [
  'background',
  'ocean',
  'land',
  'landBorder',
  'highlightLand',
  'highlightLandBorder',
  'highlightGlow',
  'atmosphereInner',
  'atmosphereOuter',
  'markerPrimary',
  'markerSecondary',
  'markerPulse',
] as const;

const HEX_OR_RGBA = /^(#[0-9a-f]{3}([0-9a-f]{3})?|rgba?\([^)]*\))$/i;

describe('THEME_PRESETS registry', () => {
  it('exposes twelve presets — six light, six dark', () => {
    expect(Object.keys(THEME_PRESETS)).toHaveLength(12);
    expect(DARK_THEME_PRESETS).toHaveLength(6);
    expect(LIGHT_THEME_PRESETS).toHaveLength(6);
  });

  it('keys every preset by its own id', () => {
    for (const [key, preset] of Object.entries(THEME_PRESETS)) {
      expect(preset.id).toBe(key);
    }
  });

  it('gives every preset a display name', () => {
    for (const [key, preset] of Object.entries(THEME_PRESETS)) {
      expect(preset.name, `theme ${key} needs a name`).toBeTruthy();
    }
  });

  it.each(Object.entries(THEME_PRESETS))(
    'theme "%s" defines every required colour slot',
    (_key, preset) => {
      for (const slot of REQUIRED_SLOTS) {
        expect(preset[slot], `missing ${slot}`).toBeTruthy();
      }
    }
  );

  it.each(Object.entries(THEME_PRESETS))(
    'theme "%s" only uses hex or rgb/rgba colours',
    (_key, preset) => {
      for (const slot of REQUIRED_SLOTS) {
        const value = preset[slot] as string;
        // A bare CSS keyword would bypass the "colours are allowlisted"
        // discipline the rest of the app holds to.
        expect(value, `slot ${slot} = ${value}`).toMatch(HEX_OR_RGBA);
      }
    }
  );

  it('partitions presets with no overlap', () => {
    const dark = new Set(DARK_THEME_PRESETS.map((t) => t.id));
    for (const light of LIGHT_THEME_PRESETS) {
      expect(dark.has(light.id)).toBe(false);
    }
    expect(dark.size + LIGHT_THEME_PRESETS.length).toBe(12);
  });
});

describe('theme defaults', () => {
  it('defaults to the light atlas palette', () => {
    expect(DEFAULT_THEME_ID).toBe(DEFAULT_LIGHT_THEME_ID);
    expect(DEFAULT_LIGHT_THEME_ID).toBe('daylight-atlas');
    expect(DEFAULT_DARK_THEME_ID).toBe('black-and-white');
  });

  // App.tsx and embed.tsx both fall back to these when a supplied id is unknown
  // or belongs to the wrong polarity, so each must resolve.
  it('every default exists in the registry with the expected polarity', () => {
    expect(THEME_PRESETS[DEFAULT_LIGHT_THEME_ID].isDark).toBe(false);
    expect(THEME_PRESETS[DEFAULT_DARK_THEME_ID].isDark).toBe(true);
  });
});