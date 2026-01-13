import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { create } from "zustand";

// Store to track if profile is ready
interface ProfileState {
  isProfileReady: boolean;
  supabaseId: string | null;
  setProfileReady: (ready: boolean) => void;
  setSupabaseId: (id: string | null) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  isProfileReady: false,
  supabaseId: null,
  setProfileReady: (ready) => set({ isProfileReady: ready }),
  setSupabaseId: (id) => set({ supabaseId: id }),
}));

/**
 * Hook that ensures a Convex profile exists for the authenticated user.
 * After Supabase signup, this creates the corresponding Convex profile.
 * Uses getBySupabaseId which doesn't require Convex auth to be configured.
 */
export function useEnsureProfile() {
  const { user, isGuest, setUser } = useAuthStore();
  const { setProfileReady, setSupabaseId } = useProfileStore();
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [hasAttemptedCreate, setHasAttemptedCreate] = useState(false);
  const [localSupabaseId, setLocalSupabaseId] = useState<string | null>(null);
  
  // Get Supabase ID from session
  useEffect(() => {
    if (isGuest) {
      setLocalSupabaseId(null);
      setSupabaseId(null);
      return;
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        setLocalSupabaseId(session.user.id);
        setSupabaseId(session.user.id);
      }
    });
  }, [isGuest, setSupabaseId]);
  
  // Use getBySupabaseId which doesn't require Convex auth to be configured
  const existingProfile = useQuery(
    api.profiles.getBySupabaseId,
    localSupabaseId ? { supabaseId: localSupabaseId } : "skip"
  );
  
  const createProfile = useMutation(api.profiles.createProfile);
  
  // Reset state when user changes
  useEffect(() => {
    if (isGuest) {
      setProfileReady(false);
      setHasAttemptedCreate(false);
    }
  }, [isGuest, setProfileReady]);
  
  // Mark profile as ready when it exists
  useEffect(() => {
    if (existingProfile) {
      setProfileReady(true);
      // Update user ID to match Convex profile ID
      if (user && existingProfile.id !== user.id) {
        setUser({
          ...user,
          id: existingProfile.id,
          username: existingProfile.username || user.username,
          display_name: existingProfile.display_name || user.display_name,
          avatar: existingProfile.avatar_url || user.avatar,
        });
      }
    }
  }, [existingProfile, setProfileReady, user, setUser]);
  
  const ensureProfile = useCallback(async () => {
    // Skip if guest, no supabase ID, already creating, profile exists, or already attempted
    if (isGuest || !localSupabaseId || isCreatingProfile || existingProfile || hasAttemptedCreate) {
      return;
    }
    
    // existingProfile is undefined while loading
    if (existingProfile === undefined) {
      return; // Still loading
    }
    
    // Profile doesn't exist - need to create it
    try {
      setIsCreatingProfile(true);
      setHasAttemptedCreate(true);
      
      // Get current Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return;
      }
      
      const supabaseUser = session.user;
      const username = supabaseUser.user_metadata?.username || 
                       supabaseUser.email?.split('@')[0] || 
                       `user_${supabaseUser.id.substring(0, 8)}`;
      
      const newProfile = await createProfile({
        supabaseId: supabaseUser.id,
        username,
        displayName: supabaseUser.user_metadata?.display_name || username,
        avatarUrl: supabaseUser.user_metadata?.avatar_url,
      });
      
      // Update the auth store with the new profile
      if (newProfile && user) {
        setUser({
          ...user,
          id: newProfile.id,
          username: newProfile.username || user.username,
        });
      }
      
      setProfileReady(true);
    } catch (error: any) {
      // Profile might already exist (race condition) - that's OK
      if (error.message?.includes("already exists")) {
        setProfileReady(true);
      }
    } finally {
      setIsCreatingProfile(false);
    }
  }, [isGuest, localSupabaseId, existingProfile, isCreatingProfile, hasAttemptedCreate, createProfile, user, setUser, setProfileReady]);
  
  useEffect(() => {
    ensureProfile();
  }, [ensureProfile]);
  
  return {
    isLoading: (localSupabaseId && existingProfile === undefined) && !isGuest,
    profile: existingProfile,
    isProfileReady: useProfileStore((s) => s.isProfileReady),
  };
}
