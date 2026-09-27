import React, { useState } from "react";
import {
  Navigation,
  Code2,
  Maximize2,
  SlidersHorizontal,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react";
import { GlobeMarker } from "./EarthGlobe/types";
import { LocationSearchBar } from "./LocationSearchBar";

interface TopBarProps {
  activeMarker: GlobeMarker | null;
  onFocusActiveLocation: () => void;
  onDeselectLocation: () => void;
  onSearchSelectLocation: (marker: GlobeMarker, stateName?: string) => void;
  onOpenCode: () => void;
  onToggleControls: () => void;
  isControlsOpen: boolean;
  onToggleEmbedMode?: () => void;
  onToggleDarkMode?: () => void;
  isDark?: boolean;
  mapThemeIsDark?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeMarker,
  onFocusActiveLocation,
  onDeselectLocation,
  onSearchSelectLocation,
  onOpenCode,
  onToggleControls,
  isControlsOpen,
  onToggleEmbedMode,
  onToggleDarkMode,
  isDark = false,
  mapThemeIsDark = false,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Dark mode: identical glass tokens to the location/customizer dialogs.
  // The dialog bg (bg-slate-950/78) only reads as the dialogs' near-black
  // because they float over the dark map; the wrapper below the header
  // supplies the same dark backing instead of the white page.
  const glassSecondary =
    "rounded-md border bg-white/[0.07] hover:bg-white/[0.13] text-slate-200 hover:text-white border-white/[0.12]";
  const glassPrimary =
    "rounded-md border bg-sky-300 text-slate-950 hover:bg-sky-200 border-sky-200 shadow-[0_4px_14px_rgba(56,189,248,0.28)]";

  return (
    <div className={`relative z-40 shrink-0 ${isDark ? "bg-slate-950" : ""}`}>
      <header
        className={`relative z-40 flex items-center justify-between px-4 sm:px-6 py-2.5 border-b transition-colors duration-300 gap-3 ${
          isDark
            ? "border-white/15 bg-slate-950/78 text-slate-100 backdrop-blur-2xl shadow-[0_10px_40px_rgba(15,23,42,0.22)]"
            : "border-neutral-200/80 bg-gradient-to-b from-white/70 to-white/40 text-neutral-900 backdrop-blur-xl"
        }`}
      >
        {/* Left Section: Wordmark Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm sm:text-base font-extrabold tracking-tight whitespace-nowrap ${
                isDark ? "text-white" : "text-neutral-900"
              }`}
            >
              BHARAT // ATLAS
            </span>
          </div>
        </div>

        {/* Right Section: Search, Controls, Map Theme Switch, Embed, & Mobile Hamburger */}
        <div className="flex items-center gap-2">
          {/* Map Theme Toggle (Sun / Moon) — switches ONLY the globe theme, never the site UI */}
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                isDark
                  ? glassSecondary
                  : "rounded-lg border border-dashed bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-300"
              }`}
              title={
                mapThemeIsDark
                  ? "Switch Map to Light Theme"
                  : "Switch Map to Dark Theme"
              }
            >
              {mapThemeIsDark ? (
                <Sun className="w-4 h-4 shrink-0" />
              ) : (
                <Moon className="w-4 h-4 shrink-0" />
              )}
              <span className="hidden sm:inline-grid">
                <span className={`col-start-1 row-start-1 whitespace-nowrap ${mapThemeIsDark ? '' : 'invisible'}`}>
                  Light Map
                </span>
                <span className={`col-start-1 row-start-1 whitespace-nowrap ${mapThemeIsDark ? 'invisible' : ''}`}>
                  Dark Map
                </span>
              </span>
            </button>
          )}

          {/* Controls HUD Toggle Button */}
          <button
            onClick={onToggleControls}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              isControlsOpen
                ? isDark
                  ? glassPrimary
                  : "rounded-lg border border-dashed bg-blue-600 text-white border-blue-600"
                : isDark
                ? glassSecondary
                : "rounded-lg border border-dashed bg-white hover:bg-neutral-100 text-neutral-800 border-neutral-300"
            }`}
            title="Toggle Globe Customizer and Cartography HUD"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Menu &amp; Controls</span>
            <span className="sm:hidden">Menu</span>
            <span
              className={`text-[9px] px-1 py-0.5 leading-none rounded font-mono font-bold min-w-[calc(3ch_+_0.5rem)] text-center inline-block ${
                isControlsOpen
                  ? isDark
                    ? "bg-slate-950/45 text-slate-950"
                    : "bg-blue-800 text-white"
                  : isDark
                  ? "bg-white/[0.08] text-slate-400"
                  : "bg-neutral-200 text-neutral-700"
              }`}
            >
              {isControlsOpen ? "ON" : "OFF"}
            </span>
          </button>

          {/* Embed & Code Modal Button */}
          <button
            onClick={onOpenCode}
            className={`hidden sm:flex px-2.5 py-1.5 text-xs font-medium transition-colors items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              isDark
                ? glassSecondary
                : "rounded-lg border border-dashed border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 hover:text-neutral-950"
            }`}
            title="Embed code, Vercel free tier guide, & React component"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Embed &amp; API</span>
          </button>

          {/* Pure View Toggle Button */}
          {onToggleEmbedMode && (
            <button
              onClick={onToggleEmbedMode}
              className={`hidden md:flex px-2.5 py-1.5 text-xs font-medium transition-colors items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                isDark
                  ? glassSecondary
                  : "rounded-lg border border-dashed border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 hover:text-neutral-950"
              }`}
              title="Preview pure isolated component view (without app chrome)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Pure View</span>
            </button>
          )}

          {/* Recenter India */}
          <button
            onClick={onFocusActiveLocation}
            className={`hidden sm:flex px-2.5 py-1.5 text-xs font-medium transition-colors items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              isDark
                ? glassSecondary
                : "rounded-lg border border-dashed border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 hover:text-neutral-950"
            }`}
            title="Recenter camera on India"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Center</span>
          </button>

          {/* Mobile Navigation Drawer Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className={`lg:hidden p-1.5 transition-colors cursor-pointer flex items-center justify-center ${
              isDark
                ? glassSecondary
                : "rounded-lg border border-dashed border-neutral-300 bg-white text-neutral-700 hover:text-neutral-950"
            }`}
            title="Open quick menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </button>

          {/* Search (right-aligned) */}
          <div className="hidden md:block">
            <LocationSearchBar
              onSelectLocation={onSearchSelectLocation}
              onClearLocation={onDeselectLocation}
              activeMarker={activeMarker}
              isDark={isDark}
              variant={isDark ? "glass" : "default"}
              placeholder="Search Indian city or state..."
              className="w-48 lg:w-64"
            />
          </div>
        </div>
      </header>

      {/* Mobile & Tablet Dropdown Drawer */}
      {isMobileMenuOpen && (
        <div
          className={`absolute top-full left-0 right-0 z-50 p-4 border-b shadow-2xl lg:hidden flex flex-col gap-3 ${
            isDark
              ? "border-white/15 bg-slate-950/78 text-slate-100 backdrop-blur-2xl"
              : "border-neutral-200 bg-white/95 text-neutral-900 backdrop-blur-xl"
          }`}
        >
          {/* Mobile Search */}
          <div className="w-full">
            <LocationSearchBar
              onSelectLocation={(m, s) => {
                onSearchSelectLocation(m, s);
                setIsMobileMenuOpen(false);
              }}
              onClearLocation={onDeselectLocation}
              activeMarker={activeMarker}
              isDark={isDark}
              variant={isDark ? "glass" : "default"}
              placeholder="Search place in India..."
              className="w-full"
            />
          </div>

          {/* Quick Actions */}
          <div
            className={`grid grid-cols-2 gap-2 pt-2 border-t ${
              isDark ? "border-white/10" : "border-neutral-200"
            }`}
          >
            <button
              onClick={() => {
                onToggleControls();
                setIsMobileMenuOpen(false);
              }}
              className={`px-3 py-2 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                isDark
                  ? glassSecondary
                  : "rounded-lg border border-dashed bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-900"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>
                {isControlsOpen ? "Hide Customizer" : "Show Customizer"}
              </span>
            </button>
            <button
              onClick={() => {
                onOpenCode();
                setIsMobileMenuOpen(false);
              }}
              className={`px-3 py-2 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                isDark
                  ? glassPrimary
                  : "rounded-lg border border-dashed bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Embed &amp; API</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopBar;
