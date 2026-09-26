import React, { useState } from 'react';
import { X, Copy, Check, Code, Globe, Terminal, ExternalLink, Sun, Moon } from 'lucide-react';
import { GlobeMarker } from './EarthGlobe/types';
import { THEME_PRESETS, DEFAULT_DARK_THEME_ID, DEFAULT_LIGHT_THEME_ID } from './EarthGlobe/themePresets';

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMarker?: GlobeMarker | null;
  highlightState?: string;
  autoRotateSpeed?: number;
  autoRotate?: boolean;
  theme?: string;
  onlyIndia?: boolean;
  isDark?: boolean;
}

export const CodeExportModal: React.FC<CodeExportModalProps> = ({
  isOpen,
  onClose,
  activeMarker,
  highlightState,
  autoRotateSpeed = 1.2,
  autoRotate = true,
  theme = DEFAULT_DARK_THEME_ID,
  onlyIndia = true,
  isDark = true,
}) => {
  const [activeTab, setActiveTab] = useState<'embed' | 'react' | 'vercel' | 'current'>('embed');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [embedSize, setEmbedSize] = useState<'500' | '400' | '600' | '100%'>('500');
  const [embedOnlyIndia, setEmbedOnlyIndia] = useState<boolean>(onlyIndia);
  const [embedMode, setEmbedMode] = useState<'dark' | 'light'>(isDark ? 'dark' : 'light');
  // Viewer-facing controls — pre-selected here, baked into the exported URL / snippet
  const [embedDrag, setEmbedDrag] = useState<boolean>(true);
  const [embedZoom, setEmbedZoom] = useState<boolean>(true);
  const [embedRotate, setEmbedRotate] = useState<boolean>(autoRotate);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.vercel.app';

  // Ensure embed theme matches mode selection
  const activeEmbedTheme = (() => {
    const isSelectedThemeDark = THEME_PRESETS[theme]?.isDark ?? true;
    if (embedMode === 'dark' && !isSelectedThemeDark) {
      return DEFAULT_DARK_THEME_ID;
    }
    if (embedMode === 'light' && isSelectedThemeDark) {
      return DEFAULT_LIGHT_THEME_ID;
    }
    return theme;
  })();

  const baseSrc = `${currentHost}/?embed=true&mode=${embedMode}&theme=${activeEmbedTheme}${embedOnlyIndia ? '&onlyIndia=true' : ''}${
    autoRotateSpeed !== 1.2 ? `&speed=${autoRotateSpeed.toFixed(1)}` : ''
  }&drag=${embedDrag}&zoom=${embedZoom}&rotate=${embedRotate}`;

  // Shared by both tabs — mirrors the component's current config
  const embedSrc = `${baseSrc}${activeMarker ? `&marker=${activeMarker.id}` : ''}${
    highlightState ? `&state=${encodeURIComponent(highlightState)}` : ''
  }`;

  const iframeSnippet = `<!-- Drop-in 3D India Globe for any Portfolio, Webflow, WordPress, or HTML website -->
<!-- Mode: ${embedMode === 'light' ? 'Light Mode Map & UI' : 'Dark Mode Map & UI'} -->
<iframe
  src="${embedSrc}"
  width="${embedSize === '100%' ? '100%' : `${embedSize}px`}"
  height="${embedSize === '100%' ? '600px' : `${embedSize}px`}"
  style="border: none; border-radius: 16px; overflow: hidden; background: ${embedMode === 'light' ? '#f8fafc' : '#000000'};"
  loading="lazy"
  title="India 3D Interactive Map Globe"
></iframe>`;

  const markerCodeSnippet = activeMarker
    ? `[\n          {\n            id: '${activeMarker.id}',\n            name: '${activeMarker.name}',\n            region: '${activeMarker.region || ''}',\n            country: 'India',\n            lat: ${activeMarker.lat.toFixed(4)},\n            lng: ${activeMarker.lng.toFixed(4)},\n            isPrimary: true,\n          }\n        ]`
    : `[] // Clean map: no pins until selected`;

  const reactSnippet = `import React, { ${embedZoom ? 'useRef' : ''} } from 'react';
import { EarthGlobe, EarthGlobeRef } from './components/EarthGlobe';

// Drop-in React / Next.js Component for your portfolio or website
// Supports dynamic host app switching between Light Mode & Dark Mode
export function IndiaPortfolioGlobe({
  width = ${embedSize === '100%' ? "'100%'" : embedSize},
  height = ${embedSize === '100%' ? "'600px'" : embedSize},
  mode = '${embedMode}', // Pass 'dark' or 'light' (or connect to next-themes / useColorScheme)
}: {
  width?: number | string;
  height?: number | string;
  mode?: 'dark' | 'light';
}) {
  const globeRef = useRef<EarthGlobeRef>(null);

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden', borderRadius: '16px' }}>
      <EarthGlobe
        ref={globeRef}
        mode={mode}                             // Automatically switches Light Map in Light Mode & Dark Map in Dark Mode
        width="100%"
        height="100%"
        theme="${activeEmbedTheme}"
        highlightCountry="356"                // Survey of India authentic boundaries
        onlyIndia={${embedOnlyIndia}}                   // ${embedOnlyIndia ? 'Shows ONLY India map (isolated clean globe)' : 'Shows world with India featured'}
        ${highlightState ? `highlightState="${highlightState}"` : `// highlightState="Kerala"`}
        autoRotate={${embedRotate}}
        autoRotateSpeed={${autoRotateSpeed.toFixed(1)}}
        rotateDirection="west-to-east"
        showStateBorders={true}
        showGraticule={true}
        showAtmosphere={true}
        showStars={mode === 'dark'}
        enableDrag={${embedDrag}}
        enableZoom={${embedZoom}}
        initialCenter={[${activeMarker ? activeMarker.lng.toFixed(4) : '78.9629'}, ${activeMarker ? activeMarker.lat.toFixed(4) : '20.5937'}]}
        initialZoom={${activeMarker ? '1.4' : '1.1'}}
        markers={${markerCodeSnippet}}
      />
    </div>
  );
}`;

  const vercelGuide = `# DEPLOY TO VERCEL (100% Free Tier - Zero Backend Needed!)
# This is a 100% client-side React + Vite SPA.
# It requires NO Node server, NO database, and runs entirely in the browser at $0 cost.

# Step 1: Push your code to GitHub, or run Vercel CLI locally
npm i -g vercel

# Step 2: Deploy instantly from your terminal
vercel

# Vercel will auto-detect Vite:
# - Build Command: vite build (or npm run build)
# - Output Directory: dist
# - Framework Preset: Vite

# Once deployed, your app URL will be:
# https://your-project.vercel.app

# Step 3: Embed in Light or Dark mode in any website:
# <iframe src="https://your-project.vercel.app/?embed=true&mode=light" width="500" height="500"></iframe>
# <iframe src="https://your-project.vercel.app/?embed=true&mode=dark" width="500" height="500"></iframe>`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const bgClass = isDark
    ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
    : 'bg-white border-zinc-200 text-zinc-900 shadow-2xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className={`w-full max-w-3xl h-[760px] max-h-[88vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${bgClass}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 px-6 py-4 border-b border-inherit">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="text-base font-bold">Embed &amp; Component Integration</h3>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Light &amp; Dark Mode ready · Zero backend needed · 100% Vercel Free Tier
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark
                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
                : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 shrink-0 px-6 pt-3 border-b border-inherit">
          <button
            onClick={() => setActiveTab('embed')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer flex-1 min-w-0 justify-center whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'embed'
                ? isDark
                  ? 'bg-zinc-900 text-white border-t border-x border-zinc-700'
                  : 'bg-zinc-100 text-blue-600 border-t border-x border-zinc-300 font-bold'
                : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Website / Portfolio (iFrame)</span>
          </button>
          <button
            onClick={() => setActiveTab('react')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer flex-1 min-w-0 justify-center whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'react'
                ? isDark
                  ? 'bg-zinc-900 text-white border-t border-x border-zinc-700'
                  : 'bg-zinc-100 text-blue-600 border-t border-x border-zinc-300 font-bold'
                : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Code className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">React / Next.js Component</span>
          </button>
          <button
            onClick={() => setActiveTab('vercel')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer flex-1 min-w-0 justify-center whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'vercel'
                ? isDark
                  ? 'bg-zinc-900 text-white border-t border-x border-zinc-700'
                  : 'bg-zinc-100 text-blue-600 border-t border-x border-zinc-300 font-bold'
                : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Vercel Deploy Guide</span>
          </button>
        </div>

        {/* Content Body */}
        <div
          className="flex-1 min-h-0 min-w-0 p-6 overflow-y-auto space-y-5 text-sm"
          style={{ scrollbarGutter: 'stable' }}
        >
          {/* Quick Customizer Bar for Embed & Component */}
          {activeTab !== 'vercel' && (
            <div
              className={`p-4 rounded-xl border space-y-3 text-xs shadow-md ${
                isDark
                  ? 'bg-zinc-900/90 border-zinc-700/80'
                  : 'bg-zinc-100/90 border-zinc-300'
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
                <div className="flex items-center gap-2">
                  <span className={isDark ? 'text-zinc-200 font-semibold' : 'text-zinc-800 font-semibold'}>
                    App / Map Mode:
                  </span>
                  <button
                    onClick={() => setEmbedMode('light')}
                    className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                      embedMode === 'light'
                        ? 'bg-amber-400 text-zinc-950 border-amber-400 font-bold shadow-md'
                        : isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-600 font-medium'
                        : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300 font-medium'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-900" />
                    <span>Light Mode Map</span>
                  </button>
                  <button
                    onClick={() => setEmbedMode('dark')}
                    className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                      embedMode === 'dark'
                        ? 'bg-indigo-600 text-white border-indigo-500 font-bold shadow-md'
                        : isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-600 font-medium'
                        : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300 font-medium'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-indigo-200" />
                    <span>Dark Mode Map</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className={isDark ? 'text-zinc-200 font-semibold' : 'text-zinc-800 font-semibold'}>
                    Map Isolation:
                  </span>
                  <button
                    onClick={() => setEmbedOnlyIndia((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer transition-all ${
                      embedOnlyIndia
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md font-bold'
                        : isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-600 font-medium'
                        : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300 font-medium'
                    }`}
                  >
                    {embedOnlyIndia ? '✓ Only India Map' : 'Global (India Featured)'}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
                <div className="flex items-center gap-2">
                  <span className={isDark ? 'text-zinc-200 font-semibold' : 'text-zinc-800 font-semibold'}>
                    Size:
                  </span>
                  {(['400', '500', '600', '100%'] as const).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setEmbedSize(sz)}
                      className={`px-2.5 py-1 rounded-md border text-[11px] font-mono cursor-pointer transition-all text-center ${
                        embedSize === sz
                          ? 'bg-blue-600 text-white font-bold border-blue-500 shadow-md'
                          : isDark
                          ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-600 font-medium'
                          : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300 font-medium'
                      }`}
                    >
                      {sz === '100%' ? 'Responsive' : `${sz}px`}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className={isDark ? 'text-zinc-200 font-semibold' : 'text-zinc-800 font-semibold'}>
                    Rotation:
                  </span>
                  <button
                    onClick={() => setEmbedRotate((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-md border text-xs cursor-pointer transition-all ${
                      embedRotate
                        ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-md'
                        : isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-600 font-medium'
                        : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300 font-medium'
                    }`}
                  >
                    {embedRotate ? '✓ Rotating' : 'Frozen'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className={isDark ? 'text-zinc-200 font-semibold' : 'text-zinc-800 font-semibold'}>
                    Drag:
                  </span>
                  <button
                    onClick={() => setEmbedDrag((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-md border text-xs cursor-pointer transition-all ${
                      embedDrag
                        ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-md'
                        : isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-600 font-medium'
                        : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300 font-medium'
                    }`}
                  >
                    {embedDrag ? '✓ On' : 'Off'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Live in-dialog preview at the exact copied size */}
          {activeTab !== 'vercel' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium px-0.5">
                <span className={isDark ? 'text-zinc-300 font-semibold' : 'text-zinc-700 font-semibold'}>
                  Live Preview — {embedMode === 'light' ? 'Light Mode Map & UI' : 'Dark Mode Map & UI'} ({activeEmbedTheme})
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-[11px] text-zinc-400">
                    {embedSize === '100%' ? '100% × 600px' : `${embedSize} × ${embedSize}px`}
                  </span>
                  <a
                    href={embedSrc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-bold underline underline-offset-2 shrink-0"
                  >
                    <span>{activeTab === 'embed' ? 'Test Embed URL' : 'Test Preview URL'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
              <div
                className={`rounded-xl overflow-hidden border shadow-inner transition-colors ${
                  embedMode === 'light' ? 'border-zinc-300 bg-slate-100' : 'border-zinc-800 bg-black'
                }`}
                style={{
                  width: embedSize === '100%' ? '100%' : `${embedSize}px`,
                  height: embedSize === '100%' ? '600px' : `${embedSize}px`,
                }}
              >
                <iframe src={embedSrc} title="Embed preview" className="w-full h-full border-0" />
              </div>
            </div>
          )}

          {/* Tab 1: iFrame Embed */}
          {activeTab === 'embed' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    Embed in Any Website or Portfolio
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Supports Light Mode &amp; Dark Mode out of the box via <code>?mode=light</code> or <code>?mode=dark</code> query param.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(iframeSnippet, 'iframe')}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shadow-sm shrink-0 ${
                    isDark
                      ? 'text-zinc-950 bg-white hover:bg-zinc-200'
                      : 'text-white bg-zinc-900 hover:bg-zinc-800'
                  }`}
                >
                  {copiedSection === 'iframe' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Embed Code</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-mono overflow-x-auto leading-relaxed">
                {iframeSnippet}
              </pre>

              <div
                className={`p-3 rounded-lg border text-xs space-y-1 ${
                  isDark
                    ? 'bg-zinc-900/40 border-zinc-800 text-zinc-300'
                    : 'bg-blue-50/60 border-blue-200 text-zinc-800'
                }`}
              >
                <span className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  Supported Query Parameters for Your Website:
                </span>
                <ul
                  className={`list-disc pl-4 space-y-0.5 font-mono text-[11px] ${
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  }`}
                >
                  <li><code>?mode=light</code> | <code>?mode=dark</code> - Toggles Light Map &amp; UI vs Dark Map &amp; UI</li>
                  <li><code>?embed=true</code> - Shows ONLY the 3D map canvas (no navbar, no menus, no settings)</li>
                  <li><code>?onlyIndia=true</code> - Shows ONLY the sovereign Indian territory on the globe</li>
                  <li><code>?drag=false</code> - Disable globe dragging (default: enabled)</li>
                  <li><code>?zoom=false</code> - Disable scroll + <code>±</code> zoom buttons (default: enabled)</li>
                  <li><code>?rotate=false</code> - Freeze rotation (default: enabled)</li>
                  <li><code>?speed=1.5</code> - Custom planetary rotation speed</li>
                  <li><code>?marker=ulhasnagar</code> | <code>thrissur</code> | <code>mumbai</code> - Pre-select pin</li>
                </ul>
              </div>
            </div>
          )}

          {/* Tab 2: React Component */}
          {activeTab === 'react' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    React / Next.js Component
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Use directly in your React, Next.js, or Vite codebase. Pass <code>mode="light"</code> or <code>mode="dark"</code> (or hook to <code>next-themes</code>).
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(reactSnippet, 'react')}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shadow-sm shrink-0 ${
                    isDark
                      ? 'text-zinc-950 bg-white hover:bg-zinc-200'
                      : 'text-white bg-zinc-900 hover:bg-zinc-800'
                  }`}
                >
                  {copiedSection === 'react' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Component Code</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-mono overflow-x-auto leading-relaxed">
                {reactSnippet}
              </pre>
            </div>
          )}

          {/* Tab 3: Vercel Free Tier */}
          {activeTab === 'vercel' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    Deploy on Vercel Free Tier (100% Free)
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Does this React app need a backend? <strong>No backend is needed.</strong>
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(vercelGuide, 'vercel')}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shadow-sm shrink-0 ${
                    isDark
                      ? 'text-zinc-950 bg-white hover:bg-zinc-200'
                      : 'text-white bg-zinc-900 hover:bg-zinc-800'
                  }`}
                >
                  {copiedSection === 'vercel' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Guide</span>
                    </>
                  )}
                </button>
              </div>

              <div
                className={`p-4 rounded-xl border space-y-3 text-xs ${
                  isDark
                    ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300'
                    : 'bg-zinc-100 border-zinc-200 text-zinc-700'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded ${
                      isDark ? 'text-white bg-zinc-800' : 'text-zinc-900 bg-zinc-200'
                    }`}
                  >
                    1
                  </span>
                  <div>
                    <strong className={isDark ? 'text-white' : 'text-zinc-900'}>
                      Pure Client-Side React SPA:
                    </strong>
                    <p className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
                      All 3D math, canvas rendering, D3 orthographic projections, and Survey of India boundary GeoJSON are bundled client-side. Zero server resources are consumed.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded ${
                      isDark ? 'text-white bg-zinc-800' : 'text-zinc-900 bg-zinc-200'
                    }`}
                  >
                    2
                  </span>
                  <div>
                    <strong className={isDark ? 'text-white' : 'text-zinc-900'}>
                      Vercel Build Configuration:
                    </strong>
                    <p className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
                      Framework Preset: <code>Vite</code> | Build Command: <code>npm run build</code> | Output: <code>dist</code>. Vercel automatically detects this and deploys in &lt; 30 seconds.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded ${
                      isDark ? 'text-white bg-zinc-800' : 'text-zinc-900 bg-zinc-200'
                    }`}
                  >
                    3
                  </span>
                  <div>
                    <strong className={isDark ? 'text-white' : 'text-zinc-900'}>
                      Single-Page App Routing:
                    </strong>
                    <p className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
                      A <code>vercel.json</code> file is included in your repository root to ensure URL parameters and embeds work seamlessly without 404 errors.
                    </p>
                  </div>
                </div>
              </div>

              <pre className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-mono overflow-x-auto leading-relaxed">
                {vercelGuide}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between shrink-0 px-6 py-3 border-t border-inherit ${
            isDark ? 'bg-zinc-900/40 text-zinc-400' : 'bg-zinc-100/60 text-zinc-500'
          }`}
        >
          <span className="text-xs">
            Survey of India compliant · Official borders including J&amp;K and Ladakh
          </span>
          <button
            onClick={onClose}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              isDark
                ? 'bg-white text-zinc-950 hover:bg-zinc-200'
                : 'bg-zinc-900 text-white hover:bg-zinc-800'
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
