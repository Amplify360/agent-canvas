/**
 * Prevent body scrolling while an overlay/panel is open.
 */

'use client';

import { useEffect } from 'react';

let lockCount = 0;
let originalOverflow: string | null = null;

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    if (lockCount === 0) {
      originalOverflow = document.body.style.overflow;
    }

    lockCount += 1;
    document.body.style.overflow = 'hidden';

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0 && originalOverflow !== null) {
        document.body.style.overflow = originalOverflow;
        originalOverflow = null;
      }
    };
  }, [locked]);
}
