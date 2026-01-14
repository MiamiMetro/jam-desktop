import { StrictMode, useEffect, useMemo, useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App.tsx";
import { supabase } from "./lib/supabase";
import { useEnsureProfile } from "./hooks/useEnsureProfile";
import { useAuthStore } from "./stores/authStore";
import { useConvexAuth } from "./hooks/useConvexAuth";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

// Custom auth hook for ConvexProviderWithAuth
function useSupabaseAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      try {
        const { data, error } = forceRefreshToken 
          ? await supabase.auth.refreshSession()
          : await supabase.auth.getSession();
        
        if (error) {
          console.error("[SupabaseAuth] Error getting session:", error);
          return null;
        }
        
        return data.session?.access_token ?? null;
      } catch (e) {
        console.error("[SupabaseAuth] Exception:", e);
        return null;
      }
    },
    []
  );
  
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setIsLoading(false);
    });
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setIsLoading(false);
    });
    
    return () => subscription.unsubscribe();
  }, []);
  
  return useMemo(
    () => ({ isLoading, isAuthenticated, fetchAccessToken }),
    [isLoading, isAuthenticated, fetchAccessToken]
  );
}

// Component to setup auth and check session on mount
function AuthSetup() {
  // Keep auth state store in sync
  useConvexAuth();
  
  // Ensure Convex profile exists after Supabase auth
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
      <ConvexProviderWithAuth client={convex} useAuth={useSupabaseAuth}>
        <AuthSetup />
        <App />
      </ConvexProviderWithAuth>
    </HashRouter>
  </StrictMode>
);
