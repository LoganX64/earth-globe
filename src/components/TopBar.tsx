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

  const borderClass = isDark ? "border-neutral-800/80" : "border-neutral-200/80";

  return (
    <div className="relative z-40 shrink-0">
      <header
        className={`relative z-40 flex items-center justify-between px-4 sm:px-6 py-2.5 border-b backdrop-blur-md transition-colors duration-300 gap-3 ${
          isDark ? "bg-neutral-950/90 text-neutral-100" : "bg-white/90 text-neutral-900"
        } ${borderClass}`}
      >
        {/* Left Section: Wordmark Brand & Search */}
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

          <div className="hidden md:block">
            <LocationSearchBar
              onSelectLocation={onSearchSelectLocation}
              onClearLocation={onDeselectLocation}
              activeMarker={activeMarker}
              isDark={isDark}
              placeholder="Search Indian city or state..."
              className="w-48 lg:w-64"
            />
          </div>
        </div>

        {/* Right Section: Controls, Map Theme Switch, Embed, & Mobile Hamburger */}
        <div className="flex items-center gap-2">
          {/* Map Theme Toggle (Sun / Moon) — switches ONLY the globe theme, never the site UI */}
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-300"
              title={
                mapThemeIsDark
                  ? "Switch Map to Light Theme (UI stays light)"
                  : "Switch Map to Dark Theme (UI stays light)"
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
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm ${
              isControlsOpen
                ? isDark
                  ? "bg-white text-neutral-950 border-white"
                  : "bg-blue-600 text-white border-blue-600 shadow-md"
                : isDark
                ? "bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 border-neutral-700"
                : "bg-white hover:bg-neutral-100 text-neutral-800 border-neutral-300"
            }`}
            title="Toggle Globe Customizer and Cartography HUD"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Menu &amp; Controls</span>
            <span className="sm:hidden">Menu</span>
            <span
              className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold min-w-[calc(3ch_+_0.5rem)] text-center inline-block ${
                isControlsOpen
                  ? isDark
                    ? "bg-neutral-950 text-white"
                    : "bg-blue-800 text-white"
                  : isDark
                  ? "bg-neutral-800 text-neutral-300"
                  : "bg-neutral-200 text-neutral-700"
              }`}
            >
              {isControlsOpen ? "ON" : "OFF"}
            </span>
          </button>

          {/* Embed & Code Modal Button */}
          <button
            onClick={onOpenCode}
            className={`hidden sm:flex px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm ${
              isDark
                ? "border-neutral-700 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 hover:text-white"
                : "border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 hover:text-neutral-950"
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
              className={`hidden md:flex px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm ${
                isDark
                  ? "border-neutral-700 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 hover:text-white"
                  : "border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 hover:text-neutral-950"
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
            className={`hidden sm:flex px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm ${
              isDark
                ? "border-neutral-700 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 hover:text-white"
                : "border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 hover:text-neutral-950"
            }`}
            title="Recenter camera on India"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Center</span>
          </button>

          {/* Mobile Navigation Drawer Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className={`lg:hidden p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDark
                ? "border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white"
                : "border-neutral-300 bg-white text-neutral-700 hover:text-neutral-950 shadow-sm"
            }`}
            title="Open quick menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile & Tablet Dropdown Drawer */}
      {isMobileMenuOpen && (
        <div
          className={`absolute top-full left-0 right-0 z-50 p-4 border-b shadow-2xl backdrop-blur-xl lg:hidden flex flex-col gap-3 ${
            isDark
              ? "bg-neutral-950/95 border-neutral-800 text-neutral-200"
              : "bg-white/95 border-neutral-200 text-neutral-900"
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
              placeholder="Search place in India..."
              className="w-full"
            />
          </div>

          {/* Quick Actions */}
          <div
            className={`grid grid-cols-2 gap-2 pt-2 border-t ${
              isDark ? "border-neutral-800" : "border-neutral-200"
            }`}
          >
            <button
              onClick={() => {
                onToggleControls();
                setIsMobileMenuOpen(false);
              }}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 cursor-pointer ${
                isDark
                  ? "bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-white"
                  : "bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-900 shadow-sm"
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
              className={`px-3 py-2 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 cursor-pointer ${
                isDark
                  ? "bg-white text-neutral-950 border-white hover:bg-neutral-200"
                  : "bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800 shadow-sm"
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
