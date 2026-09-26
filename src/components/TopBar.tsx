import React, { useState } from "react";
import {
  Navigation,
  Code2,
  Maximize2,
  SlidersHorizontal,
  Menu,
  X,
  Compass,
  MapPin,
  Layers,
} from "lucide-react";
import { GlobeMarker } from "./EarthGlobe/types";
import { LocationSearchBar } from "./LocationSearchBar";

interface TopBarProps {
  activeLocationName: string | null;
  activeMarker: GlobeMarker | null;
  onFocusActiveLocation: () => void;
  onDeselectLocation: () => void;
  onSearchSelectLocation: (marker: GlobeMarker, stateName?: string) => void;
  onOpenCode: () => void;
  onToggleControls: () => void;
  isControlsOpen: boolean;
  onToggleEmbedMode?: () => void;
  isDark?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeLocationName,
  activeMarker,
  onFocusActiveLocation,
  onDeselectLocation,
  onSearchSelectLocation,
  onOpenCode,
  onToggleControls,
  isControlsOpen,
  onToggleEmbedMode,
  isDark = true,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const borderClass = isDark ? "border-zinc-800" : "border-zinc-200";

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 sm:px-6 py-2.5 border-b backdrop-blur-md transition-colors gap-3 ${
          isDark ? "bg-zinc-950/90" : "bg-white/90"
        } ${borderClass}`}
      >
        {/* Left Section: Wordmark Brand & Search */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-white whitespace-nowrap">
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

        {/* Right Section: Controls, Embed, & Mobile Hamburger */}
        <div className="flex items-center gap-2">
          {/* Controls HUD Toggle Button - ALWAYS VISIBLE */}
          <button
            onClick={onToggleControls}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
              isControlsOpen
                ? "bg-white text-zinc-950 border-white font-bold"
                : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border-zinc-700"
            }`}
            title="Toggle Globe Customizer and Cartography HUD"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Menu &amp; Controls</span>
            <span className="sm:hidden">Menu</span>
            <span
              className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
                isControlsOpen
                  ? "bg-zinc-950 text-white"
                  : "bg-zinc-700 text-zinc-300"
              }`}
            >
              {isControlsOpen ? "ON" : "OFF"}
            </span>
          </button>

          {/* Embed & Code Modal Button */}
          <button
            onClick={onOpenCode}
            className="hidden sm:flex px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors items-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="Embed code, Vercel free tier guide, & React component"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Embed &amp; API</span>
          </button>

          {/* Pure View Toggle Button */}
          {onToggleEmbedMode && (
            <button
              onClick={onToggleEmbedMode}
              className="hidden md:flex px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Preview pure isolated component view (without app chrome)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Pure View</span>
            </button>
          )}

          {/* Center India / Active Location Pin */}
          {activeLocationName ? (
            <div className="flex items-center gap-1">
              <button
                onClick={onFocusActiveLocation}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span className="truncate max-w-25 sm:max-w-30">
                  {activeLocationName}
                </span>
              </button>
              <button
                onClick={onDeselectLocation}
                className="px-2 py-1.5 text-xs font-medium rounded-lg border border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Deselect active pin"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={onFocusActiveLocation}
              className="hidden sm:flex px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm"
              title="Recenter camera on India"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Center</span>
            </button>
          )}

          {/* Mobile Navigation Drawer Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="lg:hidden p-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white transition-colors cursor-pointer"
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
          className={`fixed top-12 left-0 right-0 z-30 p-4 border-b shadow-2xl backdrop-blur-xl lg:hidden flex flex-col gap-3 ${
            isDark
              ? "bg-zinc-950/95 border-zinc-800 text-zinc-200"
              : "bg-white/95 border-zinc-200 text-zinc-900"
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
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
            <button
              onClick={() => {
                onToggleControls();
                setIsMobileMenuOpen(false);
              }}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 flex items-center justify-center gap-1.5 cursor-pointer text-white"
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
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Embed &amp; API</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default TopBar;
