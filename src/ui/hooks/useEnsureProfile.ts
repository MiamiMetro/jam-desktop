import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/stores/authStore";
import { create } from "zustand";

// Store to track account/profile state
interface ProfileState {
  isAccountReady: boolean;
  isProfileReady: boolean;
  needsOnboarding: boolean;
  accountId: string | null;
  setAccountReady: (ready: boolean) => void;
  setProfileReady: (ready: boolean) => void;
  setNeedsOnboarding: (needs: boolean) => void;
  setAccountId: (id: string | null) => void;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  isAccountReady: false,
  isProfileReady: false,
  needsOnboarding: false,
  accountId: null,
  setAccountReady: (ready) => set({ isAccountReady: ready }),
  setProfileReady: (ready) => set({ isProfileReady: ready }),
  setNeedsOnboarding: (needs) => set({ needsOnboarding: needs }),
  setAccountId: (id) => set({ accountId: id }),
  reset: () => set({ 
    isAccountReady: false, 
    isProfileReady: false, 
    needsOnboarding: false, 
    accountId: null 
  }),
}));

/**
 * Hook that ensures a Convex account and profile exists for the authenticated user.
 * Flow:
 * 1. After Supabase auth, call `ensureAccount` to create account + authAccounts
 * 2. If no profile exists, automatically create one using the username from auth store
 * 3. Profile is created immediately - no separate onboarding
 */
export function useEnsureProfile() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const { user, isGuest, setUser } = useAuthStore();
  const profileStore = useProfileStore();
  
  const [isEnsuring, setIsEnsuring] = useState(false);
  const [hasCheckedAccount, setHasCheckedAccount] = useState(false);
  const ensuredRef = useRef(false);
  
  const ensureAccount = useMutation(api.profiles.ensureAccount);
  const createProfile = useMutation(api.profiles.createProfile);
  
  // Query for current account/profile (only after we know account might exist)
  const accountInfo = useQuery(
    api.profiles.getMyAccount,
    isAuthenticated && profileStore.isAccountReady ? {} : "skip"
  );
  
  // Reset state when auth changes (logout)
  useEffect(() => {
    if (isGuest || !isAuthenticated) {
      profileStore.reset();
      setHasCheckedAccount(false);
      ensuredRef.current = false;
    }
  }, [isGuest, isAuthenticated]);
  
  // Ensure account and profile exist after Supabase auth
  useEffect(() => {
    if (isGuest || !isAuthenticated || isAuthLoading || isEnsuring || ensuredRef.current) {
      return;
    }
    
    const doEnsure = async () => {
      try {
        setIsEnsuring(true);
        ensuredRef.current = true;
        
        // Step 1: Ensure account exists
        const result = await ensureAccount({});
        
        profileStore.setAccountId(result.accountId);
        profileStore.setAccountReady(true);
        
        if (result.hasProfile && result.profile) {
          // Profile already exists
          profileStore.setProfileReady(true);
          profileStore.setNeedsOnboarding(false);
          
          // Update auth store with Convex profile data
          setUser({
            ...user,
            id: result.profile.id,
            username: result.profile.username,
            display_name: result.profile.display_name,
            avatar: result.profile.avatar_url,
            bio: result.profile.bio,
          });
        } else {
          // No profile - create one automatically using username from signup
          const username = user?.username;
          
          if (username) {
            try {
              const profile = await createProfile({
                username: username,
              });
              
              profileStore.setProfileReady(true);
              profileStore.setNeedsOnboarding(false);
              
              // Update auth store with created profile
              setUser({
                ...user,
                id: profile.id,
                username: profile.username,
                display_name: profile.display_name,
                avatar: profile.avatar_url,
                bio: profile.bio,
              });
            } catch (profileError: any) {
              console.error("[EnsureProfile] Error creating profile:", profileError);
              // If username taken or invalid, set needs onboarding
              profileStore.setProfileReady(false);
              profileStore.setNeedsOnboarding(true);
            }
          } else {
            // No username available - needs onboarding
            profileStore.setProfileReady(false);
            profileStore.setNeedsOnboarding(true);
          }
        }
        
        setHasCheckedAccount(true);
      } catch (error) {
        console.error("[EnsureProfile] Error ensuring account:", error);
        ensuredRef.current = false; // Allow retry on error
        setHasCheckedAccount(true);
      } finally {
        setIsEnsuring(false);
      }
    };
    
    doEnsure();
  }, [isAuthenticated, isAuthLoading, isGuest, isEnsuring, ensureAccount, createProfile, user?.username]);
  
  // Update state when accountInfo changes (for profile updates)
  useEffect(() => {
    if (accountInfo?.hasProfile && accountInfo?.profile && !profileStore.isProfileReady) {
      profileStore.setProfileReady(true);
      profileStore.setNeedsOnboarding(false);
      
      // Keep auth store in sync
      setUser({
        ...user,
        id: accountInfo.profile.id,
        username: accountInfo.profile.username,
        display_name: accountInfo.profile.display_name,
        avatar: accountInfo.profile.avatar_url,
        bio: accountInfo.profile.bio,
      });
    }
  }, [accountInfo?.hasProfile, accountInfo?.profile?.id]);
  
  return {
    isLoading: isAuthLoading || isEnsuring || (isAuthenticated && !hasCheckedAccount),
    isAccountReady: profileStore.isAccountReady,
    isProfileReady: profileStore.isProfileReady,
    needsOnboarding: profileStore.needsOnboarding,
    profile: accountInfo?.profile ?? null,
  };
}
