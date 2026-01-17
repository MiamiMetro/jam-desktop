import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/stores/authStore";
import { authClient } from "@/lib/auth-client";
import { create } from "zustand";

// Store to track if profile is ready
interface ProfileState {
  isProfileReady: boolean;
  authUserId: string | null;
  setProfileReady: (ready: boolean) => void;
  setAuthUserId: (id: string | null) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  isProfileReady: false,
  authUserId: null,
  setProfileReady: (ready) => set({ isProfileReady: ready }),
  setAuthUserId: (id) => set({ authUserId: id }),
}));

/**
 * Hook that ensures a Convex profile exists for the authenticated user.
 * After Better Auth signup, this creates the corresponding Convex profile.
 * Uses getByAuthUserId which doesn't require Convex auth to be configured.
 */
export function useEnsureProfile() {
  const { user, isGuest, setUser, pendingProfile, setPendingProfile } = useAuthStore();
  const { setProfileReady, setAuthUserId } = useProfileStore();
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [hasAttemptedCreate, setHasAttemptedCreate] = useState(false);
  const [localAuthUserId, setLocalAuthUserId] = useState<string | null>(null);
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  
  // Get auth user ID from session
  useEffect(() => {
    if (isGuest) {
      setLocalAuthUserId(null);
      setAuthUserId(null);
      return;
    }

    if (session?.user?.id) {
      setLocalAuthUserId(session.user.id);
      setAuthUserId(session.user.id);
    } else if (!isSessionPending) {
      setLocalAuthUserId(null);
      setAuthUserId(null);
    }
  }, [isGuest, session?.user?.id, isSessionPending, setAuthUserId]);
  
  // Use getByAuthUserId which doesn't require Convex auth to be configured
  const existingProfile = useQuery(
    api.profiles.getByAuthUserId,
    localAuthUserId ? { authUserId: localAuthUserId } : "skip"
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
    if (isGuest || !localAuthUserId || isCreatingProfile || existingProfile || hasAttemptedCreate) {
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
        authUserId: authUser.id,
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
      // Profile might already exist (race condition) - that's OK
      if (error.message?.includes("already exists")) {
        setProfileReady(true);
      }
    } finally {
      setIsCreatingProfile(false);
    }
  }, [
    isGuest,
    localAuthUserId,
    existingProfile,
    isCreatingProfile,
    hasAttemptedCreate,
    createProfile,
    pendingProfile,
    session?.user,
    user,
    setUser,
    setProfileReady,
  ]);
  
  useEffect(() => {
    ensureProfile();
  }, [ensureProfile]);
  
  return {
    isLoading:
      ((localAuthUserId && existingProfile === undefined) || isSessionPending) &&
      !isGuest,
    profile: existingProfile,
    isProfileReady: useProfileStore((s) => s.isProfileReady),
  };
}
