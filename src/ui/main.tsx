import { StrictMode, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";
import { useAuthStore } from "./stores/authStore";
import type { User } from "@/lib/api/types";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - cache persists
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch when component mounts if data exists
      refetchOnReconnect: false,
    },
  },
});

// Component to check session on mount (non-blocking) and invalidate queries on auth changes
function AuthChecker() {
  const checkSession = useAuthStore((state) => state.checkSession);
  const queryClient = useQueryClient();
  const { user, isGuest } = useAuthStore();
  const prevUserRef = useRef<User | null>(null);
  const prevIsGuestRef = useRef<boolean>(true);
  
  useEffect(() => {
    // Don't block rendering - check session asynchronously
    checkSession().catch(() => {
      // Silently handle errors - they're already handled in the store
    });
  }, [checkSession]);
  
  // Invalidate friends queries when user logs in
  useEffect(() => {
    const wasGuest = prevIsGuestRef.current;
    // const wasLoggedIn = prevUserRef.current !== null;
    const isNowLoggedIn = !isGuest && user !== null;
    
    // If user just logged in (was guest, now logged in), invalidate friends queries
    if (wasGuest && isNowLoggedIn) {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friends', 'requests'] });
    }
    
    // Update refs
    prevUserRef.current = user;
    prevIsGuestRef.current = isGuest;
  }, [user, isGuest, queryClient]);
  
  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <QueryClientProvider client={queryClient}>
        <AuthChecker />
        <App />
      </QueryClientProvider>
    </HashRouter>
  </StrictMode>
);
