import React, { useState } from 'react';
import { X, Copy, Check, Code, Globe, Terminal, ExternalLink } from 'lucide-react';
import { GlobeMarker } from './EarthGlobe/types';

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
  theme = 'black-and-white',
  onlyIndia = true,
  isDark = true,
}) => {
  const [activeTab, setActiveTab] = useState<'embed' | 'react' | 'vercel' | 'current'>('embed');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [embedSize, setEmbedSize] = useState<'500' | '400' | '600' | '100%'>('500');
  const [embedOnlyIndia, setEmbedOnlyIndia] = useState<boolean>(onlyIndia);
  // Viewer-facing controls — pre-selected here, baked into the exported URL / snippet
  const [embedDrag, setEmbedDrag] = useState<boolean>(true);
  const [embedZoom, setEmbedZoom] = useState<boolean>(true);
  const [embedRotate, setEmbedRotate] = useState<boolean>(autoRotate);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.vercel.app';

  const baseSrc = `${currentHost}/?embed=true${embedOnlyIndia ? '&onlyIndia=true' : ''}${
    theme !== 'black-and-white' ? `&theme=${theme}` : ''
  }${autoRotateSpeed !== 1.2 ? `&speed=${autoRotateSpeed.toFixed(1)}` : ''}&drag=${embedDrag}&zoom=${embedZoom}&rotate=${embedRotate}`;

  // Shared by both tabs — mirrors the component's current config
  const embedSrc = `${baseSrc}${activeMarker ? `&marker=${activeMarker.id}` : ''}${
    highlightState ? `&state=${encodeURIComponent(highlightState)}` : ''
  }`;

  const iframeSnippet = `<!-- Drop-in 3D India Globe for any Portfolio, Webflow, WordPress, or HTML website -->
<iframe
  src="${embedSrc}"
  width="${embedSize === '100%' ? '100%' : `${embedSize}px`}"
  height="${embedSize === '100%' ? '600px' : `${embedSize}px`}"
  style="border: none; border-radius: 16px; overflow: hidden; background: #000000;"
  loading="lazy"
  title="India 3D Interactive Map Globe"
></iframe>`;

  const reactSnippet = `${embedZoom ? `import React, { useRef } from 'react';
import { EarthGlobe, EarthGlobeRef } from './components/EarthGlobe';` : `import React from 'react';
import { EarthGlobe } from './components/EarthGlobe';`}

// Drop-in React / Next.js Component for your portfolio or website
// Pre-selected viewer controls — drag: ${embedDrag}, zoom: ${embedZoom}, rotate: ${embedRotate}
export function IndiaPortfolioGlobe({
  width = ${embedSize === '100%' ? "'100%'" : embedSize},
  height = ${embedSize === '100%' ? "'600px'" : embedSize},
}: {
  width?: number | string;
  height?: number | string;
}) {${embedZoom ? `
  const globeRef = useRef<EarthGlobeRef>(null);` : ''}

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden', borderRadius: '16px' }}>
      <EarthGlobe
${embedZoom ? `        ref={globeRef}
` : ''}        width="100%"
        height="100%"
        theme="${theme}"
        highlightCountry="356"                // Survey of India authentic boundaries
        onlyIndia={${embedOnlyIndia}}                   // ${embedOnlyIndia ? 'Shows ONLY India map (isolated clean globe)' : 'Shows world with India featured'}
        ${highlightState ? `highlightState="${highlightState}"` : `// highlightState="Kerala"            // Optionally highlight state on hover/click`}
        autoRotate={${embedRotate}}
        autoRotateSpeed={${autoRotateSpeed.toFixed(1)}}
        rotateDirection="west-to-east"
        showStateBorders={true}               // Survey of India state borders
        showGraticule={true}
        showAtmosphere={true}
        showStars={true}
        enableDrag={${embedDrag}}
        enableZoom={${embedZoom}}
        initialCenter={[${activeMarker ? activeMarker.lng.toFixed(4) : '78.9629'}, ${activeMarker ? activeMarker.lat.toFixed(4) : '20.5937'}]}
        initialZoom={${activeMarker ? '1.4' : '1.1'}}
        markers={${activeMarker ? `[
          {
            id: '${activeMarker.id}',
            name: '${activeMarker.name}',
            region: '${activeMarker.region || ''}',
            country: 'India',
            lat: ${activeMarker.lat.toFixed(4)},
            lng: ${activeMarker.lng.toFixed(4)},
            isPrimary: true,
          }
        ]` : `[] // Clean map: no pins until selected`}}
      />${embedZoom ? `
      {/* Zoom controls — ${isDark ? 'dark' : 'light'} theme */}
      <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 4, borderRadius: 12, border: '1px solid ${isDark ? '#27272a' : '#e4e4e7'}', background: '${isDark ? 'rgba(9,9,11,0.8)' : 'rgba(255,255,255,0.85)'}', backdropFilter: 'blur(8px)', boxShadow: '0 10px 25px rgba(0,0,0,0.25)' }}>
        <button
          onClick={() => globeRef.current?.setZoom((globeRef.current?.getZoom() || 1.2) * 1.25)}
          title="Zoom In"
          style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', color: '${isDark ? '#d4d4d8' : '#3f3f46'}', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
        >
          +
        </button>
        <div style={{ width: 20, height: 1, background: '${isDark ? '#27272a' : '#e4e4e7'}' }} />
        <button
          onClick={() => globeRef.current?.setZoom((globeRef.current?.getZoom() || 1.2) * 0.8)}
          title="Zoom Out"
          style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', color: '${isDark ? '#d4d4d8' : '#3f3f46'}', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
        >
          −
        </button>
      </div>` : ''}
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

# Step 3: Embed in any portfolio:
# <iframe src="https://your-project.vercel.app/?embed=true&onlyIndia=true" width="500" height="500"></iframe>`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const bgClass = isDark
    ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
    : 'bg-white border-zinc-200 text-zinc-900';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className={`w-full max-w-3xl h-[760px] max-h-[88vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${bgClass}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 px-6 py-4 border-b border-inherit">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-white" />
            <div>
              <h3 className="text-base font-bold">Embed &amp; Component Integration</h3>
              <p className="text-xs text-zinc-400">Zero backend needed · 100% Free Tier Vercel compatible</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
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
                ? 'bg-zinc-900 text-white border-t border-x border-zinc-700'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Website / Portfolio (iFrame)</span>
          </button>
          <button
            onClick={() => setActiveTab('react')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer flex-1 min-w-0 justify-center whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'react'
                ? 'bg-zinc-900 text-white border-t border-x border-zinc-700'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">React / Next.js Component</span>
          </button>
          <button
            onClick={() => setActiveTab('vercel')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer flex-1 min-w-0 justify-center whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'vercel'
                ? 'bg-zinc-900 text-white border-t border-x border-zinc-700'
                : 'text-zinc-400 hover:text-white'
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
          {/* Quick Customizer Bar for Embed & Component (not relevant to Vercel guide) */}
          {activeTab !== 'vercel' && (
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 font-medium">Map Isolation:</span>
                <button
                  onClick={() => setEmbedOnlyIndia((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-md border font-medium cursor-pointer transition-all min-w-[172px] text-center ${
                    embedOnlyIndia
                      ? 'bg-white text-zinc-950 border-white'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                  }`}
                >
                  {embedOnlyIndia ? '✓ Only India Map' : 'Global (India Featured)'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-zinc-400 font-medium">Size:</span>
                {(['400', '500', '600', '100%'] as const).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setEmbedSize(sz)}
                    className={`px-2 py-0.5 rounded border text-[11px] font-mono cursor-pointer transition-all min-w-[84px] text-center ${
                      embedSize === sz
                        ? 'bg-white text-zinc-950 font-bold border-white'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {sz === '100%' ? 'Responsive' : `${sz}px`}
                  </button>
                ))}
              </div>

              <a
                href={embedSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-zinc-300 hover:text-white underline underline-offset-2 ml-auto"
              >
                <span>{activeTab === 'embed' ? 'Test Embed URL' : 'Test Preview URL'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 font-medium">Rotation:</span>
                <button
                  onClick={() => setEmbedRotate((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-md border font-medium cursor-pointer transition-all min-w-[92px] text-center ${
                    embedRotate
                      ? 'bg-white text-zinc-950 border-white'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                  }`}
                >
                  {embedRotate ? '✓ Rotating' : 'Frozen'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-zinc-400 font-medium">Drag:</span>
                <button
                  onClick={() => setEmbedDrag((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-md border font-medium cursor-pointer transition-all min-w-[64px] text-center ${
                    embedDrag
                      ? 'bg-white text-zinc-950 border-white'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                  }`}
                >
                  {embedDrag ? '✓ On' : 'Off'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-zinc-400 font-medium">Zoom:</span>
                <button
                  onClick={() => setEmbedZoom((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-md border font-medium cursor-pointer transition-all min-w-[104px] text-center ${
                    embedZoom
                      ? 'bg-white text-zinc-950 border-white'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                  }`}
                >
                  {embedZoom ? '✓ Scroll + ±' : 'Off'}
                </button>
              </div>
            </div>
          </div>
          )}

          {/* Live in-dialog preview at the exact copied size (tabs 1 & 2) */}
          {activeTab !== 'vercel' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
              <span>Live Preview — embed at actual size</span>
              <span className="font-mono">
                {embedSize === '100%' ? '100% × 600px' : `${embedSize} × ${embedSize}px`}
              </span>
            </div>
            <div
              className="rounded-xl overflow-hidden border border-zinc-800 bg-black shadow-inner"
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
                  <h4 className="font-semibold text-white">Embed in Any Website or Portfolio</h4>
                  <p className="text-xs text-zinc-400">
                    Works anywhere: Webflow, WordPress, HTML, Astro, Framer, or GitHub Pages. Viewers only get the controls you pre-select above — no menus, no settings.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(iframeSnippet, 'iframe')}
                  className="flex items-center gap-1.5 text-xs text-zinc-950 bg-white hover:bg-zinc-200 font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shadow-sm shrink-0"
                >
                  {copiedSection === 'iframe' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
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

              <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-300 space-y-1">
                <span className="font-semibold text-white">Supported Query Parameters:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-zinc-400 font-mono text-[11px]">
                  <li><code>?embed=true</code> - Shows ONLY the 3D map canvas (no navbar, no menus, no settings)</li>
                  <li><code>?onlyIndia=true</code> - Shows ONLY the sovereign Indian territory on the globe</li>
                  <li><code>?drag=false</code> - Disable globe dragging (default: enabled)</li>
                  <li><code>?zoom=false</code> - Disable scroll + <code>±</code> zoom buttons (default: enabled)</li>
                  <li><code>?rotate=false</code> - Freeze rotation (default: enabled)</li>
                  <li><code>?width=500&amp;height=500</code> or <code>?size=400</code> - Custom dimensions</li>
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
                  <h4 className="font-semibold text-white">React / Next.js Component</h4>
                  <p className="text-xs text-zinc-400">
                    Use directly in your React, Next.js, or Vite codebase with customizable width, height, and onlyIndia props.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(reactSnippet, 'react')}
                  className="flex items-center gap-1.5 text-xs text-zinc-950 bg-white hover:bg-zinc-200 font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shadow-sm shrink-0"
                >
                  {copiedSection === 'react' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
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
                  <h4 className="font-semibold text-white">Deploy on Vercel Free Tier (100% Free)</h4>
                  <p className="text-xs text-zinc-400">
                    Does this React app need a backend? <strong>No backend is needed.</strong>
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(vercelGuide, 'vercel')}
                  className="flex items-center gap-1.5 text-xs text-zinc-950 bg-white hover:bg-zinc-200 font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shadow-sm shrink-0"
                >
                  {copiedSection === 'vercel' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
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

              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3 text-xs text-zinc-300">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-white bg-zinc-800 px-1.5 py-0.5 rounded">1</span>
                  <div>
                    <strong className="text-white">Pure Client-Side React SPA:</strong>
                    <p className="text-zinc-400">
                      All 3D math, canvas rendering, D3 orthographic projections, and Survey of India boundary GeoJSON are bundled client-side. Zero server resources are consumed.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="font-bold text-white bg-zinc-800 px-1.5 py-0.5 rounded">2</span>
                  <div>
                    <strong className="text-white">Vercel Build Configuration:</strong>
                    <p className="text-zinc-400">
                      Framework Preset: <code>Vite</code> | Build Command: <code>npm run build</code> | Output: <code>dist</code>. Vercel automatically detects this and deploys in &lt; 30 seconds.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="font-bold text-white bg-zinc-800 px-1.5 py-0.5 rounded">3</span>
                  <div>
                    <strong className="text-white">Single-Page App Routing:</strong>
                    <p className="text-zinc-400">
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
        <div className="flex items-center justify-between shrink-0 px-6 py-3 border-t border-inherit bg-zinc-900/40">
          <span className="text-xs text-zinc-400">
            Survey of India compliant · Official borders including J&amp;K and Ladakh
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodeExportModal;
