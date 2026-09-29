/**
 * In-app colour picker for the custom backdrop.
 *
 * Replaces <input type="color">: the native control opens a browser-owned dialog
 * that renders differently on every platform, cannot be styled to match the
 * customizer, and gives no room to type an exact value. This keeps everything
 * inline and keyboard-reachable.
 *
 * The SV square and hue strip appear on first use and stay until dismissed, so
 * tweaking a value doesn't mean reopening the panel each time.
 */

import React, { useEffect, useRef, useState } from "react";
import { RotateCcw, X } from "lucide-react";

type RGB = [number, number, number];
type HSV = { h: number; s: number; v: number };

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const normalizeHex = (raw: unknown): string | null => {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (!/^[0-9a-fA-F]+$/.test(digits)) return null;
  if (digits.length === 3) {
    return `#${digits
      .toLowerCase()
      .split("")
      .map((c) => c + c)
      .join("")}`;
  }
  if (digits.length === 6) return `#${digits.toLowerCase()}`;
  return null;
};

const hexToRgb = (hex: string): RGB => {
  const full = normalizeHex(hex) ?? "#000000";
  return [
    parseInt(full.slice(1, 3), 16),
    parseInt(full.slice(3, 5), 16),
    parseInt(full.slice(5, 7), 16),
  ];
};

const rgbToHex = ([r, g, b]: RGB): string =>
  `#${[r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
    .join("")}`;

const rgbToHsv = ([r0, g0, b0]: RGB): HSV => {
  const r = r0 / 255;
  const g = g0 / 255;
  const b = b0 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
};

const hsvToRgb = ({ h, s, v }: HSV): RGB => {
  const hue = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g] = [c, x];
  else if (hue < 120) [r, g] = [x, c];
  else if (hue < 180) [g, b] = [c, x];
  else if (hue < 240) [g, b] = [x, c];
  else if (hue < 300) [r, b] = [x, c];
  else [r, b] = [c, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
};

interface ColorPickerProps {
  /** null means "no override" — the theme's own colour is previewed instead */
  value: string | null;
  /** The theme's background, used as the swatch when value is null */
  themeFallback: string;
  onChange: (hex: string) => void;
  onReset: () => void;
  disabled?: boolean;
  isDark?: boolean;
  /** Names the polarity in the labels, e.g. "dark" or "light" */
  slotLabel: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  themeFallback,
  onChange,
  onReset,
  disabled,
  isDark,
  slotLabel,
}) => {
  const [open, setOpen] = useState(false);
  const effective = value ?? themeFallback;
  const [hsv, setHsv] = useState<HSV>(() => rgbToHsv(hexToRgb(effective)));
  const [hexDraft, setHexDraft] = useState(() => effective.slice(1).toUpperCase());
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  // Track external changes (theme switch, reset) without stomping on a drag.
  useEffect(() => {
    setHsv(rgbToHsv(hexToRgb(effective)));
    setHexDraft(effective.slice(1).toUpperCase());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effective]);

  const emit = (next: HSV) => {
    setHsv(next);
    onChange(rgbToHex(hsvToRgb(next)));
  };

  const applyFromPointer = (
    e: React.PointerEvent<HTMLDivElement>,
    target: "sv" | "hue",
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (target === "sv") {
      emit({
        ...hsv,
        s: clamp01((e.clientX - rect.left) / rect.width),
        v: 1 - clamp01((e.clientY - rect.top) / rect.height),
      });
    } else {
      emit({
        ...hsv,
        h: clamp01((e.clientX - rect.left) / rect.width) * 360,
      });
    }
  };

  const startDrag = (target: "sv" | "hue") => (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    applyFromPointer(e, target);
  };

  const commitHexDraft = () => {
    const parsed = normalizeHex(hexDraft);
    if (parsed) {
      onChange(parsed);
      setHsv(rgbToHsv(hexToRgb(parsed)));
    } else {
      setHexDraft(effective.slice(1).toUpperCase());
    }
  };

  const nudge = (target: "sv" | "hue", dS: number, dV: number) => () => {
    if (target === "sv") {
      emit({
        h: hsv.h,
        s: clamp01(hsv.s + dS),
        v: clamp01(hsv.v + dV),
      });
    } else {
      emit({ ...hsv, h: (hsv.h + dV * 360 + 360) % 360 });
    }
  };

  const fieldClass = isDark
    ? "bg-black/30 border-white/15 text-white placeholder-slate-500 focus:border-sky-300"
    : "bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-blue-500";
  const chipBorder = isDark ? "border-white/20" : "border-neutral-300";
  const muteText = isDark ? "text-slate-400" : "text-neutral-500";
  const dotRing = isDark
    ? "ring-2 ring-slate-950/80"
    : "ring-2 ring-white";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className={`w-8 h-8 rounded-md border border-black/25 shrink-0 transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 ${dotRing.replace("ring-2", "ring-1")}`}
          style={{ backgroundColor: effective }}
          title={
            open
              ? `Backdrop colour for ${slotLabel} themes`
              : `Open the colour picker for ${slotLabel} themes`
          }
          aria-label={`Backdrop colour for ${slotLabel} themes`}
        />

        <input
          type="text"
          value={hexDraft}
          onChange={(e) => setHexDraft(e.target.value)}
          onBlur={commitHexDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitHexDraft();
            } else if (e.key === "Escape") {
              setHexDraft(effective.slice(1).toUpperCase());
            }
          }}
          disabled={disabled}
          spellCheck={false}
          maxLength={7}
          placeholder="THEME"
          className={`flex-1 min-w-0 h-8 px-2 rounded-md border text-[11px] font-mono uppercase ${fieldClass} disabled:opacity-50`}
          title="Hex value, e.g. 0A0A0A — press Enter to apply"
          aria-label={`Hex backdrop colour for ${slotLabel} themes`}
        />

        {/* White and black mirror what the Background toggle produces. */}
        {(["#ffffff", "#000000"] as const).map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              onChange(preset);
              setHsv(rgbToHsv(hexToRgb(preset)));
            }}
            disabled={disabled}
            className={`w-6 h-6 rounded-md border border-black/25 shrink-0 transition-transform hover:scale-110 disabled:opacity-40 disabled:hover:scale-100 ${
              preset === "#ffffff" ? "bg-white" : "bg-black"
            }`}
            title={preset === "#ffffff" ? "Pure white" : "Pure black"}
            aria-label={preset === "#ffffff" ? "Use pure white" : "Use pure black"}
          />
        ))}

        <button
          type="button"
          onClick={onReset}
          disabled={disabled || !value}
          className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${chipBorder} ${
            isDark ? "hover:bg-white/10 text-slate-300" : "hover:bg-neutral-200 text-neutral-600"
          }`}
          title="Use the theme's own background"
          aria-label="Use the theme's own background"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {open && (
        <div className="space-y-2 pt-1">
          <div
            ref={svRef}
            onPointerDown={startDrag("sv")}
            onPointerMove={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) applyFromPointer(e, "sv");
            }}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 0.1 : 0.02;
              if (e.key === "ArrowLeft") nudge("sv", -step, 0)();
              else if (e.key === "ArrowRight") nudge("sv", step, 0)();
              else if (e.key === "ArrowUp") nudge("sv", 0, step)();
              else if (e.key === "ArrowDown") nudge("sv", 0, -step)();
              else return;
              e.preventDefault();
            }}
            tabIndex={0}
            role="application"
            aria-label="Saturation and brightness"
            className="relative w-full h-28 rounded-md border border-black/20 cursor-crosshair touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            style={{
              backgroundImage: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h}, 100%, 50%))`,
            }}
          >
            <span
              className={`pointer-events-none absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${dotRing}`}
              style={{
                left: `${hsv.s * 100}%`,
                top: `${(1 - hsv.v) * 100}%`,
                backgroundColor: rgbToHex(hsvToRgb(hsv)),
              }}
            />
          </div>

          <div
            ref={hueRef}
            onPointerDown={startDrag("hue")}
            onPointerMove={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) applyFromPointer(e, "hue");
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") nudge("hue", 0, -1 / 36)();
              else if (e.key === "ArrowRight") nudge("hue", 0, 1 / 36)();
              else return;
              e.preventDefault();
            }}
            tabIndex={0}
            role="slider"
            aria-label="Hue"
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={Math.round(hsv.h)}
            className="relative w-full h-3 rounded-full border border-black/20 cursor-pointer touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            style={{
              backgroundImage:
                "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
            }}
          >
            <span
              className={`pointer-events-none absolute top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${dotRing}`}
              style={{
                left: `${(hsv.h / 360) * 100}%`,
                backgroundColor: rgbToHex(hsvToRgb({ h: hsv.h, s: 1, v: 1 })),
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className={`text-[9px] font-mono ${muteText}`}>
              PICKED FOR {slotLabel.toUpperCase()} THEMES ONLY
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${chipBorder} ${
                isDark
                  ? "hover:bg-white/10 text-slate-300"
                  : "hover:bg-neutral-200 text-neutral-600"
              }`}
              title="Close the colour picker"
              aria-label="Close the colour picker"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
