import { describe, it, expect } from 'vitest';
import { parseCoordinate } from './GlobeControls';

// Convenience wrappers matching the two call sites in handleCustomSubmit.
const lat = (raw: string) => parseCoordinate(raw, 10.5276, -90, 90);
const lng = (raw: string) => parseCoordinate(raw, 76.2144, -180, 180);

describe('parseCoordinate', () => {
  // The regression this exists for: `parseFloat(x) || fallback` treated a
  // legitimate 0 as missing and pinned Thrissur instead of Null Island.
  it('keeps a genuine zero rather than falling back', () => {
    expect(lat('0')).toBe(0);
    expect(lng('0')).toBe(0);
  });

  it('parses ordinary coordinates', () => {
    expect(lat('19.0760')).toBeCloseTo(19.076);
    expect(lng('72.8777')).toBeCloseTo(72.8777);
    expect(lat('-33.8688')).toBeCloseTo(-33.8688);
  });

  it('accepts surrounding whitespace', () => {
    expect(lat('  12.5  ')).toBeCloseTo(12.5);
  });

  it('accepts the full range of valid latitude and longitude', () => {
    expect(lat('90')).toBe(90);
    expect(lat('-90')).toBe(-90);
    expect(lng('180')).toBe(180);
    expect(lng('-180')).toBe(-180);
  });

  it('clamps out-of-range values to the nearest valid coordinate', () => {
    expect(lat('120')).toBe(90);
    expect(lat('-500')).toBe(-90);
    expect(lng('900')).toBe(180);
    expect(lng('-900')).toBe(-180);
  });

  it.each(['', '   ', 'abc', 'NaN', 'Infinity', '-', '.'])(
    'falls back for unparseable input %p',
    (raw) => {
      expect(lat(raw)).toBe(10.5276);
      expect(lng(raw)).toBe(76.2144);
    }
  );

  it('parses a trailing numeric prefix, matching parseFloat semantics', () => {
    // parseFloat('12abc') === 12. Preserved deliberately: the point of the fix
    // is the falsy-zero bug and range safety, not stricter input parsing.
    expect(lat('12abc')).toBe(12);
  });

  it('honours a supplied fallback', () => {
    expect(parseCoordinate('nonsense', 99, -90, 90)).toBe(99);
    expect(parseCoordinate('5', 99, -90, 90)).toBe(5);
  });
});