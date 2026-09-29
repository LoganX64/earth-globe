/**
 * Backdrop override parsing and validation.
 *
 * A theme carries its own background colour, but a host may want a neutral
 * backdrop or a colour of their own. Three parameters cover it, and the colour
 * is kept per polarity so light and dark themes never inherit each other's:
 *
 *   background=false        drop the theme's background for a neutral one —
 *                           pure white under a light theme, pure black under a
 *                           dark one
 *   lightBackground=#rrggbb  colour used whenever a LIGHT theme is active
 *   darkBackground=#rrggbb   colour used whenever a DARK theme is active
 *
 * Because the "off" case is a solid colour rather than transparency, the canvas
 * never needs an alpha channel and the page around the globe is left alone.
 *
 * Colours are allowlisted rather than passed through: the value ends up in a
 * CSS `background-color`, and the same parser is shared by the app, the embed
 * and the code generator so the three surfaces can never disagree.
 */

/** Parameters that turn the background off, whatever their spelling. */
const OFF_VALUES = new Set(['false', 'none', 'transparent']);

/**
 * The neutral backdrop used when the theme's own background is switched off.
 * Keyed off theme polarity so the globe stays legible without the tinted halo
 * and heavy limb shading that a theme's background is normally tuned against.
 */
export const neutralBackground = (isDark: boolean): string =>
  isDark ? '#000000' : '#ffffff';

/**
 * Normalise `#rgb`, `rgb` or `#rrggbb` to lowercase 6-digit hex.
 * Returns null for anything else, including the `off` keywords, which are
 * handled as a show/hide signal rather than a colour.
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

/** True when a parameter was supplied at all (and not merely blank). */
export const hasParam = (raw: string | null | undefined): boolean =>
  raw != null && raw.trim() !== '';

/**
 * The `background` parameter controls visibility only. Anything other than one
 * of the off keywords leaves the theme's own background in place — a hex here
 * is not a colour, so use `lightBackground` / `darkBackground` for that.
 */
export const parseShowBackground = (
  raw: string | null | undefined,
): boolean => !OFF_VALUES.has((raw ?? '').trim().toLowerCase());

/**
 * Resolve one polarity's colour, URL parameter first and saved settings second.
 * A supplied-but-invalid parameter falls through to the saved value rather than
 * silently clearing it.
 */
export const resolveBackgroundColor = (
  urlValue: string | null | undefined,
  savedValue: unknown,
): string | null =>
  normalizeBackgroundColor(urlValue) ?? normalizeBackgroundColor(savedValue);

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
  show: boolean,
  isDark: boolean,
): string | undefined => (show ? undefined : neutralBackground(isDark));

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
