import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const SCROLL_POSITIONS_KEY = 'scrollPositions';

interface ScrollPositions {
  [key: string]: number;
}

// Get scroll positions from sessionStorage
const getScrollPositions = (): ScrollPositions => {
  try {
    const stored = sessionStorage.getItem(SCROLL_POSITIONS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Save scroll positions to sessionStorage
const saveScrollPositions = (positions: ScrollPositions) => {
  try {
    sessionStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(positions));
  } catch {
    // Ignore storage errors
  }
};

// Save scroll position for a route
const saveScrollPosition = (path: string, position: number) => {
  const positions = getScrollPositions();
  positions[path] = position;
  saveScrollPositions(positions);
};

// Get scroll position for a route
const getScrollPosition = (path: string): number | null => {
  const positions = getScrollPositions();
  return positions[path] ?? null;
};

export const useScrollRestoration = (scrollContainerRef: React.RefObject<HTMLElement>) => {
  const location = useLocation();
  const isRestoringRef = useRef(false);
  const lastPathRef = useRef<string>(location.pathname);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Save scroll position of previous route before switching
    if (lastPathRef.current !== location.pathname) {
      saveScrollPosition(lastPathRef.current, container.scrollTop);
      lastPathRef.current = location.pathname;
    }

    // Save scroll position while scrolling
    let scrollTimeout: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      if (!isRestoringRef.current) {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          saveScrollPosition(location.pathname, container.scrollTop);
        }, 150);
      }
    };

    // Add scroll event listener
    container.addEventListener('scroll', handleScroll, { passive: true });

    // Get saved position for current route
    const savedPosition = getScrollPosition(location.pathname);

    // Restore scroll position
    if (savedPosition !== null) {
      isRestoringRef.current = true;
      // Use multiple requestAnimationFrame to ensure layout is complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = savedPosition;
            // Reset flag after a delay
            setTimeout(() => {
              isRestoringRef.current = false;
            }, 200);
          }
        });
      });
    } else {
      // No saved position, scroll to top
      container.scrollTop = 0;
    }

    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [location.pathname, scrollContainerRef]);
};

