import { useEffect } from 'react';
import type { GlobeMarker } from '../components/EarthGlobe/types';

export interface KeyboardShortcutHandlers {
  /** `null` clears the active pin. */
  onSelectLocation: (marker: GlobeMarker | null) => void;
  onResetView: () => void;
  onToggleControls: () => void;
  onToggleDarkMode: () => void;
  onDismissDetails: () => void;
  onExitEmbedMode: () => void;
  setAutoRotate: (updater: (prev: boolean) => boolean) => void;
  isControlsOpen: boolean;
  isEmbedMode: boolean;
  /** True when the session began in embed mode via the URL. */
  startedInEmbedMode: boolean;
}

const TYPING_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];

/**
 * Global keyboard shortcuts.
 *
 * Every binding is ignored while the user is typing in a form field, which is
 * what keeps `X` from clearing the globe's active pin while someone is naming a
 * custom location.
 *
 * Bindings: SPACE pause/rotate · X clear pin · ESC close panel · R reset view ·
 * C customizer · T map theme.
 */
export const useKeyboardShortcuts = (h: KeyboardShortcutHandlers): void => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // A session that started in embed mode via the URL has no chrome to
      // command, so it honours no keys at all. One entered from the dashboard
      // can be left again.
      if (h.isEmbedMode) {
        if (
          !h.startedInEmbedMode &&
          (e.key === 'x' || e.key === 'X' || e.key === 'Escape')
        ) {
          h.onExitEmbedMode();
        }
        return;
      }

      if (TYPING_TAGS.includes((e.target as HTMLElement).tagName)) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        h.setAutoRotate((prev) => !prev);
      } else if (e.key === 'x' || e.key === 'X') {
        h.onSelectLocation(null);
      } else if (e.key === 'Escape') {
        // Escape only dismisses the panel, matching the card's close button
        h.onDismissDetails();
      } else if (e.key === 'r' || e.key === 'R') {
        h.onResetView();
      } else if (e.key === 'c' || e.key === 'C') {
        h.onToggleControls();
      } else if (e.key === 't' || e.key === 'T') {
        h.onToggleDarkMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    h.onSelectLocation,
    h.onResetView,
    h.onToggleControls,
    h.onToggleDarkMode,
    h.onDismissDetails,
    h.onExitEmbedMode,
    h.setAutoRotate,
    h.isControlsOpen,
    h.isEmbedMode,
    h.startedInEmbedMode,
  ]);
};