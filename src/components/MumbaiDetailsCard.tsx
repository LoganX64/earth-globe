import React, { useState, useEffect } from "react";
import { GlobeMarker } from "./EarthGlobe/types";
import {
  Navigation,
  Compass,
  Clock,
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
    ? "bg-slate-950/78 backdrop-blur-2xl border-white/15 text-slate-100 shadow-[0_20px_60px_rgba(15,23,42,0.36)]"
    : "bg-white/85 backdrop-blur-xl border-neutral-200 text-neutral-900 shadow-2xl";
  const subTextClass = isDark ? "text-slate-300" : "text-neutral-500";
  const dividerClass = isDark ? "border-white/10" : "border-neutral-200";
  const iconButtonClass = isDark
    ? "bg-white/[0.07] hover:bg-white/[0.13] text-slate-200 hover:text-white border-white/[0.12] border-dashed"
    : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-950 border-neutral-300 border-dashed";
  const primaryButtonClass = isDark
    ? "bg-sky-300 text-slate-950 hover:bg-sky-200 border-sky-200 shadow-[0_4px_14px_rgba(56,189,248,0.28)] border-dashed"
    : "bg-blue-600 text-white hover:bg-blue-500 border-blue-600 shadow-[0_4px_14px_rgba(37,99,235,0.28)] border-dashed";
  const secondaryButtonClass = isDark
    ? "bg-white/[0.07] hover:bg-white/[0.13] text-slate-200 hover:text-white border-white/[0.12] border-dashed"
    : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-950 border-neutral-300 border-dashed";

  return (
    <div
      className={`w-[22.5rem] max-w-[calc(100vw-3rem)] min-h-[27rem] rounded-lg border p-5 transition-all duration-300 ${bgClass}`}
    >
      {/* Header */}
      <div className={`relative pb-3 border-b ${dividerClass}`}>
        <div>
          <div className="hidden">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full animate-pulse ${
                isDark ? "bg-white" : "bg-neutral-900"
              }`}
            />
            <span>Active Location Pin</span>
            <span aria-hidden="true">·</span>
          </div>
          <h2 className="flex items-center gap-2 pr-20 text-xl font-bold text-inherit">
            <span>{marker.name}</span>
            <span
              className="relative h-[13px] w-[13px] shrink-0"
              aria-label="Active map marker"
            >
              <span className="relative block h-[13px] w-[13px] rounded-full border-[2.2px] border-red-600 bg-white/95">
                <span className="absolute top-1/2 left-1/2 h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600" />
              </span>
            </span>
          </h2>
          <div className={`text-xs mt-0.5 ${subTextClass}`}>
            <span>{marker.region || "State"}</span>
            <span aria-hidden="true" className="mx-1.5">
              ·
            </span>
            <span>{marker.country || "India"}</span>
            {/*
              <>
                <span aria-hidden="true" className="mx-1.5">
                  ·
                </span>
                <span className="inline align-bottom">
                  {marker.data.role}
                </span>
              </>
            */}
          </div>
        </div>

        <div className="absolute top-0 right-0 flex items-center gap-1.5">
          <button
            onClick={() => onFlyTo(marker.lat, marker.lng, 2.0)}
            title={`Fly to ${marker.name}`}
              className={`p-2 rounded-md transition-colors border flex items-center justify-center cursor-pointer ${iconButtonClass}`}
          >
            <Navigation
              className="w-4 h-4 text-sky-300"
            />
          </button>
          {onDeselect && (
            <button
              onClick={onDeselect}
              title="Deselect / Remove pin from map"
              className={`p-2 rounded-md transition-colors border flex items-center justify-center cursor-pointer ${iconButtonClass}`}
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
            <Compass className="w-3.5 h-3.5 text-sky-300" />
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
              <Copy className="w-3 h-3 text-slate-400" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className={`flex items-center gap-1.5 ${subTextClass}`}>
            <Clock className="w-3.5 h-3.5 text-sky-300" />
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

        <div className={`flex items-center justify-between pt-1 text-[11px]`}>
          <span className={`${subTextClass} flex items-center gap-1.5`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
            <span>Map Cartography</span>
          </span>
          <span className="font-medium flex items-center">
            Survey of India (Official)
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className={`mt-4 pt-3 border-t ${dividerClass} space-y-2`}>
        {marker.region && onToggleStateHighlight && (
          <button
            onClick={onToggleStateHighlight}
            className={`w-full py-2 px-3 rounded-md border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              isStateHighlighted ? primaryButtonClass : secondaryButtonClass
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
            className={`px-3 py-2 text-xs font-semibold rounded-md border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${primaryButtonClass}`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Center Pin</span>
          </button>
          <button
            onClick={() => onFlyTo(marker.lat, marker.lng, 2.6)}
            className={`px-3 py-2 text-xs font-medium rounded-md border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${secondaryButtonClass}`}
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
