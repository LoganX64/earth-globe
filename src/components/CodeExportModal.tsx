import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Copy,
  Check,
  Globe,
  ExternalLink,
  Sun,
  Moon,
} from "lucide-react";
import {
  GlobeMarker,
  MIN_ZOOM_LEVEL,
  MAX_ZOOM_LEVEL,
  DEFAULT_EMBED_ZOOM,
} from "./EarthGlobe/types";
import {
  THEME_PRESETS,
  DEFAULT_DARK_THEME_ID,
  DEFAULT_LIGHT_THEME_ID,
} from "./EarthGlobe/themePresets";

// A single on/off option: shows "✓ Label" while enabled and just "Label" once off,
// both stacked in the same grid cell so the button never changes width.
const ToggleChip: React.FC<{
  label: string;
  value: boolean;
  onToggle: () => void;
  isDark: boolean;
}> = ({ label, value, onToggle, isDark }) => (
  <button
    onClick={onToggle}
    className={`px-2.5 py-1 rounded-md border border-dashed text-[11px] cursor-pointer transition-colors grid ${
      value
        ? "bg-blue-600 text-white border-blue-500"
        : isDark
          ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-600"
          : "bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-300"
    }`}
  >
    <span
      className={`col-start-1 row-start-1 whitespace-nowrap ${value ? "" : "invisible"}`}
    >
      ✓ {label}
    </span>
    <span
      className={`col-start-1 row-start-1 whitespace-nowrap ${value ? "invisible" : ""}`}
    >
      {label}
    </span>
  </button>
);

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMarker?: GlobeMarker | null;
  highlightState?: string;
  autoRotateSpeed?: number;
  autoRotate?: boolean;
  theme?: string;
  lightTheme?: string;
  darkTheme?: string;
  onlyIndia?: boolean;
  isDark?: boolean;
  showStars?: boolean;
  showBackground?: boolean;
  /** null means the embed follows its own theme's background colour */
  backgroundColor?: string | null;
  showGraticule?: boolean;
  showAtmosphere?: boolean;
  showStateBorders?: boolean;
}

export const CodeExportModal: React.FC<CodeExportModalProps> = ({
  isOpen,
  onClose,
  activeMarker,
  highlightState,
  autoRotateSpeed = 1.2,
  autoRotate = true,
  theme = DEFAULT_LIGHT_THEME_ID,
  lightTheme = DEFAULT_LIGHT_THEME_ID,
  darkTheme = DEFAULT_DARK_THEME_ID,
  onlyIndia = true,
  isDark = false,
  showStars = true,
  showBackground = true,
  backgroundColor = null,
  showGraticule = true,
  showAtmosphere = true,
  showStateBorders = true,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [embedSize, setEmbedSize] = useState<"500" | "400" | "600" | "100%">(
    "500",
  );
  // Measured column width for the live preview, used to scale it down on narrow
  // screens while keeping the true embed dimensions in the copied snippet.
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewColumnWidth, setPreviewColumnWidth] = useState<number>(0);
  const [embedOnlyIndia, setEmbedOnlyIndia] = useState<boolean>(onlyIndia);
  // Embed preview mode follows the MAP theme (chrome itself is always light)
  const [embedMode, setEmbedMode] = useState<"dark" | "light">(
    THEME_PRESETS[theme]?.isDark ? "dark" : "light",
  );
  // Viewer-facing controls — pre-selected here, baked into the exported URL / snippet
  const [embedDrag, setEmbedDrag] = useState<boolean>(true);
  const [embedZoom, setEmbedZoom] = useState<boolean>(true);
  const [embedRotate, setEmbedRotate] = useState<boolean>(autoRotate);
  // Zoom: the buttons and the wheel are separately switchable, and the level sets
  // how close the globe starts
  const [embedZoomButtons, setEmbedZoomButtons] = useState<boolean>(true);
  const [embedScrollZoom, setEmbedScrollZoom] = useState<boolean>(true);
  const [embedZoomLevel, setEmbedZoomLevel] = useState<number>(DEFAULT_EMBED_ZOOM);
  // Map layers — seeded from the globe currently on screen so the preview matches
  // the main app, then freely overridable per embed
  const [embedStars, setEmbedStars] = useState<boolean>(showStars);
  const [embedGrid, setEmbedGrid] = useState<boolean>(showGraticule);
  const [embedAtmosphere, setEmbedAtmosphere] = useState<boolean>(showAtmosphere);
  const [embedBorders, setEmbedBorders] = useState<boolean>(showStateBorders);

  // Re-sync layers from the globe whenever the dialog opens, so previewing an
  // embed after toggling Starfield in the app reflects the change
  useEffect(() => {
    if (!isOpen) return;
    setEmbedStars(showStars);
    setEmbedGrid(showGraticule);
    setEmbedAtmosphere(showAtmosphere);
    setEmbedBorders(showStateBorders);
  }, [isOpen, showStars, showGraticule, showAtmosphere, showStateBorders]);

  const layerToggles = [
    {
      key: "stars",
      label: "Starfield",
      value: embedStars,
      toggle: () => setEmbedStars((prev) => !prev),
    },
    {
      key: "grid",
      label: "Grid",
      value: embedGrid,
      toggle: () => setEmbedGrid((prev) => !prev),
    },
    {
      key: "atmosphere",
      label: "Atmosphere",
      value: embedAtmosphere,
      toggle: () => setEmbedAtmosphere((prev) => !prev),
    },
    {
      key: "borders",
      label: "Borders",
      value: embedBorders,
      toggle: () => setEmbedBorders((prev) => !prev),
    },
  ];

  // Measure the preview column so the iframe can be scaled to fit. Runs while
  // closed too (the ref is null then, so it no-ops) and re-attaches on open.
  useEffect(() => {
    if (!isOpen) return;
    const el = previewRef.current;
    if (!el) return;
    const measure = () => setPreviewColumnWidth(el.clientWidth);
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, [isOpen, embedSize]);

  if (!isOpen) return null;

  const currentHost =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://your-domain.vercel.app";

  // Ensure embed theme matches mode selection, falling back to the theme bound
  // to that polarity in the Globe Customizer
  const activeEmbedTheme = (() => {
    const isSelectedThemeDark = THEME_PRESETS[theme]?.isDark ?? true;
    if (embedMode === "dark" && !isSelectedThemeDark) {
      return darkTheme;
    }
    if (embedMode === "light" && isSelectedThemeDark) {
      return lightTheme;
    }
    return theme;
  })();

  const embedWidth = embedSize === "100%" ? "100%" : `${embedSize}px`;
  const embedHeight = embedSize === "100%" ? "600px" : `${embedSize}px`;

  // The preview is rendered at the real embed size, then scaled to fit the
  // dialog column. A 500px preview is wider than a phone, and simply capping the
  // box would crop the iframe rather than fit it.
  const previewNaturalWidth = embedSize === "100%" ? 0 : Number(embedSize);
  const previewNaturalHeight = embedSize === "100%" ? 600 : Number(embedSize);
  const previewScale =
    previewNaturalWidth > 0 && previewColumnWidth > 0
      ? Math.min(1, previewColumnWidth / previewNaturalWidth)
      : 1;
  // "100%" previews fill the column directly, so they need no scaling.
  const previewNaturalWidthCss =
    embedSize === "100%" ? "100%" : `${previewNaturalWidth}px`;
  const previewNaturalHeightCss =
    embedSize === "100%" ? "600px" : `${previewNaturalHeight}px`;
  const previewScaledHeight = `${previewNaturalHeight * previewScale}px`;

  const baseSrc = `${currentHost}/embed.html?embed=true&mode=${embedMode}&theme=${activeEmbedTheme}&lightTheme=${lightTheme}&darkTheme=${darkTheme}${embedOnlyIndia ? "&onlyIndia=true" : ""}${
    autoRotateSpeed !== 1.2 ? `&speed=${autoRotateSpeed.toFixed(1)}` : ""
  }&drag=${embedDrag}&zoom=${embedZoom}&zoomButtons=${embedZoomButtons}&scrollZoom=${embedScrollZoom}&zoomLevel=${embedZoomLevel.toFixed(2)}&rotate=${embedRotate}&stars=${embedStars}&grid=${embedGrid}&borders=${embedBorders}&atmosphere=${embedAtmosphere}&width=${encodeURIComponent(embedWidth)}&height=${encodeURIComponent(embedHeight)}`;

  // `background` is one param with three meanings, so it is only emitted when
  // it differs from the default of "follow the theme".
  const backgroundParam = !showBackground
    ? "&background=false"
    : backgroundColor
      ? `&background=${encodeURIComponent(backgroundColor)}`
      : "";

  // What the HOST page paints behind the iframe element. The neutral backdrop
  // has to reach the host's snippet too, otherwise the globe sits in a
  // letterbox of the theme's own colour. A custom colour deliberately does NOT
  // — inside the embed it is painted on the globe's canvas only.
  const iframeBackground = !showBackground
    ? embedMode === "light"
      ? "#ffffff"
      : "#000000"
    : embedMode === "light"
      ? "#f8fafc"
      : "#000000";

  // Shared by both tabs — mirrors the component's current config
  const embedSrc = `${baseSrc}${backgroundParam}${
    activeMarker
      ? `&marker=${encodeURIComponent(activeMarker.id)}&name=${encodeURIComponent(activeMarker.name)}&lat=${activeMarker.lat.toFixed(4)}&lng=${activeMarker.lng.toFixed(4)}${
          activeMarker.region
            ? `&region=${encodeURIComponent(activeMarker.region)}`
            : ""
        }`
      : ""
  }${highlightState ? `&state=${encodeURIComponent(highlightState)}` : ""}`;

  const iframeSnippet = `<!-- Drop-in 3D India Globe for any Portfolio, Webflow, WordPress, or HTML website -->
<!-- Mode: ${embedMode === "light" ? "Light Mode Map & UI" : "Dark Mode Map & UI"} -->
<iframe
  src="${embedSrc}"
  width="${embedSize === "100%" ? "100%" : `${embedSize}px`}"
  height="${embedSize === "100%" ? "600px" : `${embedSize}px`}"
  style="border: none; border-radius: 16px; overflow: hidden; background: ${iframeBackground};"
  allow="fullscreen"
  title="India 3D Interactive Map Globe"
  aria-label="Interactive 3D India Globe"
></iframe>`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const bgClass = isDark
    ? "bg-slate-950/78 backdrop-blur-2xl border-white/15 text-slate-100"
    : "bg-white border-neutral-200 text-neutral-900";

  return (
    /* items-start on phones so the dialog sits at the top of a short viewport
       instead of being centred and clipped; sm restores the centred layout. */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain p-3 bg-black/80 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-3xl h-190 max-h-[88dvh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${bgClass}`}
        /* Stop taps inside the dialog from reaching the backdrop handler. */
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 shrink-0 px-4 py-4 border-b border-inherit sm:items-center sm:px-6">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <h3 className="text-base font-bold">
                Embed &amp; Component Integration
              </h3>
              <p
                className={`text-xs ${isDark ? "text-neutral-400" : "text-neutral-500"}`}
              >
                Light &amp; Dark Mode ready
              </p>
            </div>
          </div>
          {/* 44px square below sm to meet the minimum touch target */}
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className={`w-11 h-11 sm:w-auto sm:h-auto sm:p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-center shrink-0 ${
              isDark
                ? "hover:bg-neutral-800 text-neutral-400 hover:text-white border-neutral-700"
                : "hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 border-neutral-300"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div
          className="flex-1 min-h-0 min-w-0 p-3 sm:p-6 overflow-y-auto space-y-5 text-sm scrollbar-gutter-stable"
        >
          {/* Quick Customizer Bar for Embed & Component */}
          {
            <div
              className={`p-4 rounded-xl border space-y-3 text-xs ${
                isDark
                  ? "bg-neutral-900/90 border-neutral-700/80"
                  : "bg-neutral-100/90 border-neutral-300"
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      isDark
                        ? "text-neutral-200 font-semibold"
                        : "text-neutral-800 font-semibold"
                    }
                  >
                    App / Map Mode:
                  </span>
                  <button
                    onClick={() => setEmbedMode("light")}
                    className={`px-3 py-1.5 rounded-lg border border-dashed font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                      embedMode === "light"
                        ? "bg-blue-600 text-white border-blue-500"
                        : isDark
                          ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-600"
                          : "bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-300"
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light Mode Map</span>
                  </button>
                  <button
                    onClick={() => setEmbedMode("dark")}
                    className={`px-3 py-1.5 rounded-lg border border-dashed font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                      embedMode === "dark"
                        ? "bg-blue-600 text-white border-blue-500"
                        : isDark
                          ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-600"
                          : "bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-300"
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark Mode Map</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      isDark
                        ? "text-neutral-200 font-semibold"
                        : "text-neutral-800 font-semibold"
                    }
                  >
                    Map Isolation:
                  </span>
                  <button
                    onClick={() => setEmbedOnlyIndia((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-lg border border-dashed font-semibold cursor-pointer transition-colors grid ${
                      embedOnlyIndia
                        ? "bg-blue-600 text-white border-blue-500"
                        : isDark
                          ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-600"
                          : "bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-300"
                    }`}
                  >
                    <span
                      className={`col-start-1 row-start-1 whitespace-nowrap ${embedOnlyIndia ? "" : "invisible"}`}
                    >
                      ✓ Only India Map
                    </span>
                    <span
                      className={`col-start-1 row-start-1 whitespace-nowrap ${embedOnlyIndia ? "invisible" : ""}`}
                    >
                      Global (India Featured)
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      isDark
                        ? "text-neutral-200 font-semibold"
                        : "text-neutral-800 font-semibold"
                    }
                  >
                    Size:
                  </span>
                  {(["400", "500", "600", "100%"] as const).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setEmbedSize(sz)}
                       className={`px-2.5 py-1 rounded-md border border-dashed text-[11px] font-mono cursor-pointer transition-colors text-center ${
                         embedSize === sz
                           ? "bg-blue-600 text-white border-blue-500"
                           : isDark
                             ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-600"
                             : "bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-300"
                       }`}
                    >
                      {sz === "100%" ? "Responsive" : `${sz}px`}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      isDark
                        ? "text-neutral-200 font-semibold"
                        : "text-neutral-800 font-semibold"
                    }
                  >
                    Rotation:
                  </span>
                  <button
                    onClick={() => setEmbedRotate((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-md border border-dashed text-[11px] cursor-pointer transition-colors grid ${
                      embedRotate
                        ? "bg-blue-600 text-white border-blue-500"
                        : isDark
                          ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-600"
                          : "bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-300"
                    }`}
                  >
                    <span
                      className={`col-start-1 row-start-1 whitespace-nowrap ${embedRotate ? "" : "invisible"}`}
                    >
                      ✓ Rotating
                    </span>
                    <span
                      className={`col-start-1 row-start-1 whitespace-nowrap ${embedRotate ? "invisible" : ""}`}
                    >
                      Frozen
                    </span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      isDark
                        ? "text-neutral-200 font-semibold"
                        : "text-neutral-800 font-semibold"
                    }
                  >
                    Drag:
                  </span>
                  <button
                    onClick={() => setEmbedDrag((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-md border border-dashed text-[11px] cursor-pointer transition-colors grid ${
                      embedDrag
                        ? "bg-blue-600 text-white border-blue-500"
                        : isDark
                          ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-600"
                          : "bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-300"
                    }`}
                  >
                    <span
                      className={`col-start-1 row-start-1 whitespace-nowrap ${embedDrag ? "" : "invisible"}`}
                    >
                      ✓ On
                    </span>
                    <span
                      className={`col-start-1 row-start-1 whitespace-nowrap ${embedDrag ? "invisible" : ""}`}
                    >
                      Off
                    </span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      isDark
                        ? "text-neutral-200 font-semibold"
                        : "text-neutral-800 font-semibold"
                    }
                  >
                    Layers:
                  </span>
                  {layerToggles.map((layer) => (
                    <ToggleChip
                      key={layer.key}
                      label={layer.label}
                      value={layer.value}
                      onToggle={layer.toggle}
                      isDark={isDark}
                    />
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      isDark
                        ? "text-neutral-200 font-semibold"
                        : "text-neutral-800 font-semibold"
                    }
                  >
                    Zoom:
                  </span>
                  <ToggleChip
                    label="Buttons"
                    value={embedZoomButtons}
                    onToggle={() => setEmbedZoomButtons((prev) => !prev)}
                    isDark={isDark}
                  />
                  <ToggleChip
                    label="Scroll"
                    value={embedScrollZoom}
                    onToggle={() => setEmbedScrollZoom((prev) => !prev)}
                    isDark={isDark}
                  />
                </div>

                <div className="flex items-center gap-2 min-w-40">
                  <span
                    className={
                      isDark
                        ? "text-neutral-200 font-semibold"
                        : "text-neutral-800 font-semibold"
                    }
                  >
                    Closeness:
                  </span>
                  <div className="flex-1 min-w-24 flex flex-col gap-1">
                    <div
                      className={`flex justify-between text-[10px] ${
                        isDark ? "text-neutral-300" : "text-neutral-600"
                      }`}
                    >
                      <span>Zoom Level</span>
                      <span className="font-mono font-semibold">
                        {Math.round(embedZoomLevel * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={MIN_ZOOM_LEVEL}
                      max={MAX_ZOOM_LEVEL}
                      step="0.05"
                      value={embedZoomLevel}
                      onChange={(e) =>
                        setEmbedZoomLevel(parseFloat(e.target.value))
                      }
                      className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${
                        isDark
                          ? "accent-sky-300 bg-white/20"
                          : "accent-blue-600 bg-neutral-300"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          }

          {/* Live in-dialog preview at the exact copied size */}
          {
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-medium px-0.5">
                <span
                  className={`min-w-0 ${
                    isDark
                      ? "text-neutral-300 font-semibold"
                      : "text-neutral-700 font-semibold"
                  }`}
                >
                  Live Preview —{" "}
                  {embedMode === "light"
                    ? "Light Mode Map & UI"
                    : "Dark Mode Map & UI"}{" "}
                  ({activeEmbedTheme})
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-[11px] text-neutral-400">
                    {embedSize === "100%"
                      ? "100% × 600px"
                      : `${embedSize} × ${embedSize}px`}
                  </span>
                  <a
                    href={embedSrc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-bold underline underline-offset-2 shrink-0"
                  >
                    <span>Test Embed URL</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
              {/* The preview keeps the real embed dimensions so what you see
                  matches what you copy, but is scaled down when that is wider
                  than the dialog column — otherwise a 500px preview is clipped
                  on a phone. transform:scale keeps the whole iframe visible
                  (shrinking the box would just crop it). */}
              <div
                ref={previewRef}
                className="w-full"
                /* Reserves the scaled footprint so the scaled child does not
                   collapse the row. */
                style={{ height: previewScaledHeight }}
              >
                <div
                  className="origin-top-left"
                  style={{
                    width: previewNaturalWidthCss,
                    height: previewNaturalHeightCss,
                    transform:
                      previewScale < 1 ? `scale(${previewScale})` : undefined,
                  }}
                >
                  <div
                    className={`rounded-xl overflow-hidden border transition-colors ${
                      embedMode === "light"
                        ? "border-neutral-300 bg-slate-100"
                        : "border-neutral-800 bg-black"
                    }`}
                    style={{
                      width: previewNaturalWidthCss,
                      height: previewNaturalHeightCss,
                    }}
                  >
                    <iframe
                      src={embedSrc}
                      title="Embed preview"
                      className="w-full h-full border-0"
                      // Match the generated snippet so the preview shows the
                      // host's real backdrop rather than the modal's surface
                      // while the embed first paints.
                      style={{ backgroundColor: iframeBackground }}
                    />
                  </div>
                </div>
              </div>
            </div>
          }

          {/* iFrame Embed */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h4
                  className={`font-semibold ${isDark ? "text-white" : "text-neutral-900"}`}
                >
                  Embed in Any Website or Portfolio
                </h4>
                <p
                  className={`text-xs ${isDark ? "text-neutral-400" : "text-neutral-500"}`}
                >
                  Supports Light Mode &amp; Dark Mode out of the box via{" "}
                  <code>?mode=light</code> or <code>?mode=dark</code> query
                  param.
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(iframeSnippet, "iframe")}
                className={`grid items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-dashed cursor-pointer transition-colors shrink-0 ${
                  isDark
                    ? "text-neutral-950 bg-white hover:bg-neutral-200"
                    : "text-white bg-neutral-900 hover:bg-neutral-800"
                }`}
              >
                <span
                  className={`col-start-1 row-start-1 flex items-center gap-1.5 whitespace-nowrap ${copiedSection === "iframe" ? "" : "invisible"}`}
                >
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Copied!</span>
                </span>
                <span
                  className={`col-start-1 row-start-1 flex items-center gap-1.5 whitespace-nowrap ${copiedSection === "iframe" ? "invisible" : ""}`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Embed Code</span>
                </span>
              </button>
            </div>

            <pre
              className={`p-4 rounded-xl border text-xs font-mono overflow-x-auto leading-relaxed ${
                isDark
                  ? "bg-neutral-900 border-neutral-800 text-neutral-200"
                  : "bg-neutral-100 border-neutral-300 text-neutral-800"
              }`}
            >
              {iframeSnippet}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-end shrink-0 px-6 py-3 border-t border-inherit ${
            isDark ? "bg-neutral-900/40" : "bg-neutral-100/60"
          }`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-2 text-xs font-semibold rounded-lg border border-dashed transition-colors cursor-pointer ${
              isDark
                ? "bg-white text-neutral-950 hover:bg-neutral-200"
                : "bg-neutral-900 text-white hover:bg-neutral-800"
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodeExportModal;
