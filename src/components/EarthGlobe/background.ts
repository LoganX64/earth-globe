/**
 * Background override parsing and validation.
 *
 * The globe's own background colour is a per-theme field, but a host may want
 * to drop the theme's tinted backdrop for a neutral one, or replace it with a
 * colour of their choosing. Both are expressed by a single `background` query
 * parameter with three values:
 *
 *   (absent)   use the active theme's background
 *   false      neutral backdrop: pure white for light themes, pure black for
 *              dark themes
 *   #rrggbb    a custom colour
 *
 * Because the "off" case is a solid colour rather than transparency, the canvas
 * never needs an alpha channel and the page around the globe is left alone.
 *
 * Colours are allowlisted rather than passed through: the value ends up in a
 * CSS `background-color`, and the same parser is shared by the app, the embed
 * and the code generator so the three surfaces can never disagree.
 */

export interface BackgroundSetting {
  /** False means "use a neutral backdrop instead of the theme's own". */
  show: boolean;
  /** Normalised 6-digit hex, or null to fall back to the theme's own colour. */
  color: string | null;
}

const TRANSPARENT_VALUES = new Set(['false', 'none', 'transparent']);

/**
 * The neutral backdrop used when the theme's own background is switched off.
 * Keyed off theme polarity so the globe stays legible without the tinted halo
 * and heavy limb shading that a theme's background is normally tuned against.
 */
export const neutralBackground = (isDark: boolean): string =>
  isDark ? '#000000' : '#ffffff';

/**
 * Normalise `#rgb`, `rgb` or `#rrggbb` to lowercase 6-digit hex.
 * Returns null for anything else, including the keyword `transparent`, which is
 * handled as a "use the neutral backdrop" signal rather than a colour.
 */
export const normalizeBackgroundColor = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  const digits = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  if (!/^[0-9a-fA-F]+$/.test(digits)) return null;

  if (digits.length === 3) {
    return `#${digits
      .toLowerCase()
      .split('')
      .map((c) => c + c)
      .join('')}`;
  }
  if (digits.length === 6) return `#${digits.toLowerCase()}`;

  return null;
};

/** Parse the `background` query parameter into a show/colour pair. */
export const parseBackgroundParam = (
  raw: string | null | undefined,
): BackgroundSetting => {
  if (raw == null) return { show: true, color: null };

  const value = raw.trim().toLowerCase();
  if (value === '' || value === 'true') return { show: true, color: null };
  if (TRANSPARENT_VALUES.has(value)) return { show: false, color: null };

  const color = normalizeBackgroundColor(raw);
  return color ? { show: true, color } : { show: true, color: null };
};

/** True when the parameter was supplied at all (and not merely blank). */
export const hasBackgroundParam = (raw: string | null | undefined): boolean =>
  raw != null && raw.trim() !== '';

/**
 * Colour to paint the area AROUND the globe, as distinct from the canvas.
 *
 * A custom colour is deliberately NOT applied here. The canvas already fills
 * the globe's box, and repainting the wrapper as well turned the whole
 * full-viewport page into the chosen colour, which made the globe read as
 * recoloured rather than merely re-backed. Only the neutral backdrop has to
 * extend past the canvas, otherwise the globe would sit in a letterbox of the
 * theme's own colour.
 *
 * `undefined` is meaningful: it means "leave the caller's own theme-aware
 * colour in place".
 */
export const resolveFrameBackground = (
  setting: BackgroundSetting,
  isDark: boolean,
): string | undefined =>
  setting.show ? undefined : neutralBackground(isDark);

/**
 * Value for an <input type="color">, which only accepts 6-digit hex. Falls
 * back to the theme's own background so the swatch always shows the colour
 * currently in effect.
 */
export const toColorInputValue = (
  color: string | null,
  themeBackground: string,
  fallback = '#000000',
): string =>
  normalizeBackgroundColor(color) ??
  normalizeBackgroundColor(themeBackground) ??
  fallback;
