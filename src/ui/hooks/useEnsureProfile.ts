import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/stores/authStore";
import { authClient } from "@/lib/auth-client";
import { useConvexAuthStore } from "./useConvexAuth";
import { create } from "zustand";

// Store to track if profile is ready
interface ProfileState {
  isProfileReady: boolean;
  setProfileReady: (ready: boolean) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  isProfileReady: false,
  setProfileReady: (ready) => set({ isProfileReady: ready }),
}));

/**
 * Hook that ensures a Convex profile exists for the authenticated user.
 * After Better Auth signup, this creates the corresponding Convex profile.
 * Uses getMe which reads auth identity from the token.
 */
export function useEnsureProfile() {
  const { user, isGuest, setUser, pendingProfile, setPendingProfile } = useAuthStore();
  const { setProfileReady } = useProfileStore();
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [hasAttemptedCreate, setHasAttemptedCreate] = useState(false);
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const { isAuthSet } = useConvexAuthStore();

  const existingProfile = useQuery(
    api.profiles.getMe,
    isGuest || !isAuthSet ? "skip" : {}
  );
  
  const createProfile = useMutation(api.profiles.createProfile);
  
  // Reset state when user changes
  useEffect(() => {
    if (isGuest) {
      setProfileReady(false);
      setHasAttemptedCreate(false);
      setPendingProfile(null);
    }
  }, [isGuest, setPendingProfile, setProfileReady]);
  
  // Mark profile as ready when it exists
  useEffect(() => {
    if (existingProfile) {
      setProfileReady(true);
      // Update user ID to match Convex profile ID
      if (user && existingProfile.id !== user.id) {
        setUser(existingProfile);
      }
      setPendingProfile(null);
    }
  }, [existingProfile, setPendingProfile, setProfileReady, user, setUser]);
  
  const ensureProfile = useCallback(async () => {
    // Skip if guest, no auth user ID, already creating, profile exists, or already attempted
    if (isGuest || !isAuthSet || isCreatingProfile || existingProfile || hasAttemptedCreate) {
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

      // Get current Better Auth session
      if (!session?.user) {
        return;
      }

      const authUser = session.user;
      const fallbackUsername =
        authUser.name ||
        authUser.email?.split("@")[0] ||
        `user_${authUser.id.substring(0, 8)}`;
      const username = pendingProfile?.username || fallbackUsername;
      const displayName = pendingProfile?.displayName || authUser.name || username;

      const newProfile = await createProfile({
        username,
        displayName,
        avatarUrl: authUser.image ?? undefined,
      });

      // Update the auth store with the new profile
      if (newProfile) {
        setUser(newProfile);
      }

      setProfileReady(true);
    } catch (error: any) {
      console.error('Profile creation failed:', error);
      // Profile might already exist (race condition) - that's OK
      if (error.message?.includes("already exists")) {
        setProfileReady(true);
      } else if (error.message?.includes("Username already taken")) {
        // Username was taken between check and creation (rare race condition)
        // This shouldn't happen with our pre-check, but handle it anyway
        console.error('Username conflict detected:', error.message);
        // Force logout to prevent broken state
        await authClient.signOut();
        setUser(null);
        setProfileReady(false);
      }
    } finally {
      setIsCreatingProfile(false);
    }
  }, [
    isGuest,
    isAuthSet,
    existingProfile,
    isCreatingProfile,
    hasAttemptedCreate,
    createProfile,
    pendingProfile,
    session?.user,
    setUser,
    setProfileReady,
  ]);
  
  useEffect(() => {
    ensureProfile();
  }, [ensureProfile]);
  
  return {
    isLoading:
      !isGuest &&
      isAuthSet &&
      (isSessionPending ||
        (!!session?.user && existingProfile === undefined)),
    profile: existingProfile,
    isProfileReady: useProfileStore((s) => s.isProfileReady),
  };
}
