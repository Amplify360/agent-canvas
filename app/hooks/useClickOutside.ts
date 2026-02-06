/**
 * Hook for closing dropdowns/menus on outside click or Escape key press.
 * Replaces the repeated pattern of attaching mousedown + keydown listeners
 * across AgentCard, MainToolbar, and Sidebar.
 */

import { RefObject, useEffect } from 'react';

export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  callback: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleMousedown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        callback();
      }
    };

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        callback();
      }
    };

    document.addEventListener('mousedown', handleMousedown);
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('mousedown', handleMousedown);
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [ref, callback, enabled]);
}
