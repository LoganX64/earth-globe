import React, { useState } from 'react';
import {
  RotateCw,
  Sun,
  Moon,
  Grid,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Globe as GlobeIcon,
  Palette,
  MapPin,
  Plus,
  Compass,
  ArrowRightLeft,
  Layers,
  Square,
  X,
} from 'lucide-react';
import {
  THEME_PRESETS,
  DARK_THEME_PRESETS,
  LIGHT_THEME_PRESETS,
  DEFAULT_DARK_THEME_ID,
  DEFAULT_LIGHT_THEME_ID,
  DEFAULT_THEME_ID,
} from './EarthGlobe/themePresets';
import { ColorPicker } from './ColorPicker';
import { GlobeMarker } from './EarthGlobe/types';
import { ALL_INDIAN_STATES, POPULAR_INDIAN_LOCATIONS } from '../data/defaultLocations';
import { LocationSearchBar } from './LocationSearchBar';

interface GlobeControlsProps {
  currentTheme: string;
  onThemeChange: (themeId: string) => void;
  lightTheme?: string;
  darkTheme?: string;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  autoRotateSpeed: number;
  onSpeedChange: (speed: number) => void;
  rotateDirection: 'west-to-east' | 'east-to-west';
  onRotateDirectionChange: (dir: 'west-to-east' | 'east-to-west') => void;
  highlightState: string | null;
  onHighlightStateChange: (stateName: string | null) => void;
  selectedLocationId: string | null;
  onSelectLocation: (marker: GlobeMarker | null) => void;
  onAddCustomLocation?: (marker: GlobeMarker) => void;
  showStateBorders: boolean;
  onToggleStateBorders: () => void;
  showGraticule: boolean;
  onToggleGraticule: () => void;
  showAtmosphere: boolean;
  onToggleAtmosphere: () => void;
  showStars: boolean;
  showBackground: boolean;
  onToggleShowBackground: () => void;
  /** null means "use the active theme's own background colour" */
  backgroundColor: string | null;
  onBackgroundColorChange: (color: string | null) => void;
  onToggleStars: () => void;
  onlyIndia?: boolean;
  onToggleOnlyIndia?: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onClose?: () => void;
  onToggleDarkMode?: () => void;
  isDark?: boolean;
  mapThemeIsDark?: boolean;
}

export const GlobeControls: React.FC<GlobeControlsProps> = ({
  currentTheme,
  onThemeChange,
  lightTheme = DEFAULT_LIGHT_THEME_ID,
  darkTheme = DEFAULT_DARK_THEME_ID,
  autoRotate,
  onToggleAutoRotate,
  autoRotateSpeed,
  onSpeedChange,
  rotateDirection,
  onRotateDirectionChange,
  highlightState,
  onHighlightStateChange,
  selectedLocationId,
  onSelectLocation,
  onAddCustomLocation,
  showStateBorders,
  onToggleStateBorders,
  showGraticule,
  onToggleGraticule,
  showAtmosphere,
  onToggleAtmosphere,
  showStars,
  showBackground,
  onToggleShowBackground,
  backgroundColor,
  onBackgroundColorChange,
  onToggleStars,
  onlyIndia = false,
  onToggleOnlyIndia,
  onZoomIn,
  onZoomOut,
  onReset,
  onClose,
  onToggleDarkMode,
  isDark = false,
  mapThemeIsDark = false,
}) => {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customCity, setCustomCity] = useState('');
  const [customState, setCustomState] = useState('Kerala');
  const [customLat, setCustomLat] = useState('10.5276');
  const [customLng, setCustomLng] = useState('76.2144');
  const [themeTab, setThemeTab] = useState<'all' | 'dark' | 'light'>('all');

  const containerClass = isDark
    ? 'bg-slate-950/78 backdrop-blur-2xl border-white/15 text-slate-100 shadow-[0_20px_60px_rgba(15,23,42,0.36)]'
    : 'bg-white/85 backdrop-blur-xl border-neutral-200 text-neutral-900 shadow-2xl';
  const buttonActive = isDark
    ? 'bg-sky-300 text-slate-950 border-sky-200 hover:bg-sky-200 border-dashed'
    : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-500 border-dashed';
  const buttonInactive = isDark
    ? 'bg-white/[0.07] hover:bg-white/[0.13] text-slate-200 hover:text-white border-white/[0.12] border-dashed'
    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-950 border-neutral-300 border-dashed';
  const subLabelClass = isDark ? 'text-slate-100 font-semibold' : 'text-neutral-900 font-semibold';
  const subTextClass = isDark ? 'text-slate-300' : 'text-neutral-500';
  const iconColorClass = isDark ? 'text-sky-300' : 'text-blue-600';
  const inputBgClass = isDark
    ? 'bg-black/20 border-white/[0.14] text-white placeholder-slate-400 focus:border-sky-300/75'
    : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-blue-500';
  const selectBgClass = isDark
    ? 'bg-black/20 border-white/[0.14] text-slate-100 focus:border-sky-300/75'
    : 'bg-white border-neutral-300 text-neutral-900 focus:border-blue-500';
  const actionLinkClass = isDark ? 'text-slate-300 hover:text-sky-200' : 'text-neutral-600 hover:text-blue-600';
  const dividerClass = isDark ? 'border-white/10' : 'border-neutral-200';
  const headerStripClass = isDark ? 'bg-white/[0.04]' : 'bg-neutral-100/70';
  const formBgClass = isDark
    ? 'bg-black/20 border-white/[0.12] text-slate-100'
    : 'bg-neutral-50 border-neutral-200 text-neutral-900';
  const tabContainerClass = isDark ? 'border-white/[0.12] bg-black/20' : 'border-neutral-300 bg-neutral-100';
  const tabInactiveClass = isDark ? 'text-slate-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900';
  const rangeClass = isDark ? 'accent-sky-300 bg-white/20' : 'accent-blue-600 bg-neutral-300';
  const badgeOffClass = isDark ? 'bg-white/[0.08] text-slate-400' : 'bg-neutral-200 text-neutral-600';
  const boundRingClass = isDark
    ? 'ring-1 ring-inset ring-sky-300/70'
    : 'ring-1 ring-inset ring-blue-500/70';

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCity.trim()) return;

    const lat = parseFloat(customLat) || 10.5276;
    const lng = parseFloat(customLng) || 76.2144;

    const newMarker: GlobeMarker = {
      id: `custom-${Date.now()}`,
      name: customCity.trim(),
      region: customState,
      country: 'India',
      lat,
      lng,
      isPrimary: true,
      description: `Custom pinned location in ${customState}, India.`,
      data: {
        state: customState,
        role: 'Custom User Location',
        coordinatesFormatted: `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`,
      },
    };

    onHighlightStateChange(customState);
    onSelectLocation(newMarker);
    onAddCustomLocation?.(newMarker);
    setShowCustomForm(false);
    setCustomCity('');
  };

  const displayedThemes =
    themeTab === 'dark'
      ? DARK_THEME_PRESETS
      : themeTab === 'light'
      ? LIGHT_THEME_PRESETS
      : Object.values(THEME_PRESETS);

  return (
    <div
      className={`rounded-lg border transition-all max-w-sm w-full max-h-[85dvh] flex flex-col overflow-hidden ${containerClass}`}
    >
      {/* Title & Quick Zoom (fixed header) */}
      <div className={`flex items-center justify-between shrink-0 px-4 pt-4 pb-3 border-b ${dividerClass} ${headerStripClass}`}>
        <div className="flex items-center gap-2">
          <GlobeIcon className={`w-4 h-4 ${iconColorClass}`} />
          <span className="text-xs font-bold uppercase tracking-[0.12em]">
            Globe Customizer
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              title={
                mapThemeIsDark
                  ? 'Switch Map to Light Theme (UI stays light)'
                  : 'Switch Map to Dark Theme (UI stays light)'
              }
              className={`p-1.5 rounded-md border text-xs cursor-pointer flex items-center justify-center ${buttonInactive}`}
            >
              {mapThemeIsDark ? (
                <Sun className="w-3.5 h-3.5" />
              ) : (
                <Moon className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          <button
            onClick={onZoomOut}
            title="Zoom Out"
            className={`p-1.5 rounded-md border text-xs cursor-pointer flex items-center justify-center ${buttonInactive}`}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onZoomIn}
            title="Zoom In"
            className={`p-1.5 rounded-md border text-xs cursor-pointer flex items-center justify-center ${buttonInactive}`}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onReset}
            title="Reset to Initial View"
            className={`p-1.5 rounded-md border text-xs cursor-pointer flex items-center justify-center ${buttonInactive}`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Close Menu & Controls"
              className={`p-1.5 rounded-md border text-xs cursor-pointer ml-1 flex items-center justify-center ${buttonInactive}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="px-4 py-4 overflow-y-auto grow space-y-4">
        {/* 1. Location Pin Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={`text-xs font-semibold flex items-center gap-1.5 ${subLabelClass}`}>
              <MapPin className={`w-3.5 h-3.5 ${iconColorClass}`} />
              <span>Target Location Pin</span>
            </label>
            <div className="flex items-center gap-2">
              {selectedLocationId && (
                <button
                  onClick={() => onSelectLocation(null)}
                  className={`text-[10px] underline cursor-pointer ${
                    actionLinkClass
                  }`}
                  title="Deselect active pin so no point appears on map"
                >
                  Deselect Pin
                </button>
              )}
              <button
                onClick={() => setShowCustomForm((prev) => !prev)}
                className={`text-[10px] flex items-center gap-1 underline cursor-pointer ${
                  actionLinkClass
                }`}
              >
                <Plus className="w-3 h-3" />
                <span className="inline-grid">
                  <span className={`col-start-1 row-start-1 whitespace-nowrap ${showCustomForm ? '' : 'invisible'}`}>
                    Cancel
                  </span>
                  <span className={`col-start-1 row-start-1 whitespace-nowrap ${showCustomForm ? 'invisible' : ''}`}>
                    Custom Pin
                  </span>
                </span>
              </button>
            </div>
          </div>

          {/* Custom Location Form */}
          {showCustomForm && (
            <form
              onSubmit={handleCustomSubmit}
              className={`p-3 mb-2 rounded-lg border space-y-2 text-xs ${formBgClass}`}
            >
              <span className="font-semibold block text-[11px]">
                Drop Pin on Any City
              </span>
              <div>
                <label className={`text-[10px] ${subLabelClass}`}>City / Place Name</label>
                <input
                  type="text"
                  placeholder="e.g. Thrissur, Calicut, Pune"
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                  required
                  className={`w-full mt-0.5 px-2 py-1 text-xs rounded border ${inputBgClass}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-[10px] ${subLabelClass}`}>State (India)</label>
                  <select
                    value={customState}
                    onChange={(e) => setCustomState(e.target.value)}
                    className={`w-full mt-0.5 px-2 py-1 text-xs rounded border cursor-pointer ${selectBgClass}`}
                  >
                    {ALL_INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`text-[10px] ${subLabelClass}`}>Lat, Lng</label>
                  <div className="flex gap-1 mt-0.5">
                    <input
                      type="text"
                      value={customLat}
                      onChange={(e) => setCustomLat(e.target.value)}
                      placeholder="Lat"
                      className={`w-1/2 px-1.5 py-1 text-xs rounded border font-mono ${inputBgClass}`}
                    />
                    <input
                      type="text"
                      value={customLng}
                      onChange={(e) => setCustomLng(e.target.value)}
                      placeholder="Lng"
                      className={`w-1/2 px-1.5 py-1 text-xs rounded border font-mono ${inputBgClass}`}
                    />
                  </div>
                </div>
              </div>
              <button
                type="submit"
                className={`w-full mt-1 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${buttonActive}`}
              >
                Pin Location
              </button>
            </form>
          )}

          {/* Search by place name */}
          <div className="mb-2.5">
            <LocationSearchBar
              onSelectLocation={(marker, stateName) => {
                if (stateName) onHighlightStateChange(stateName);
                onSelectLocation(marker);
              }}
              onClearLocation={() => onSelectLocation(null)}
              placeholder="Search place (e.g. Ulhasnagar, MH)..."
              isDark={isDark}
              variant={isDark ? 'glass' : 'default'}
              className="w-full"
            />
          </div>

          {/* Location chips with explicit None / Deselect chip */}
          <div className="grid grid-cols-3 gap-1.5 text-xs mb-2">
            <button
              onClick={() => onSelectLocation(null)}
              className={`px-2 py-1.5 rounded-md border text-center text-[11px] truncate transition-colors cursor-pointer ${
                !selectedLocationId ? buttonActive : buttonInactive
              }`}
              title="Clean map: No pin on the globe"
            >
              <span className="font-semibold block truncate">None</span>
              <span className="text-[9px] opacity-75 truncate block">No Pin</span>
            </button>
            {POPULAR_INDIAN_LOCATIONS.slice(0, 5).map((loc) => {
              const isSelected = selectedLocationId === loc.id;
              return (
                <button
                  key={loc.id}
                  onClick={() => {
                    onSelectLocation(isSelected ? null : loc);
                  }}
                  className={`px-2 py-1.5 rounded-md border text-left text-[11px] truncate transition-colors cursor-pointer ${
                    isSelected ? buttonActive : buttonInactive
                  }`}
                  title={isSelected ? `Click to deselect ${loc.name}` : `Pin ${loc.name}, ${loc.region}`}
                >
                  <span className="font-semibold block truncate">{loc.name}</span>
                  <span className="text-[9px] opacity-75 truncate block">
                    {loc.region}
                  </span>
                </button>
              );
            })}
          </div>

          {/* All Locations Dropdown */}
          <div className="space-y-1">
            <select
              value={selectedLocationId || ''}
              onChange={(e) => {
                if (!e.target.value) {
                  onSelectLocation(null);
                } else {
                  const found = POPULAR_INDIAN_LOCATIONS.find((loc) => loc.id === e.target.value);
                  if (found) {
                    onSelectLocation(found);
                  }
                }
              }}
              className={`w-full px-2.5 py-1.5 rounded-md border text-xs cursor-pointer focus:outline-none ${selectBgClass}`}
            >
              <option value="">None (No Location Pinned - Clean Map)</option>
              {POPULAR_INDIAN_LOCATIONS.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}, {loc.region} ({loc.country})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. On-Request Indian State Highlight */}
          <div className={`pt-3 border-t ${dividerClass}`}>
          <div className="flex items-center justify-between mb-2">
            <label className={`text-xs font-semibold flex items-center gap-1.5 ${subLabelClass}`}>
              <Compass className={`w-3.5 h-3.5 ${iconColorClass}`} />
              <span>State Highlight (On Request)</span>
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-semibold">
                {highlightState || 'None'}
              </span>
              {highlightState && (
                <button
                  onClick={() => onHighlightStateChange(null)}
                  className={`text-[9px] underline cursor-pointer ${
                    actionLinkClass
                  }`}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Quick state chips */}
          <div className="flex flex-wrap gap-1 mb-2">
            <button
              onClick={() => onHighlightStateChange(null)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                !highlightState ? buttonActive : buttonInactive
              }`}
            >
              None
            </button>
            {['Kerala', 'Maharashtra', 'Jammu and Kashmir', 'Karnataka', 'Gujarat'].map(
              (st) => {
                const isSelected = highlightState?.toLowerCase() === st.toLowerCase();
                return (
                  <button
                    key={st}
                    onClick={() => onHighlightStateChange(isSelected ? null : st)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                      isSelected ? buttonActive : buttonInactive
                    }`}
                    title={isSelected ? `Click to unhighlight ${st}` : `Highlight ${st}`}
                  >
                    {st === 'Jammu and Kashmir' ? 'J&K' : st}
                  </button>
                );
              }
            )}
          </div>

          {/* All States Dropdown */}
          <select
            value={highlightState || ''}
            onChange={(e) => onHighlightStateChange(e.target.value ? e.target.value : null)}
            className={`w-full px-2.5 py-1.5 rounded-md border text-xs cursor-pointer focus:outline-none ${selectBgClass}`}
          >
            <option value="">None (No State Highlighted)</option>
            {ALL_INDIAN_STATES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Speed & Rotation Controls */}
        <div className={`pt-3 border-t ${dividerClass} space-y-2.5`}>
          <div className="flex items-center justify-between">
            <label className={`text-xs font-semibold flex items-center gap-1.5 ${subLabelClass}`}>
              <RotateCw className={`w-3.5 h-3.5 ${iconColorClass}`} />
              <span>Speed &amp; Rotation</span>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  onRotateDirectionChange(
                    rotateDirection === 'west-to-east' ? 'east-to-west' : 'west-to-east'
                  )
                }
                title="Toggle Rotation Direction"
                className={`px-1.5 py-0.5 rounded border text-[10px] flex items-center gap-1 cursor-pointer ${buttonInactive}`}
              >
                <ArrowRightLeft className="w-2.5 h-2.5" />
                <span className="inline-grid">
                  <span className={`col-start-1 row-start-1 whitespace-nowrap ${rotateDirection === 'west-to-east' ? '' : 'invisible'}`}>
                    Normal
                  </span>
                  <span className={`col-start-1 row-start-1 whitespace-nowrap ${rotateDirection === 'west-to-east' ? 'invisible' : ''}`}>
                    Reverse
                  </span>
                </span>
              </button>
              <button
                onClick={onToggleAutoRotate}
                className={`px-2 py-0.5 text-[10px] rounded-md border font-medium cursor-pointer transition-colors ${
                  autoRotate ? buttonActive : buttonInactive
                }`}
              >
                <span className="inline-grid">
                  <span className={`col-start-1 row-start-1 whitespace-nowrap ${autoRotate ? '' : 'invisible'}`}>
                    Active
                  </span>
                  <span className={`col-start-1 row-start-1 whitespace-nowrap ${autoRotate ? 'invisible' : ''}`}>
                    Paused
                  </span>
                </span>
              </button>
            </div>
          </div>

          {/* Speed Slider */}
          <div className="space-y-1">
            <div className={`flex justify-between text-[10px] ${subLabelClass}`}>
              <span>Rotation Speed Multiplier</span>
              <span className="font-mono font-semibold">{autoRotateSpeed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="4.0"
              step="0.2"
              value={autoRotateSpeed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${rangeClass}`}
            />
            {/* Quick speed buttons */}
            <div className="flex justify-between gap-1 pt-1">
              {[
                { label: 'Stop', val: 0.0 },
                { label: 'Slow (0.6x)', val: 0.6 },
                { label: 'Normal (1.2x)', val: 1.2 },
                { label: 'Fast (2.5x)', val: 2.5 },
              ].map((sp) => (
                <button
                  key={sp.label}
                  onClick={() => {
                    onSpeedChange(sp.val);
                    if (sp.val === 0 && autoRotate) onToggleAutoRotate();
                    if (sp.val > 0 && !autoRotate) onToggleAutoRotate();
                  }}
                  className={`flex-1 py-1 rounded text-[9px] border cursor-pointer text-center ${
                    autoRotateSpeed === sp.val && autoRotate ? buttonActive : buttonInactive
                  }`}
                >
                  {sp.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Theme & Contrast Selection (Dark Mode & Light Mode Globe Presets) */}
          <div className={`pt-3 border-t ${dividerClass}`}>
          <div className="flex items-center justify-between mb-2">
            <label className={`text-xs font-semibold flex items-center gap-1.5 ${subLabelClass}`}>
              <Palette className={`w-3.5 h-3.5 ${iconColorClass}`} />
              <span>Theme &amp; Contrast</span>
            </label>
            <span className={`text-[10px] ${subTextClass} font-medium`}>
              {THEME_PRESETS[currentTheme]?.name.split('(')[0] || currentTheme} · Map Only
            </span>
          </div>

          {/* Theme Filter Tabs: All / Dark / Light */}
          <div className={`flex rounded-md p-0.5 border ${tabContainerClass} mb-2 text-[10px]`}>
            <button
              onClick={() => setThemeTab('all')}
              className={`flex-1 py-1 font-semibold rounded text-center cursor-pointer transition-colors ${
                themeTab === 'all' ? buttonActive : tabInactiveClass
              }`}
            >
              All ({Object.keys(THEME_PRESETS).length})
            </button>
            <button
              onClick={() => setThemeTab('dark')}
              className={`flex-1 py-1 font-semibold rounded text-center cursor-pointer transition-colors flex items-center justify-center gap-1 ${
                themeTab === 'dark' ? buttonActive : tabInactiveClass
              }`}
            >
              <Moon className="w-2.5 h-2.5" />
              <span>Dark ({DARK_THEME_PRESETS.length})</span>
            </button>
            <button
              onClick={() => setThemeTab('light')}
              className={`flex-1 py-1 font-semibold rounded text-center cursor-pointer transition-colors flex items-center justify-center gap-1 ${
                themeTab === 'light' ? buttonActive : tabInactiveClass
              }`}
            >
              <Sun className="w-2.5 h-2.5" />
              <span>Light ({LIGHT_THEME_PRESETS.length})</span>
            </button>
          </div>

          {/* Grid of theme options */}
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {displayedThemes.map((t) => {
              const isSelected = currentTheme === t.id;
              const isBound = t.id === (t.isDark ? darkTheme : lightTheme);
              const roleLabel = t.isDark ? 'Dark' : 'Light';
              return (
                <button
                  key={t.id}
                  onClick={() => onThemeChange(t.id)}
                  className={`px-2.5 py-1.5 rounded-md border text-left text-[11px] truncate transition-colors cursor-pointer flex items-center gap-2 ${
                    isSelected ? buttonActive : buttonInactive
                  } ${!isSelected && isBound ? boundRingClass : ''}`}
                  title={`${t.name} (${t.isDark ? 'Dark Mode' : 'Light Mode'})${
                    isBound ? ` — ${roleLabel} mode theme` : ''
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0 border border-black/20"
                    style={{ backgroundColor: t.highlightLand }}
                  />
                  <span className="truncate">{t.name.split('(')[0]}</span>
                  {isBound && (
                    <span className="ml-auto shrink-0 text-[8px] font-bold uppercase tracking-wide opacity-70">
                      {roleLabel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bound theme pairing — what the dark/light switchers will flip between */}
          <div className={`mt-2 text-[10px] font-medium ${subTextClass}`}>
            <span className={iconColorClass}>Dark</span> ·{' '}
            {THEME_PRESETS[darkTheme]?.name.split('(')[0] || darkTheme}
            <span className="opacity-40 mx-1">/</span>
            <span className={iconColorClass}>Light</span> ·{' '}
            {THEME_PRESETS[lightTheme]?.name.split('(')[0] || lightTheme}
          </div>
        </div>

        {/* 5. Visual Cartography Layers */}
          <div className={`pt-3 border-t ${dividerClass} space-y-2`}>
          <div className="flex items-center justify-between mb-1">
            <label className={`text-xs font-semibold flex items-center gap-1.5 ${subLabelClass}`}>
              <Layers className={`w-3.5 h-3.5 ${iconColorClass}`} />
              <span>Visual Cartography Layers</span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {/* State Borders */}
            <button
              onClick={onToggleStateBorders}
              className={`px-2.5 py-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                showStateBorders ? buttonActive : buttonInactive
              }`}
              title="Toggle India internal state borders"
            >
              <span className="font-medium text-[11px]">State Borders</span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  showStateBorders
                    ? isDark
                      ? 'bg-slate-950/45 text-slate-950'
                      : 'bg-blue-800 text-white'
                    : badgeOffClass
                }`}
              >
                {showStateBorders ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Lat/Long Grid */}
            <button
              onClick={onToggleGraticule}
              className={`px-2.5 py-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                showGraticule ? buttonActive : buttonInactive
              }`}
              title="Toggle latitude and longitude graticule mesh"
            >
              <div className="flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5" />
                <span className="font-medium text-[11px]">Lat/Lng Grid</span>
              </div>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  showGraticule
                    ? isDark
                      ? 'bg-slate-950/45 text-slate-950'
                      : 'bg-blue-800 text-white'
                    : badgeOffClass
                }`}
              >
                {showGraticule ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Atmosphere */}
            <button
              onClick={onToggleAtmosphere}
              className={`px-2.5 py-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                showAtmosphere ? buttonActive : buttonInactive
              }`}
              title="Toggle outer atmospheric corona and planetary limb glow"
            >
              <div className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5" />
                <span className="font-medium text-[11px]">Atmosphere</span>
              </div>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  showAtmosphere
                    ? isDark
                      ? 'bg-slate-950/45 text-slate-950'
                      : 'bg-blue-800 text-white'
                    : badgeOffClass
                }`}
              >
                {showAtmosphere ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Starfield */}
            <button
              onClick={onToggleStars}
              className={`px-2.5 py-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                showStars ? buttonActive : buttonInactive
              }`}
              title="Toggle deep cosmic starfield background"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="font-medium text-[11px]">Starfield</span>
              </div>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  showStars
                    ? isDark
                      ? 'bg-slate-950/45 text-slate-950'
                      : 'bg-blue-800 text-white'
                    : badgeOffClass
                }`}
              >
                {showStars ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Background — swap the theme's tinted backdrop for a neutral one.
                A custom colour is applied to the globe's canvas only, never to
                this panel or the page around it. */}
            <button
              onClick={onToggleShowBackground}
              className={`col-span-2 px-2.5 py-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                showBackground ? buttonActive : buttonInactive
              }`}
              title="Use a plain white (light themes) or black (dark themes) backdrop instead of the theme's own"
            >
              <div className="flex items-center gap-1.5">
                <Square className="w-3.5 h-3.5" />
                <span className="font-medium text-[11px]">Background</span>
              </div>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  showBackground
                    ? isDark
                      ? 'bg-slate-950/45 text-slate-950'
                      : 'bg-blue-800 text-white'
                    : badgeOffClass
                }`}
              >
                {showBackground
                  ? 'THEME'
                  : isDark
                    ? 'BLACK'
                    : 'WHITE'}
              </span>
            </button>

            {/* Custom backdrop colour, kept per polarity: what you pick under a
                dark theme is never reused by a light one. */}
            <div
              className={`col-span-2 px-2.5 py-2 rounded-lg border ${
                showBackground ? buttonInactive : 'opacity-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-medium truncate">
                  {backgroundColor ? 'Custom colour' : 'Theme colour'}
                </span>
                <span className="text-[9px] opacity-60 font-mono shrink-0">
                  {mapThemeIsDark ? 'DARK THEMES ONLY' : 'LIGHT THEMES ONLY'}
                </span>
              </div>

              <ColorPicker
                value={backgroundColor}
                themeFallback={
                  THEME_PRESETS[currentTheme]?.background ??
                  THEME_PRESETS[DEFAULT_THEME_ID].background
                }
                onChange={(hex) => onBackgroundColorChange(hex)}
                onReset={() => onBackgroundColorChange(null)}
                disabled={!showBackground}
                isDark={isDark}
                slotLabel={mapThemeIsDark ? 'dark' : 'light'}
              />
            </div>

            {/* Only India Map Toggle */}
            {onToggleOnlyIndia && (
              <button
                onClick={onToggleOnlyIndia}
                className={`col-span-2 px-2.5 py-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                  onlyIndia ? buttonActive : buttonInactive
                }`}
                title="Show only India sovereign landmass, omitting other world countries"
              >
                <div className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  <span className="font-medium text-[11px]">Only India Map (Isolated)</span>
                </div>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    onlyIndia
                    ? isDark
                      ? 'bg-slate-950/45 text-slate-950'
                      : 'bg-blue-800 text-white'
                    : badgeOffClass
                  }`}
                >
                  {onlyIndia ? 'ON (ONLY INDIA)' : 'OFF (GLOBAL)'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobeControls;
