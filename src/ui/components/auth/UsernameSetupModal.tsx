// UsernameSetupModal.tsx — Non-dismissible username setup after signup
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/authStore";
import { useAuthModalStore } from "@/stores/authModalStore";
import { useProfileStore } from "@/hooks/useEnsureProfile";

export default function UsernameSetupModal() {
  const { isOpen, mode, close } = useAuthModalStore();
  const { setUser } = useAuthStore();
  const createProfile = useMutation(api.profiles.createProfile);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const open = isOpen && mode === "username-setup";

  const handleSubmit = async () => {
    if (!username.trim()) {
      setError("Username is required");
      return;
    }
    try {
      setError(null);
      setIsSubmitting(true);
      const profile = await createProfile({
        username: username.trim(),
        displayName: displayName.trim() || username.trim(),
      });
      if (profile) {
        setUser(profile);
        const { setNeedsUsernameSetup, setProfileReady } = useProfileStore.getState();
        setNeedsUsernameSetup(false);
        setProfileReady(true);
      }
      setUsername("");
      setDisplayName("");
      setError(null);
      close();
    } catch (err: any) {
      const msg = err.message || "Failed to create profile";
      if (msg.includes("USERNAME_TAKEN:")) {
        setError("Username already taken. Please try a different one.");
      } else if (msg.includes("USERNAME_TOO_SHORT:") || msg.includes("USERNAME_TOO_LONG:") || msg.includes("USERNAME_INVALID_CHARS:")) {
        const match = msg.match(/([A-Z_]+):\s*(.+?)(?:\s+at\s+(?:handler|\()|$)/);
        setError(match?.[2]?.trim() || msg);
      } else if (msg.includes("PROFILE_EXISTS:")) {
        setError("Profile already exists.");
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    try {
      await authClient.deleteUser();
      setUsername("");
      setDisplayName("");
      setError(null);
      useAuthStore.getState().setUser(null);
      close();
    } catch (err) {
      console.error("Failed to delete account:", err);
      setError("Failed to delete account. Please try again.");
    }
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Complete Your Profile</AlertDialogTitle>
          <AlertDialogDescription>
            Choose a unique username to complete your profile setup.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="setup-username">Username</Label>
            <Input
              id="setup-username"
              type="text"
              placeholder="johndoe"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(null); }}
              required
              disabled={isSubmitting}
              minLength={3}
              maxLength={15}
            />
            <p className="text-xs text-muted-foreground">
              3-15 characters · Letters, numbers, underscores · Must start with letter or number
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="setup-display-name">Display Name (Optional)</Label>
            <Input
              id="setup-display-name"
              type="text"
              placeholder="John Doe"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setError(null); }}
              disabled={isSubmitting}
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              Your display name shown to others
            </p>
          </div>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={handleCancel}
            disabled={isSubmitting}
            className="text-destructive hover:text-destructive"
          >
            Cancel & Delete Account
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={!username.trim() || isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Profile"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
