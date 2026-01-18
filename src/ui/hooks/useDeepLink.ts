import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Hook to handle deep links from outside the app.
 * This enables "Open in App" functionality when users click links like:
 * - jam://profile/123
 * - https://yourapp.com/profile/123
 *
 * The hook automatically navigates to the appropriate route when a deep link is received.
 *
 * Usage: Call this hook once at the app root level (e.g., in App.tsx)
 *
 * @example
 * ```tsx
 * function App() {
 *   useDeepLink();
 *   return <YourApp />;
 * }
 * ```
 */
export function useDeepLink() {
  const navigate = useNavigate();

  useEffect(() => {
    // Only set up listener in Electron environment
    if (!window.electron?.onNavigate) {
      return;
    }

    // Listen for deep link navigation events from Electron
    window.electron.onNavigate((path: string) => {
      console.log('[Deep Link] Navigating to:', path);
      navigate(path);
    });
  }, [navigate]);
}
