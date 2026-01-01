import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";
import { useAuthStore } from "./stores/authStore";

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

// Component to check session on mount (non-blocking)
function AuthChecker() {
  const checkSession = useAuthStore((state) => state.checkSession);
  
  useEffect(() => {
    // Don't block rendering - check session asynchronously
    checkSession().catch(() => {
      // Silently handle errors - they're already handled in the store
    });
  }, [checkSession]);
  
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
