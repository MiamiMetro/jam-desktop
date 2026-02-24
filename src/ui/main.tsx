import { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, useNavigate } from "react-router-dom";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";
import { authClient } from "./lib/auth-client";
import { useEnsureProfile } from "./hooks/useEnsureProfile";
import { useAuthStore } from "./stores/authStore";
import { useConvexAuth } from "./hooks/useConvexAuth";
import { instrumentConvexClient } from "./lib/convex-debug";

const ConvexDebugPanel = lazy(() => import("./components/debug/ConvexDebugPanel"));

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

if (import.meta.env.DEV) {
  instrumentConvexClient(convex);
}
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

// Component to setup auth and check session on mount
function AuthSetup() {
  // Keep auth state store in sync
  useConvexAuth();

  // Ensure Convex profile exists after Better Auth
  useEnsureProfile();

  const navigate = useNavigate();
  const checkSession = useAuthStore((state) => state.checkSession);
  const isGuest = useAuthStore((state) => state.isGuest);

  useEffect(() => {
    // Check session asynchronously on mount
    checkSession().catch(() => {
      // Silently handle errors - they're already handled in the store
    });
  }, [checkSession]);

  // Restore saved path after login completes
  useEffect(() => {
    if (!isGuest) {
      const returnPath = sessionStorage.getItem("auth_return_path");
      if (returnPath) {
        sessionStorage.removeItem("auth_return_path");
        navigate(returnPath, { replace: true });
      }
    }
  }, [isGuest, navigate]);

  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <ConvexBetterAuthProvider client={convex} authClient={authClient}>
          <AuthSetup />
          <App />
          {import.meta.env.DEV && (
            <Suspense fallback={null}>
              <ConvexDebugPanel />
            </Suspense>
          )}
        </ConvexBetterAuthProvider>
      </HashRouter>
    </QueryClientProvider>
  </StrictMode>
);
