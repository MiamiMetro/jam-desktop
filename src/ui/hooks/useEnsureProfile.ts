import { useEffect  } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/stores/authStore";
import { authClient } from "@/lib/auth-client";
import { useConvexAuthStore } from "./useConvexAuth";
import { create } from "zustand";

// Store to track if profile is ready and if username setup is needed
interface ProfileState {
  isProfileReady: boolean;
  needsUsernameSetup: boolean;
  setProfileReady: (ready: boolean) => void;
  setNeedsUsernameSetup: (needs: boolean) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  isProfileReady: false,
  needsUsernameSetup: false,
  setProfileReady: (ready) => set({ isProfileReady: ready }),
  setNeedsUsernameSetup: (needs) => set({ needsUsernameSetup: needs }),
}));

/**
 * Hook that checks if a Convex profile exists for the authenticated user.
 * If no profile exists, sets needsUsernameSetup flag to show username setup screen.
 * Uses getMe which reads auth identity from the token.
 */
export function useEnsureProfile() {
  const { user, isGuest, setUser } = useAuthStore();
  const { setProfileReady, setNeedsUsernameSetup } = useProfileStore();
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const { isAuthSet } = useConvexAuthStore();

  const existingProfile = useQuery(
    api.profiles.getMe,
    isGuest || !isAuthSet ? "skip" : {}
  );

  // Reset state when user changes
  useEffect(() => {
    if (isGuest) {
      setProfileReady(false);
      setNeedsUsernameSetup(false);
    }
  }, [isGuest, setProfileReady, setNeedsUsernameSetup]);

  // Mark profile as ready when it exists, or show username setup if it doesn't
  useEffect(() => {
    if (existingProfile) {
      setProfileReady(true);
      setNeedsUsernameSetup(false);
      // Update user ID to match Convex profile ID
      if (user && existingProfile.id !== user.id) {
        setUser(existingProfile);
      }
    } else if (!isGuest && isAuthSet && existingProfile === null) {
      // Profile doesn't exist and we're authenticated - show username setup
      setProfileReady(false);
      setNeedsUsernameSetup(true);
    }
  }, [existingProfile, setProfileReady, setNeedsUsernameSetup, user, setUser, isGuest, isAuthSet]);
  
  return {
    isLoading:
      !isGuest &&
      isAuthSet &&
      (isSessionPending ||
        (!!session?.user && existingProfile === undefined)),
    profile: existingProfile,
    isProfileReady: useProfileStore((s) => s.isProfileReady),
    needsUsernameSetup: useProfileStore((s) => s.needsUsernameSetup),
  };
}
