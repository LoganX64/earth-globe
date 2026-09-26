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
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
          isDark
            ? 'bg-zinc-900/90 border-zinc-700/80 focus-within:border-zinc-400 text-zinc-100'
            : 'bg-white border-zinc-300 focus-within:border-zinc-700 text-zinc-900 shadow-sm'
        }`}
      >
        <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
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
          className="w-full text-xs bg-transparent focus:outline-none placeholder-zinc-500 font-sans"
        />

        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400 shrink-0" />}

        {query && !isLoading && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="text-zinc-400 hover:text-zinc-200 cursor-pointer p-0.5 shrink-0"
            title="Clear search text"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {activeMarker && !query && onClearLocation && (
          <button
            onClick={onClearLocation}
            className="text-[10px] text-zinc-400 hover:text-red-400 flex items-center gap-1 border-l border-zinc-700 pl-2 shrink-0 cursor-pointer"
            title="Deselect active pin"
          >
            <span>Deselect</span>
          </button>
        )}
      </div>

      {/* Dropdown Results / Suggestions */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-1.5 rounded-xl border shadow-2xl z-50 overflow-hidden backdrop-blur-md max-h-80 overflow-y-auto ${
            isDark ? 'bg-zinc-950/95 border-zinc-800 text-zinc-100' : 'bg-white/95 border-zinc-200 text-zinc-900'
          }`}
        >
          {/* Quick suggestions when input is empty */}
          {!query && (
            <div className="p-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
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
                      isDark
                        ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                        : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-700'
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
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between border-b border-inherit">
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
                    className={`w-full text-left px-3 py-2 flex items-start gap-2.5 transition-colors cursor-pointer border-b border-zinc-900/40 last:border-0 ${
                      isSelected
                        ? isDark
                          ? 'bg-zinc-800 text-white'
                          : 'bg-zinc-100 text-zinc-950'
                        : isDark
                        ? 'hover:bg-zinc-900/80 text-zinc-200'
                        : 'hover:bg-zinc-50 text-zinc-800'
                    }`}
                  >
                    <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs truncate">{item.name}</span>
                        {item.state && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                              isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-800'
                            }`}
                          >
                            {item.state}
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-400 font-mono ml-auto shrink-0">
                          {item.lat.toFixed(2)}°, {item.lng.toFixed(2)}°
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">{item.displayName}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* No results notice */}
          {query && !isLoading && results.length === 0 && (
            <div className="p-4 text-center text-xs text-zinc-400">
              <p>No location found for &ldquo;{query}&rdquo;</p>
              <p className="text-[11px] mt-1 text-zinc-500">
                Try searching with city and state, e.g. &ldquo;Ulhasnagar, Maharashtra&rdquo;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
