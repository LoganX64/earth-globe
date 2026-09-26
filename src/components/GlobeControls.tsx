import React, { useState } from 'react';
import {
  RotateCw,
  Sun,
  Grid,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Globe as GlobeIcon,
  Palette,
  MapPin,
  SlidersHorizontal,
  ChevronDown,
  Plus,
  Compass,
  ArrowRightLeft,
  Layers,
  X,
} from 'lucide-react';
import { THEME_PRESETS } from './EarthGlobe/themePresets';
import { GlobeMarker } from './EarthGlobe/types';
import { ALL_INDIAN_STATES, POPULAR_INDIAN_LOCATIONS } from '../data/defaultLocations';
import { LocationSearchBar } from './LocationSearchBar';

interface GlobeControlsProps {
  currentTheme: string;
  onThemeChange: (themeId: string) => void;
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
  onToggleStars: () => void;
  onlyIndia?: boolean;
  onToggleOnlyIndia?: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFlyToPreset: (name: string, lat: number, lng: number, zoom?: number) => void;
  onClose?: () => void;
  isDark?: boolean;
}

export const GlobeControls: React.FC<GlobeControlsProps> = ({
  currentTheme,
  onThemeChange,
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
  onToggleStars,
  onlyIndia = false,
  onToggleOnlyIndia,
  onZoomIn,
  onZoomOut,
  onReset,
  onFlyToPreset,
  onClose,
  isDark = true,
}) => {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customCity, setCustomCity] = useState('');
  const [customState, setCustomState] = useState('Kerala');
  const [customLat, setCustomLat] = useState('10.5276');
  const [customLng, setCustomLng] = useState('76.2144');

  const containerClass = isDark
    ? 'bg-zinc-950/90 backdrop-blur-md border-zinc-800 text-zinc-200'
    : 'bg-white/90 backdrop-blur-md border-zinc-200 text-zinc-900';

  const buttonActive = isDark
    ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
    : 'bg-zinc-900 text-white font-semibold shadow-sm';

  const buttonInactive = isDark
    ? 'bg-zinc-900/70 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'
    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 border-zinc-300';

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

  return (
    <div
      className={`rounded-xl border p-4 shadow-2xl transition-all max-w-sm w-full space-y-4 max-h-[85vh] overflow-y-auto ${containerClass}`}
    >
      {/* Title & Quick Zoom */}
      <div className="flex items-center justify-between pb-2 border-b border-inherit">
        <div className="flex items-center gap-2">
          <GlobeIcon className="w-4 h-4 text-inherit" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Globe Customizer
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onZoomOut}
            title="Zoom Out"
            className={`p-1.5 rounded-md border text-xs cursor-pointer ${buttonInactive}`}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onZoomIn}
            title="Zoom In"
            className={`p-1.5 rounded-md border text-xs cursor-pointer ${buttonInactive}`}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onReset}
            title="Reset to Initial View"
            className={`p-1.5 rounded-md border text-xs cursor-pointer ${buttonInactive}`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Close Menu & Controls"
              className={`p-1.5 rounded-md border text-xs cursor-pointer ml-1 ${buttonInactive} hover:text-white`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 1. Location Pin Selector (Select or Deselect Pins on the Globe) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold flex items-center gap-1.5 text-zinc-400">
            <MapPin className="w-3.5 h-3.5 text-white" />
            <span>Target Location Pin</span>
          </label>
          <div className="flex items-center gap-2">
            {selectedLocationId && (
              <button
                onClick={() => onSelectLocation(null)}
                className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                title="Deselect active pin so no point appears on map"
              >
                Deselect Pin
              </button>
            )}
            <button
              onClick={() => setShowCustomForm((prev) => !prev)}
              className="text-[10px] text-zinc-300 hover:text-white flex items-center gap-1 underline cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>{showCustomForm ? 'Cancel' : 'Custom Pin'}</span>
            </button>
          </div>
        </div>

        {/* Custom Location Form */}
        {showCustomForm && (
          <form
            onSubmit={handleCustomSubmit}
            className="p-3 mb-2 rounded-lg bg-zinc-900 border border-zinc-700/80 space-y-2 text-xs"
          >
            <span className="font-semibold text-white block text-[11px]">
              Drop Pin on Any City
            </span>
            <div>
              <label className="text-[10px] text-zinc-400">City / Place Name</label>
              <input
                type="text"
                placeholder="e.g. Thrissur, Calicut, Pune"
                value={customCity}
                onChange={(e) => setCustomCity(e.target.value)}
                required
                className="w-full mt-0.5 px-2 py-1 text-xs rounded bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-zinc-400">State (India)</label>
                <select
                  value={customState}
                  onChange={(e) => setCustomState(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 text-xs rounded bg-zinc-950 border border-zinc-700 text-white cursor-pointer"
                >
                  {ALL_INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-400">Lat, Lng</label>
                <div className="flex gap-1 mt-0.5">
                  <input
                    type="text"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    placeholder="Lat"
                    className="w-1/2 px-1.5 py-1 text-[11px] rounded bg-zinc-950 border border-zinc-700 text-white font-mono"
                  />
                  <input
                    type="text"
                    value={customLng}
                    onChange={(e) => setCustomLng(e.target.value)}
                    placeholder="Lng"
                    className="w-1/2 px-1.5 py-1 text-[11px] rounded bg-zinc-950 border border-zinc-700 text-white font-mono"
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              className="w-full mt-1 py-1.5 text-xs font-semibold rounded bg-white text-zinc-950 hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              Pin Location
            </button>
          </form>
        )}

        {/* Search by place name (e.g. Ulhasnagar, Thrissur, etc.) */}
        <div className="mb-2.5">
          <LocationSearchBar
            onSelectLocation={(marker, stateName) => {
              if (stateName) onHighlightStateChange(stateName);
              onSelectLocation(marker);
            }}
            onClearLocation={() => onSelectLocation(null)}
            placeholder="Search place (e.g. Ulhasnagar, MH)..."
            isDark={isDark}
            className="w-full"
          />
        </div>

        {/* Location chips with explicit None / Deselect chip */}
        <div className="grid grid-cols-3 gap-1.5 text-xs mb-2">
          <button
            onClick={() => onSelectLocation(null)}
            className={`px-2 py-1.5 rounded-md border text-center text-[11px] truncate transition-all cursor-pointer ${
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
                  // Toggle: if already selected, deselect it; otherwise select it!
                  onSelectLocation(isSelected ? null : loc);
                }}
                className={`px-2 py-1.5 rounded-md border text-left text-[11px] truncate transition-all cursor-pointer ${
                  isSelected ? buttonActive : buttonInactive
                }`}
                title={isSelected ? `Click to deselect ${loc.name} (removes pin)` : `Pin ${loc.name}, ${loc.region}`}
              >
                <span className="font-semibold block truncate">{loc.name}</span>
                <span className="text-[9px] opacity-75 truncate block">
                  {loc.region}
                </span>
              </button>
            );
          })}
        </div>

        {/* All Locations Dropdown for choosing any location or None */}
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
            className="w-full px-2.5 py-1.5 rounded-md border border-zinc-700 bg-zinc-900/90 text-zinc-200 text-xs cursor-pointer focus:outline-none focus:border-white"
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
      <div className="pt-2 border-t border-inherit">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold flex items-center gap-1.5 text-zinc-400">
            <Compass className="w-3.5 h-3.5 text-white" />
            <span>State Highlight (On Request)</span>
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-300 font-mono font-semibold">
              {highlightState || 'None'}
            </span>
            {highlightState && (
              <button
                onClick={() => onHighlightStateChange(null)}
                className="text-[9px] text-zinc-400 hover:text-white underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Quick on-request state chips */}
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
              const isSelected =
                highlightState?.toLowerCase() === st.toLowerCase();
              return (
                <button
                  key={st}
                  onClick={() => onHighlightStateChange(isSelected ? null : st)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                    isSelected ? buttonActive : buttonInactive
                  }`}
                  title={isSelected ? `Click to unhighlight ${st}` : `Highlight ${st} on request`}
                >
                  {st === 'Jammu and Kashmir' ? 'J&K' : st}
                </button>
              );
            }
          )}
        </div>

        {/* All States Dropdown with explicit 'None' */}
        <select
          value={highlightState || ''}
          onChange={(e) => onHighlightStateChange(e.target.value ? e.target.value : null)}
          className="w-full px-2.5 py-1.5 rounded-md border border-zinc-700 bg-zinc-900/90 text-zinc-200 text-xs cursor-pointer focus:outline-none focus:border-white"
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
      <div className="pt-2 border-t border-inherit space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
            <RotateCw className="w-3.5 h-3.5 text-white" />
            <span>Speed &amp; Rotation</span>
          </label>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                onRotateDirectionChange(
                  rotateDirection === 'west-to-east'
                    ? 'east-to-west'
                    : 'west-to-east'
                )
              }
              title="Toggle Rotation Direction"
              className={`px-1.5 py-0.5 rounded border text-[9px] flex items-center gap-1 cursor-pointer ${buttonInactive}`}
            >
              <ArrowRightLeft className="w-2.5 h-2.5" />
              <span>{rotateDirection === 'west-to-east' ? 'Normal' : 'Reverse'}</span>
            </button>
            <button
              onClick={onToggleAutoRotate}
              className={`px-2 py-0.5 text-[10px] rounded-md border font-medium cursor-pointer transition-colors ${
                autoRotate ? buttonActive : buttonInactive
              }`}
            >
              {autoRotate ? 'Active' : 'Paused'}
            </button>
          </div>
        </div>

        {/* Speed Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-zinc-400">
            <span>Rotation Speed Multiplier</span>
            <span className="font-mono text-zinc-200 font-semibold">
              {autoRotateSpeed.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min="0.0"
            max="4.0"
            step="0.2"
            value={autoRotateSpeed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="w-full accent-white h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
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
                  autoRotateSpeed === sp.val && autoRotate
                    ? buttonActive
                    : buttonInactive
                }`}
              >
                {sp.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Theme & Contrast Selection */}
      <div className="pt-2 border-t border-inherit">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold flex items-center gap-1.5 text-zinc-400">
            <Palette className="w-3.5 h-3.5 text-white" />
            <span>Theme &amp; Contrast</span>
          </label>
          <span className="text-[10px] text-zinc-500">
            {THEME_PRESETS[currentTheme]?.name.split('(')[0] || currentTheme}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-xs">
          {Object.entries(THEME_PRESETS).map(([id, t]) => {
            const isSelected = currentTheme === id;
            return (
              <button
                key={id}
                onClick={() => onThemeChange(id)}
                className={`px-2.5 py-1.5 rounded-md border text-left text-[11px] truncate transition-all cursor-pointer flex items-center gap-2 ${
                  isSelected ? buttonActive : buttonInactive
                }`}
                title={t.name}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                  style={{ backgroundColor: t.highlightLand }}
                />
                <span className="truncate">{t.name.split('(')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Visual Cartography Layers */}
      <div className="pt-2 border-t border-inherit space-y-2">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-white" />
            <span>Visual Cartography Layers</span>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {/* State Borders */}
          <button
            onClick={onToggleStateBorders}
            className={`px-2.5 py-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
              showStateBorders ? buttonActive : buttonInactive
            }`}
            title="Toggle India internal state borders"
          >
            <span className="font-medium text-[11px]">State Borders</span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                showStateBorders
                  ? isDark
                    ? 'bg-zinc-900 text-zinc-100'
                    : 'bg-zinc-100 text-zinc-900'
                  : 'bg-zinc-800/80 text-zinc-500'
              }`}
            >
              {showStateBorders ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Lat/Long Grid */}
          <button
            onClick={onToggleGraticule}
            className={`px-2.5 py-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
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
                    ? 'bg-zinc-900 text-zinc-100'
                    : 'bg-zinc-100 text-zinc-900'
                  : 'bg-zinc-800/80 text-zinc-500'
              }`}
            >
              {showGraticule ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Atmosphere */}
          <button
            onClick={onToggleAtmosphere}
            className={`px-2.5 py-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
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
                    ? 'bg-zinc-900 text-zinc-100'
                    : 'bg-zinc-100 text-zinc-900'
                  : 'bg-zinc-800/80 text-zinc-500'
              }`}
            >
              {showAtmosphere ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Starfield */}
          <button
            onClick={onToggleStars}
            className={`px-2.5 py-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
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
                    ? 'bg-zinc-900 text-zinc-100'
                    : 'bg-zinc-100 text-zinc-900'
                  : 'bg-zinc-800/80 text-zinc-500'
              }`}
            >
              {showStars ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Only India Map Toggle */}
          {onToggleOnlyIndia && (
            <button
              onClick={onToggleOnlyIndia}
              className={`col-span-2 px-2.5 py-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
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
                      ? 'bg-zinc-900 text-zinc-100'
                      : 'bg-zinc-100 text-zinc-900'
                    : 'bg-zinc-800/80 text-zinc-500'
                }`}
              >
                {onlyIndia ? 'ON (ONLY INDIA)' : 'OFF (GLOBAL)'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobeControls;
