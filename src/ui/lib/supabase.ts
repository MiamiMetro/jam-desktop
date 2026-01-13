import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  setAccessToken,
  deleteAccessToken,
  setRefreshToken,
  deleteRefreshToken,
  isSecureStorageAvailable,
} from "./secureStorage";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a dummy client if env vars are missing (for build/SSR)
// The app will show an error at runtime if auth is attempted without proper config
let supabase: SupabaseClient;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  // Check if we're in Electron with secure storage
  const useSecureStorage = isSecureStorageAvailable();
  
  if (useSecureStorage) {
    console.log('Using secure OS keychain for token storage');
  } else {
    console.warn('Secure storage not available, using localStorage (not recommended for production)');
  }
  
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      // Use our custom storage adapter when secure storage is available
      // Note: Supabase's storage interface is synchronous, so we use localStorage
      // as a cache and sync to secure storage asynchronously
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // Electron doesn't use URL-based auth
    },
  });
  
  // If using secure storage, set up listeners to sync tokens
  if (useSecureStorage) {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.access_token) {
          await setAccessToken(session.access_token);
        }
        if (session?.refresh_token) {
          await setRefreshToken(session.refresh_token);
        }
      } else if (event === 'SIGNED_OUT') {
        await deleteAccessToken();
        await deleteRefreshToken();
      }
    });
  }
} else {
  console.warn("Missing Supabase environment variables. Auth will not work.");
  // Create a minimal stub that will error gracefully
  supabase = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: new Error("Supabase not configured") }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error("Supabase not configured") }),
      signUp: async () => ({ data: { user: null, session: null }, error: new Error("Supabase not configured") }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  } as unknown as SupabaseClient;
}

export { supabase };
