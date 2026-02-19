// UsernameSetupModal.tsx — Branded username setup after signup
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music } from "lucide-react";
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
      <AlertDialogContent className="max-w-md p-0 overflow-hidden">
        {/* Branded header */}
        <div className="bg-gradient-to-br from-primary/15 via-primary/8 to-transparent px-6 pt-6 pb-4 animate-page-in">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/15">
              <Music className="h-4.5 w-4.5 text-primary" />
            </div>
            <span className="font-heading font-bold text-lg tracking-tight">Jam</span>
          </div>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-heading font-semibold">Almost there!</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Pick a name for the stage
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        {/* Form */}
        <div className="space-y-4 px-6 pb-2">
          <div className="space-y-2">
            <Label htmlFor="setup-username" className="text-xs">Username</Label>
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
              className="h-10 glass border-border/50 focus:ring-primary/30"
            />
            <p className="text-xs text-muted-foreground">
              3-15 characters · Letters, numbers, underscores · Must start with letter or number
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="setup-display-name" className="text-xs">Display Name (Optional)</Label>
            <Input
              id="setup-display-name"
              type="text"
              placeholder="John Doe"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setError(null); }}
              disabled={isSubmitting}
              maxLength={50}
              className="h-10 glass border-border/50 focus:ring-primary/30"
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
          <Button
            onClick={handleSubmit}
            disabled={!username.trim() || isSubmitting}
            className="w-full h-10 glow-primary font-heading font-semibold"
          >
            {isSubmitting ? "Creating..." : "Create Profile"}
          </Button>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-2 border-t border-primary/10">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors w-full text-center cursor-pointer disabled:opacity-50"
          >
            Cancel & Delete Account
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
