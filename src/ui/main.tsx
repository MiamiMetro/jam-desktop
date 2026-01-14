import { StrictMode, useEffect, useMemo, useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App.tsx";
import { supabase } from "./lib/supabase";
import { useAuthStore } from "./stores/authStore";

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

// Component to sync auth state on mount
function AuthSync() {
  const checkSession = useAuthStore((state) => state.checkSession);
  
  useEffect(() => {
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
        <AuthSync />
        <App />
      </ConvexProviderWithAuth>
    </HashRouter>
  </StrictMode>
);
