import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, MapPin, X, Navigation } from 'lucide-react';
import { searchLocation, GeocodeResult } from '../services/geocoding';
import { GlobeMarker } from './EarthGlobe/types';

interface LocationSearchBarProps {
  onSelectLocation: (marker: GlobeMarker, stateName?: string) => void;
  onClearLocation?: () => void;
  activeMarker?: GlobeMarker | null;
  placeholder?: string;
  isDark?: boolean;
  className?: string;
  compact?: boolean;
  variant?: 'default' | 'glass';
}

const QUICK_SUGGESTIONS = [
  'Ulhasnagar, MH',
  'Thrissur, Kerala',
  'Mumbai, Maharashtra',
  'New Delhi',
  'Bengaluru',
  'Shimla, HP',
];

export const LocationSearchBar: React.FC<LocationSearchBarProps> = ({
  onSelectLocation,
  onClearLocation,
  activeMarker,
  placeholder = 'Search place (e.g. Ulhasnagar, MH)...',
  isDark = false,
  className = '',
  compact = false,
  variant = 'default',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isGlass = variant === 'glass';
  const fieldClass = isGlass
    ? 'bg-black/20 border-white/[0.14] focus-within:border-sky-300/75 text-slate-100 shadow-inner shadow-black/10'
    : isDark
    ? 'bg-neutral-900/90 border-neutral-700/80 focus-within:border-neutral-400 text-neutral-100'
    : 'bg-white border-neutral-300 focus-within:border-neutral-700 text-neutral-900';
  const dropdownClass = isGlass
    ? 'border-white/[0.14] backdrop-blur-2xl bg-slate-950/95 text-slate-100 shadow-2xl'
    : isDark
    ? 'border-neutral-800 backdrop-blur-md bg-neutral-950/95 text-neutral-100'
    : 'border-neutral-200 backdrop-blur-md bg-white/95 text-neutral-900';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchLocation(query, controller.signal);
        setResults(res);
        setSelectedIndex(-1);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handlePick = (item: GeocodeResult) => {
    onSelectLocation(item.marker, item.state);
    setQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        handlePick(results[selectedIndex]);
      } else if (results.length > 0) {
        handlePick(results[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input Box */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 ${isGlass ? 'rounded-md' : 'rounded-lg'} border transition-all ${fieldClass}`}
      >
        <Search className={`w-3.5 h-3.5 shrink-0 ${isGlass ? 'text-sky-300' : 'text-neutral-400'}`} />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full text-xs bg-transparent focus:outline-none font-sans ${isGlass ? 'placeholder-slate-400 text-slate-100' : 'placeholder-neutral-500'}`}
        />

        {/* Trailing action slot: fixed width so the input never resizes when
            the clear / deselect / loading controls appear or disappear. */}
        <div className="flex items-center justify-end shrink-0 min-w-[56px]">
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400 shrink-0" />}

          {!isLoading && query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
              }}
              className={`cursor-pointer p-0.5 shrink-0 flex items-center justify-center ${isGlass ? 'text-slate-400 hover:text-sky-200' : 'text-neutral-400 hover:text-neutral-200'}`}
              title="Clear search text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {!isLoading && !query && activeMarker && onClearLocation && (
            <button
              onClick={onClearLocation}
              className={`text-[10px] flex items-center gap-1 border-l pl-2 shrink-0 cursor-pointer whitespace-nowrap ${isGlass ? 'text-slate-400 hover:text-sky-200 border-white/10' : 'text-neutral-400 hover:text-red-400 border-neutral-700'}`}
              title="Deselect active pin"
            >
              <span>Deselect</span>
            </button>
          )}
        </div>
      </div>

      {/* Dropdown Results / Suggestions */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-1.5 ${isGlass ? 'rounded-lg' : 'rounded-xl'} border z-50 overflow-hidden max-h-80 overflow-y-auto ${dropdownClass}`}
        >
          {/* Quick suggestions when input is empty */}
          {!query && (
            <div className="p-3">
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider block mb-2 ${
                  isGlass ? 'text-slate-400' : 'text-neutral-400'
                }`}
              >
                Quick Place Suggestions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    onClick={() => {
                      setQuery(sug);
                      setIsOpen(true);
                    }}
                    className={`px-2 py-1 rounded text-xs border text-left cursor-pointer transition-colors ${
                      isGlass
                        ? 'bg-white/[0.07] border-white/[0.1] hover:bg-white/[0.13] text-slate-300 hover:text-white'
                        : isDark
                        ? 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white'
                        : 'bg-neutral-100 border-neutral-200 hover:bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {query && results.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 flex items-center justify-between border-b border-inherit">
                <span>Matching Locations ({results.length})</span>
                <span>Press Enter to Pin</span>
              </div>
              {results.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <button
                    key={item.id}
                    onClick={() => handlePick(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left px-3 py-2 flex items-start gap-2.5 transition-colors cursor-pointer border-b last:border-0 ${
                      isGlass ? 'border-white/10' : 'border-neutral-900/40'
                    } ${
                      isSelected
                        ? isGlass
                          ? 'bg-sky-300/18 text-white'
                          : isDark
                          ? 'bg-neutral-800 text-white'
                          : 'bg-neutral-100 text-neutral-950'
                        : isGlass
                        ? 'hover:bg-white/[0.08] text-slate-200'
                        : isDark
                        ? 'hover:bg-neutral-900/80 text-neutral-200'
                        : 'hover:bg-neutral-50 text-neutral-800'
                    }`}
                  >
                    <MapPin
                      className={`w-4 h-4 shrink-0 ${isGlass ? 'text-sky-300' : 'text-neutral-400'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs truncate">{item.name}</span>
                        {item.state && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 leading-none rounded font-medium ${
                              isGlass
                                ? 'bg-white/[0.09] text-slate-300 border border-white/10'
                                : isDark
                                ? 'bg-neutral-800 text-neutral-300'
                                : 'bg-neutral-200 text-neutral-800'
                            }`}
                          >
                            {item.state}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-mono ml-auto shrink-0 ${
                            isGlass ? 'text-slate-400' : 'text-neutral-400'
                          }`}
                        >
                          {item.lat.toFixed(2)}°, {item.lng.toFixed(2)}°
                        </span>
                      </div>
                      <p
                        className={`text-[11px] truncate mt-0.5 ${
                          isGlass ? 'text-slate-400' : 'text-neutral-400'
                        }`}
                      >
                        {item.displayName}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* No results notice */}
          {query && !isLoading && results.length === 0 && (
            <div
              className={`p-4 text-center text-xs ${
                isGlass ? 'text-slate-300' : 'text-neutral-400'
              }`}
            >
              <p>No location found for &ldquo;{query}&rdquo;</p>
              <p
                className={`text-[11px] mt-1 ${
                  isGlass ? 'text-slate-400' : 'text-neutral-500'
                }`}
              >
                Try searching with city and state, e.g. &ldquo;Ulhasnagar, Maharashtra&rdquo;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
