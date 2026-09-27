import React, { useState, useEffect } from "react";
import { GlobeMarker } from "./EarthGlobe/types";
import {
  Navigation,
  Compass,
  Clock,
  MapPin,
  Building2,
  Copy,
  Check,
  Maximize2,
  Sparkles,
  X,
} from "lucide-react";

interface LocationDetailsCardProps {
  marker: GlobeMarker;
  onFlyTo: (lat: number, lng: number, zoom?: number) => void;
  onDeselect?: () => void;
  isStateHighlighted?: boolean;
  onToggleStateHighlight?: () => void;
  isDark?: boolean;
}

export const LocationDetailsCard: React.FC<LocationDetailsCardProps> = ({
  marker,
  onFlyTo,
  onDeselect,
  isStateHighlighted = false,
  onToggleStateHighlight,
  isDark = false,
}) => {
  const [istTime, setIstTime] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  // Live IST (Indian Standard Time) Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const istString = now.toLocaleTimeString("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      setIstTime(istString);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const copyCoords = () => {
    navigator.clipboard.writeText(
      `${marker.lat.toFixed(4)}, ${marker.lng.toFixed(4)}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const bgClass = isDark
    ? "bg-zinc-950/90 backdrop-blur-md border-zinc-800 text-zinc-100"
    : "bg-white/95 backdrop-blur-md border-zinc-200 text-zinc-900 shadow-2xl";

  const subTextClass = isDark ? "text-zinc-400" : "text-zinc-600";
  const dividerClass = isDark ? "border-zinc-800/80" : "border-zinc-200/80";

  return (
    <div
      className={`rounded-xl border p-5 shadow-2xl transition-all duration-300 max-w-sm w-full ${bgClass}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-inherit">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
            <span
              className={`inline-block w-2 h-2 rounded-full animate-pulse ${
                isDark ? "bg-white" : "bg-zinc-900"
              }`}
            />
            <span>Active Location Pin</span>
            <span aria-hidden="true">·</span>
            <span>{marker.region || "India"}</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight mt-1 text-inherit">
            {marker.name}
          </h2>
          <div className={`text-xs mt-0.5 ${subTextClass}`}>
            <span>{marker.region || "State"}</span>
            <span aria-hidden="true" className="mx-1.5">
              ·
            </span>
            <span>{marker.country || "India"}</span>
            {marker.data?.role && (
              <>
                <span aria-hidden="true" className="mx-1.5">
                  ·
                </span>
                <span className="truncate max-w-30 inline-block align-bottom">
                  {marker.data.role}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onFlyTo(marker.lat, marker.lng, 2.0)}
            title={`Fly to ${marker.name}`}
            className={`p-2 rounded-lg transition-colors border flex items-center justify-center cursor-pointer ${
              isDark
                ? "bg-zinc-800/60 hover:bg-zinc-700 text-zinc-200 border-zinc-700/60"
                : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300"
            }`}
          >
            <Navigation
              className={`w-4 h-4 ${isDark ? "text-white" : "text-zinc-900"}`}
            />
          </button>
          {onDeselect && (
            <button
              onClick={onDeselect}
              title="Deselect / Remove pin from map"
              className={`p-2 rounded-lg transition-colors border flex items-center justify-center cursor-pointer ${
                isDark
                  ? "bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-white border-zinc-700/60"
                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-950 border-zinc-300"
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Description if provided */}
      {marker.description && (
        <p className={`text-xs mt-3 leading-relaxed ${subTextClass}`}>
          {marker.description}
        </p>
      )}

      {/* Primary Coordinates & Live IST Clock */}
      <div className="py-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className={`flex items-center gap-1.5 ${subTextClass}`}>
            <Compass className="w-3.5 h-3.5" />
            <span>Coordinates</span>
          </span>
          <button
            onClick={copyCoords}
            className="flex items-center gap-1 font-mono text-[11px] tabular-nums hover:underline cursor-pointer"
            title="Click to copy coordinates"
          >
            <span>
              {marker.lat.toFixed(4)}° N, {marker.lng.toFixed(4)}° E
            </span>
            {copied ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3 text-zinc-400" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className={`flex items-center gap-1.5 ${subTextClass}`}>
            <Clock className="w-3.5 h-3.5" />
            <span>Local Time (IST)</span>
          </span>
          <span className="font-mono text-xs font-semibold tabular-nums">
            {istTime || "Loading IST..."}
          </span>
        </div>
      </div>

      {/* Geographic & Regional Facts */}
      <div className={`pt-3 border-t ${dividerClass} space-y-2 text-xs`}>
        <div className="flex items-center justify-between">
          <span className={subTextClass}>State / Territory</span>
          <span className="font-medium text-right">
            {marker.region || "India"}
          </span>
        </div>

        {marker.data?.elevation && (
          <div className="flex items-center justify-between">
            <span className={subTextClass}>Elevation</span>
            <span className="font-mono tabular-nums">
              {marker.data.elevation}
            </span>
          </div>
        )}

        {marker.data?.populationMetro && (
          <div className="flex items-center justify-between">
            <span className={subTextClass}>Metro Population</span>
            <span className="font-mono tabular-nums">
              {marker.data.populationMetro}
            </span>
          </div>
        )}

        {marker.data?.majorLandmarks && (
          <div className="flex items-center justify-between">
            <span className={subTextClass}>Landmarks</span>
            <span
              className="font-medium text-right truncate max-w-42.5"
              title={String(marker.data.majorLandmarks)}
            >
              {marker.data.majorLandmarks}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-inherit/40 text-[11px]">
          <span className={`${subTextClass} flex items-center gap-1.5`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span>Map Cartography</span>
          </span>
          <span className="font-medium">
            Survey of India (Official)
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-3 border-t border-inherit space-y-2">
        {marker.region && onToggleStateHighlight && (
          <button
            onClick={onToggleStateHighlight}
            className={`w-full py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
              isStateHighlighted
                ? isDark
                  ? "bg-white text-zinc-950 border-white shadow-sm"
                  : "bg-blue-600 text-white border-blue-600 shadow-md hover:bg-blue-700"
                : isDark
                ? "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border-zinc-700"
                : "bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300 shadow-sm"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="min-w-0 truncate whitespace-nowrap">
              {isStateHighlighted
                ? `Highlighted: ${marker.region} (Click to Clear)`
                : `Highlight ${marker.region} State on Request`}
            </span>
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onFlyTo(marker.lat, marker.lng, 1.6)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
              isDark
                ? "bg-white text-zinc-950 hover:bg-zinc-200 border-zinc-300"
                : "bg-blue-600 text-white hover:bg-blue-700 border-blue-600 shadow-md"
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Center Pin</span>
          </button>
          <button
            onClick={() => onFlyTo(marker.lat, marker.lng, 2.6)}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              isDark
                ? "border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-200"
                : "border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 shadow-sm"
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Close Up</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Backward compatibility alias
export const MumbaiDetailsCard = LocationDetailsCard;
export default LocationDetailsCard;
