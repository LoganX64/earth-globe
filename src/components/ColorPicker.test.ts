import { describe, it, expect } from 'vitest';
import {
  normalizeHex,
  hexToRgb,
  rgbToHex,
  rgbToHsv,
  hsvToRgb,
} from './ColorPicker';
import { normalizeBackgroundColor } from './EarthGlobe/background';

// The picker used to carry its own byte-equivalent copy of the hex allowlist.
// It must stay the SAME function, or the two can drift again.
describe('normalizeHex identity', () => {
  it('is the shared background.ts validator, not a copy', () => {
    expect(normalizeHex).toBe(normalizeBackgroundColor);
  });
});

const closeToRgb = (actual: [number, number, number], expected: [number, number, number], tol = 1) => {
  expect(actual[0]).toBeCloseTo(expected[0], 0);
  expect(actual[1]).toBeCloseTo(expected[1], 0);
  expect(actual[2]).toBeCloseTo(expected[2], 0);
  actual.forEach((v, i) => expect(Math.abs(v - expected[i])).toBeLessThanOrEqual(tol));
};

describe('normalizeHex', () => {
  it('expands shorthand and lowercases', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc');
    expect(normalizeHex('#FFFFFF')).toBe('#ffffff');
  });

  it('accepts a bare hex without the hash', () => {
    expect(normalizeHex('0a0a0a')).toBe('#0a0a0a');
  });

  it.each(['', '   ', '#ab', '#abcde', '#zzzzzz', 'red', null, undefined, 42])(
    'rejects %p',
    (raw) => {
      expect(normalizeHex(raw)).toBeNull();
    }
  );
});

describe('hexToRgb', () => {
  it('parses 6-digit values', () => {
    expect(hexToRgb('#0a0a0a')).toEqual([10, 10, 10]);
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
    expect(hexToRgb('#ff0000')).toEqual([255, 0, 0]);
  });

  it('falls back to black on unparseable input', () => {
    expect(hexToRgb('nonsense')).toEqual([0, 0, 0]);
  });
});

describe('rgbToHex', () => {
  it('round-trips through hexToRgb', () => {
    for (const hex of ['#000000', '#ffffff', '#0a0a0a', '#3b82f6', '#fef08a']) {
      expect(rgbToHex(hexToRgb(hex))).toBe(hex);
    }
  });

  it('clamps and rounds out-of-range channels', () => {
    expect(rgbToHex([-20, 300, 128.4])).toBe('#00ff80');
  });

  it('always pads single-digit channels to two characters', () => {
    expect(rgbToHex([1, 2, 3])).toBe('#010203');
  });
});

describe('rgbToHsv', () => {
  it('maps greys to zero saturation', () => {
    for (const level of [0, 64, 128, 255]) {
      const { h, s } = rgbToHsv([level, level, level]);
      expect(s).toBeCloseTo(0, 5);
      expect(h).toBeCloseTo(0, 5);
    }
  });

  it('maps black to zero value, white to full value', () => {
    expect(rgbToHsv([0, 0, 0]).v).toBeCloseTo(0, 5);
    expect(rgbToHsv([255, 255, 255]).v).toBeCloseTo(1, 5);
  });

  it('resolves the primary hue sectors', () => {
    expect(rgbToHsv([255, 0, 0]).h).toBeCloseTo(0, 0);
    expect(rgbToHsv([0, 255, 0]).h).toBeCloseTo(120, 0);
    expect(rgbToHsv([0, 0, 255]).h).toBeCloseTo(240, 0);
  });
});

describe('hsvToRgb', () => {
  it('round-trips a spread of colours', () => {
    for (const hex of ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff', '#3b82f6', '#0a0a0a']) {
      closeToRgb(hsvToRgb(rgbToHsv(hexToRgb(hex))), hexToRgb(hex) as [number, number, number], 1);
    }
  });

  it('normalises hue outside 0-360', () => {
    const base = hsvToRgb({ h: 0, s: 1, v: 1 });
    const wrapped = hsvToRgb({ h: 360, s: 1, v: 1 });
    const negative = hsvToRgb({ h: -360, s: 1, v: 1 });
    closeToRgb(wrapped, base);
    closeToRgb(negative, base);
  });

  it('treats zero saturation as grey regardless of hue', () => {
    for (const h of [0, 90, 180, 270]) {
      const [r, g, b] = hsvToRgb({ h, s: 0, v: 0.5 });
      expect(r).toBeCloseTo(g, 5);
      expect(g).toBeCloseTo(b, 5);
    }
  });
});

describe('full pipeline', () => {
  it('survives the picker\'s draft -> commit path', () => {
    // commitHexDraft parses a free-typed draft and hands back a normalised hex.
    for (const draft of ['0A0A0A', '#0a0a0a', 'fff', ' #FFFFFF ']) {
      const parsed = normalizeHex(draft);
      expect(parsed).not.toBeNull();
      expect(parsed!).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('restores the previous value when a draft is invalid', () => {
    // commitHexDraft falls back to `effective` rather than clearing it.
    const previous = '#0a0a0a';
    expect(normalizeHex('nope')).toBeNull();
    expect(previous).toMatch(/^#[0-9a-f]{6}$/);
  });
});