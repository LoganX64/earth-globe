import React, { useState } from 'react';
import { X, Copy, Check, Code, Globe, ExternalLink, Sun, Moon } from 'lucide-react';
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
  theme = DEFAULT_LIGHT_THEME_ID,
  onlyIndia = true,
  isDark = false,
}) => {
  const [activeTab, setActiveTab] = useState<'embed' | 'react'>('embed');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [embedSize, setEmbedSize] = useState<'500' | '400' | '600' | '100%'>('500');
  const [embedOnlyIndia, setEmbedOnlyIndia] = useState<boolean>(onlyIndia);
  // Embed preview mode follows the MAP theme (chrome itself is always light)
  const [embedMode, setEmbedMode] = useState<'dark' | 'light'>(
    THEME_PRESETS[theme]?.isDark ? 'dark' : 'light'
  );
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
  const embedSrc = `${baseSrc}${
    activeMarker
      ? `&marker=${encodeURIComponent(activeMarker.id)}&name=${encodeURIComponent(activeMarker.name)}&lat=${activeMarker.lat.toFixed(4)}&lng=${activeMarker.lng.toFixed(4)}${
          activeMarker.region ? `&region=${encodeURIComponent(activeMarker.region)}` : ''
        }`
      : ''
  }${highlightState ? `&state=${encodeURIComponent(highlightState)}` : ''}`;

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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const bgClass = isDark
    ? 'bg-neutral-950 border-neutral-800 text-neutral-100'
    : 'bg-white border-neutral-200 text-neutral-900 shadow-2xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className={`w-full max-w-3xl h-[760px] max-h-[88vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${bgClass}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 px-6 py-4 border-b border-inherit">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-muted-foreground" />
            <div>
              <h3 className="text-base font-bold">Embed &amp; Component Integration</h3>
              <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Light &amp; Dark Mode ready
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
              isDark
                ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
                : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 shrink-0 px-6 pt-3 border-b border-inherit">
          <button
            onClick={() => setActiveTab('embed')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer flex-1 min-w-0 justify-center whitespace-nowrap flex items-center gap-1.5 border-t border-x ${
              activeTab === 'embed'
                ? isDark
                  ? 'bg-neutral-900 text-white border-neutral-700'
                  : 'bg-neutral-100 text-foreground border-neutral-300'
                : isDark
                ? 'text-neutral-400 hover:text-white border-transparent'
                : 'text-neutral-600 hover:text-neutral-900 border-transparent'
            }`}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Website / Portfolio (iFrame)</span>
          </button>
          <button
            onClick={() => setActiveTab('react')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer flex-1 min-w-0 justify-center whitespace-nowrap flex items-center gap-1.5 border-t border-x ${
              activeTab === 'react'
                ? isDark
                  ? 'bg-neutral-900 text-white border-neutral-700'
                  : 'bg-neutral-100 text-foreground border-neutral-300'
                : isDark
                ? 'text-neutral-400 hover:text-white border-transparent'
                : 'text-neutral-600 hover:text-neutral-900 border-transparent'
            }`}
          >
            <Code className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">React / Next.js Component</span>
          </button>
        </div>

        {/* Content Body */}
        <div
          className="flex-1 min-h-0 min-w-0 p-6 overflow-y-auto space-y-5 text-sm"
          style={{ scrollbarGutter: 'stable' }}
        >
          {/* Quick Customizer Bar for Embed & Component */}
          {(
            <div
              className={`p-4 rounded-xl border space-y-3 text-xs shadow-md ${
                isDark
                  ? 'bg-neutral-900/90 border-neutral-700/80'
                  : 'bg-neutral-100/90 border-neutral-300'
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
                <div className="flex items-center gap-2">
                  <span className={isDark ? 'text-neutral-200 font-semibold' : 'text-neutral-800 font-semibold'}>
                    App / Map Mode:
                  </span>
                  <button
                    onClick={() => setEmbedMode('light')}
                    className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                      embedMode === 'light'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                        : isDark
                        ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-600'
                        : 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-300'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light Mode Map</span>
                  </button>
                  <button
                    onClick={() => setEmbedMode('dark')}
                    className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                      embedMode === 'dark'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                        : isDark
                        ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-600'
                        : 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-300'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark Mode Map</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className={isDark ? 'text-neutral-200 font-semibold' : 'text-neutral-800 font-semibold'}>
                    Map Isolation:
                  </span>
                  <button
                    onClick={() => setEmbedOnlyIndia((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer transition-colors grid ${
                      embedOnlyIndia
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                        : isDark
                        ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-600'
                        : 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-300'
                    }`}
                  >
                    <span className={`col-start-1 row-start-1 whitespace-nowrap ${embedOnlyIndia ? '' : 'invisible'}`}>
                      ✓ Only India Map
                    </span>
                    <span className={`col-start-1 row-start-1 whitespace-nowrap ${embedOnlyIndia ? 'invisible' : ''}`}>
                      Global (India Featured)
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
                <div className="flex items-center gap-2">
                  <span className={isDark ? 'text-neutral-200 font-semibold' : 'text-neutral-800 font-semibold'}>
                    Size:
                  </span>
                  {(['400', '500', '600', '100%'] as const).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setEmbedSize(sz)}
                      className={`px-2.5 py-1 rounded-md border text-[11px] font-mono cursor-pointer transition-colors text-center ${
                        embedSize === sz
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                          : isDark
                          ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-600'
                          : 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-300'
                      }`}
                    >
                      {sz === '100%' ? 'Responsive' : `${sz}px`}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className={isDark ? 'text-neutral-200 font-semibold' : 'text-neutral-800 font-semibold'}>
                    Rotation:
                  </span>
                  <button
                    onClick={() => setEmbedRotate((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-md border text-[11px] cursor-pointer transition-colors grid ${
                      embedRotate
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                        : isDark
                        ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-600'
                        : 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-300'
                    }`}
                  >
                    <span className={`col-start-1 row-start-1 whitespace-nowrap ${embedRotate ? '' : 'invisible'}`}>
                      ✓ Rotating
                    </span>
                    <span className={`col-start-1 row-start-1 whitespace-nowrap ${embedRotate ? 'invisible' : ''}`}>
                      Frozen
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className={isDark ? 'text-neutral-200 font-semibold' : 'text-neutral-800 font-semibold'}>
                    Drag:
                  </span>
                  <button
                    onClick={() => setEmbedDrag((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-md border text-[11px] cursor-pointer transition-colors grid ${
                      embedDrag
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                        : isDark
                        ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-600'
                        : 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-300'
                    }`}
                  >
                    <span className={`col-start-1 row-start-1 whitespace-nowrap ${embedDrag ? '' : 'invisible'}`}>
                      ✓ On
                    </span>
                    <span className={`col-start-1 row-start-1 whitespace-nowrap ${embedDrag ? 'invisible' : ''}`}>
                      Off
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Live in-dialog preview at the exact copied size */}
          {(
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium px-0.5">
                <span className={isDark ? 'text-neutral-300 font-semibold' : 'text-neutral-700 font-semibold'}>
                  Live Preview — {embedMode === 'light' ? 'Light Mode Map & UI' : 'Dark Mode Map & UI'} ({activeEmbedTheme})
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-[11px] text-neutral-400">
                    {embedSize === '100%' ? '100% × 600px' : `${embedSize} × ${embedSize}px`}
                  </span>
                  <a
                    href={embedSrc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-bold underline underline-offset-2 shrink-0"
                  >
                    <span>{activeTab === 'embed' ? 'Test Embed URL' : 'Test Preview URL'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
              <div
                className={`rounded-xl overflow-hidden border shadow-inner transition-colors ${
                  embedMode === 'light' ? 'border-neutral-300 bg-slate-100' : 'border-neutral-800 bg-black'
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
                  <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    Embed in Any Website or Portfolio
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    Supports Light Mode &amp; Dark Mode out of the box via <code>?mode=light</code> or <code>?mode=dark</code> query param.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(iframeSnippet, 'iframe')}
                  className={`grid items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shadow-sm shrink-0 ${
                    isDark
                      ? 'text-neutral-950 bg-white hover:bg-neutral-200'
                      : 'text-white bg-neutral-900 hover:bg-neutral-800'
                  }`}
                >
                  <span className={`col-start-1 row-start-1 flex items-center gap-1.5 whitespace-nowrap ${copiedSection === 'iframe' ? '' : 'invisible'}`}>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied!</span>
                  </span>
                  <span className={`col-start-1 row-start-1 flex items-center gap-1.5 whitespace-nowrap ${copiedSection === 'iframe' ? 'invisible' : ''}`}>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Embed Code</span>
                  </span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-mono overflow-x-auto leading-relaxed">
                {iframeSnippet}
              </pre>
            </div>
          )}

          {/* Tab 2: React Component */}
          {activeTab === 'react' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    React / Next.js Component
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    Use directly in your React, Next.js, or Vite codebase. Pass <code>mode="light"</code> or <code>mode="dark"</code> (or hook to <code>next-themes</code>).
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(reactSnippet, 'react')}
                  className={`grid items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shadow-sm shrink-0 ${
                    isDark
                      ? 'text-neutral-950 bg-white hover:bg-neutral-200'
                      : 'text-white bg-neutral-900 hover:bg-neutral-800'
                  }`}
                >
                  <span className={`col-start-1 row-start-1 flex items-center gap-1.5 whitespace-nowrap ${copiedSection === 'react' ? '' : 'invisible'}`}>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied!</span>
                  </span>
                  <span className={`col-start-1 row-start-1 flex items-center gap-1.5 whitespace-nowrap ${copiedSection === 'react' ? 'invisible' : ''}`}>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Component Code</span>
                  </span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-mono overflow-x-auto leading-relaxed">
                {reactSnippet}
              </pre>
            </div>
          )}

        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-end shrink-0 px-6 py-3 border-t border-inherit ${
            isDark ? 'bg-neutral-900/40' : 'bg-neutral-100/60'
          }`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              isDark
                ? 'bg-white text-neutral-950 hover:bg-neutral-200'
                : 'bg-neutral-900 text-white hover:bg-neutral-800'
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
