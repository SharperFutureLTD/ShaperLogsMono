'use client'

import { useEffect, useState } from 'react';

/**
 * Detects if the device supports touch events.
 * More reliable than useIsMobile for determining swipe gesture support.
 *
 * @returns boolean indicating if touch events are supported
 */
export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    // Check multiple indicators for touch support
    const hasTouch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore - legacy IE support
      (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0);

    setIsTouch(hasTouch);
  }, []);

  return isTouch;
}
