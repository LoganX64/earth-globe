import { describe, it, expect } from 'vitest';
import {
  normalizeBackgroundColor,
  parseShowBackground,
  resolveBackgroundColor,
  resolveFrameBackground,
  toColorInputValue,
  hasParam,
  neutralBackground,
} from './background';

describe('normalizeBackgroundColor', () => {
  it('expands 3-digit shorthand', () => {
    expect(normalizeBackgroundColor('#abc')).toBe('#aabbcc');
    expect(normalizeBackgroundColor('abc')).toBe('#aabbcc');
  });

  it('lowercases 6-digit values', () => {
    expect(normalizeBackgroundColor('#AABBCC')).toBe('#aabbcc');
    expect(normalizeBackgroundColor('0A0A0A')).toBe('#0a0a0a');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeBackgroundColor('  #ffffff  ')).toBe('#ffffff');
  });

  it('accepts the bare-6-digit form the embed docs advertise', () => {
    expect(normalizeBackgroundColor('%230a0a0a'.replace('%23', ''))).toBe('#0a0a0a');
  });

  // The value lands in a CSS `background-color`, so anything that is not a hex
  // triple/six must be rejected outright rather than passed through.
  it.each([
    ['empty string', ''],
    ['whitespace only', '   '],
    ['4 digits', '#abcd'],
    ['5 digits', '#abcde'],
    ['7 digits', '#abcdef0'],
    ['non-hex letters', '#gggggg'],
    ['leading double hash', '##fff'],
    ['a css keyword', 'red'],
    ['rgb() function', 'rgb(1,2,3)'],
    ['a url() payload', 'url(evil)'],
    ['an off keyword', 'transparent'],
    ['a number', 123],
    ['null', null],
    ['undefined', undefined],
    ['an object', {}],
  ])('rejects %s', (_label, raw) => {
    expect(normalizeBackgroundColor(raw)).toBeNull();
  });
});

describe('hasParam', () => {
  it('is true only for a non-blank supplied value', () => {
    expect(hasParam('#fff')).toBe(true);
    expect(hasParam('false')).toBe(true);
    expect(hasParam('')).toBe(false);
    expect(hasParam('   ')).toBe(false);
    expect(hasParam(null)).toBe(false);
    expect(hasParam(undefined)).toBe(false);
  });
});

describe('parseShowBackground', () => {
  it('turns the background off for the documented keywords', () => {
    for (const raw of ['false', 'none', 'transparent', 'FALSE', 'None', '  TRANSPARENT  ']) {
      expect(parseShowBackground(raw)).toBe(false);
    }
  });

  // Documented explicitly in background.ts: `background` is a visibility switch,
  // so a hex here is a user error, not a colour.
  it('treats every other value — including a hex — as "on"', () => {
    for (const raw of ['#ffffff', 'true', 'yes', '1', 'off', 'nope']) {
      expect(parseShowBackground(raw)).toBe(true);
    }
  });

  it('defaults to on when absent', () => {
    expect(parseShowBackground(null)).toBe(true);
    expect(parseShowBackground(undefined)).toBe(true);
    expect(parseShowBackground('')).toBe(true);
  });
});

describe('resolveBackgroundColor', () => {
  it('prefers the URL value', () => {
    expect(resolveBackgroundColor('#111111', '#222222')).toBe('#111111');
  });

  it('falls back to saved when the URL value is absent', () => {
    expect(resolveBackgroundColor(null, '#222222')).toBe('#222222');
  });

  // Documented in background.ts: an invalid supplied value must fall through to
  // the saved value rather than silently clearing the user's colour.
  it('falls back to saved when the URL value is invalid', () => {
    expect(resolveBackgroundColor('not-a-colour', '#222222')).toBe('#222222');
    expect(resolveBackgroundColor('#zz', '#222222')).toBe('#222222');
  });

  it('returns null when neither side resolves', () => {
    expect(resolveBackgroundColor(null, null)).toBeNull();
    expect(resolveBackgroundColor('bogus', 42)).toBeNull();
  });

  it('normalises on the way through', () => {
    expect(resolveBackgroundColor('#ABC', null)).toBe('#aabbcc');
  });
});

describe('resolveFrameBackground', () => {
  it('leaves the caller in charge when the theme background is on', () => {
    // undefined is meaningful: it means "keep your own theme-aware colour".
    expect(resolveFrameBackground(true, false)).toBeUndefined();
    expect(resolveFrameBackground(true, true)).toBeUndefined();
  });

  it('extends the neutral backdrop past the canvas when it is off', () => {
    expect(resolveFrameBackground(false, false)).toBe('#ffffff');
    expect(resolveFrameBackground(false, true)).toBe('#000000');
  });
});

describe('neutralBackground', () => {
  it('keys off theme polarity', () => {
    expect(neutralBackground(true)).toBe('#000000');
    expect(neutralBackground(false)).toBe('#ffffff');
  });
});

describe('toColorInputValue', () => {
  it('prefers the override', () => {
    expect(toColorInputValue('#123456', '#ffffff')).toBe('#123456');
  });

  it('falls back to the theme background', () => {
    expect(toColorInputValue(null, '#ffffff')).toBe('#ffffff');
  });

  it('uses the supplied default when neither resolves', () => {
    expect(toColorInputValue(null, 'nonsense', '#abcdef')).toBe('#abcdef');
    expect(toColorInputValue(null, 'nonsense')).toBe('#000000');
  });
});