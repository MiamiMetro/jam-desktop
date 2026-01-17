import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import "./index.css";
import App from "./App.tsx";
import { authClient } from "./lib/auth-client";
import { useEnsureProfile } from "./hooks/useEnsureProfile";
import { useAuthStore } from "./stores/authStore";
import { useConvexAuth } from "./hooks/useConvexAuth";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

// Component to setup auth and check session on mount
function AuthSetup() {
  // Keep auth state store in sync
  useConvexAuth();
  
  // Ensure Convex profile exists after Better Auth
  useEnsureProfile();
  
  const checkSession = useAuthStore((state) => state.checkSession);
  
  useEffect(() => {
    // Check session asynchronously on mount
    checkSession().catch(() => {
      // Silently handle errors - they're already handled in the store
    });
  }, [checkSession]);
  
  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        <AuthSetup />
        <App />
      </ConvexBetterAuthProvider>
    </HashRouter>
  </StrictMode>
);
