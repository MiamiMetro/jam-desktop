import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMe, useSoftDeleteProfile, useUpdateProfile } from "@/hooks/useUsers";
import { useAuthStore } from "@/stores/authStore";
import { useConvexAuthStore } from "@/hooks/useConvexAuth";
import { useProfileStore } from "@/hooks/useEnsureProfile";
import { authClient } from "@/lib/auth-client";

export default function Settings() {
  const navigate = useNavigate();
  const { data: me, isLoading } = useMe();
  const { data: session } = authClient.useSession();
  const { setUser, setPendingProfile, setIsGuest } = useAuthStore();
  const updateProfile = useUpdateProfile();
  const softDeleteProfile = useSoftDeleteProfile();

  const [username, setUsername] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const toFriendlyError = (raw: unknown): string => {
    const message = typeof raw === "string" ? raw : (raw as any)?.message ?? "Request failed.";
    if (message.includes("USERNAME_TAKEN:")) return "Username is already taken.";
    if (message.includes("USERNAME_TOO_SHORT:")) return "Username must be at least 3 characters.";
    if (message.includes("USERNAME_TOO_LONG:")) return "Username must be 15 characters or less.";
    if (message.includes("USERNAME_RESERVED:")) return "This username is reserved.";
    if (message.includes("USERNAME_INVALID_CHARS:")) return "Username must start with a letter or number, and can only contain letters, numbers, and underscores.";
    if (message.includes("Rate limit exceeded")) return "Too many requests. Please wait and try again.";
    if (message.includes("PROFILE_LOCKED:")) return "This account cannot be edited right now.";
    if (message.includes("ACCOUNT_STATE_TRANSITION_INVALID:")) return "Account state does not allow this action.";
    return message;
  };

  useEffect(() => {
    if (!me) return;
    setUsername(me.username ?? "");
  }, [me?.id, me?.username]);

  const usernameChanged = useMemo(() => {
    if (!me) return false;
    return username.trim() !== (me.username ?? "");
  }, [me, username]);

  const handleSaveUsername = async () => {
    if (!me || !usernameChanged) return;
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const updated = await updateProfile.mutateAsync({
        username: username.trim() || undefined,
        dm_privacy: "friends",
      });
      setUser(updated);
      setSaveSuccess("Username updated.");
      setUsername(updated.username ?? "");
    } catch (error) {
      setSaveError(toFriendlyError(error));
    }
  };

  const handleSoftDelete = async () => {
    setDeleteError(null);

    if (deleteConfirm.trim() !== "DELETE") {
      setDeleteError('Type "DELETE" to continue.');
      return;
    }

    setIsDeleting(true);
    try {
      await softDeleteProfile.mutateAsync();
      await authClient.deleteUser();

      useConvexAuthStore.getState().setIsAuthSet(false);
      useProfileStore.getState().setProfileReady(false);
      useProfileStore.getState().setNeedsUsernameSetup(false);
      setPendingProfile(null);
      setUser(null);
      setIsGuest(true);

      navigate("/jams", { replace: true });
    } catch (error) {
      setDeleteError(toFriendlyError(error));
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
          <div className="h-8 w-8 rounded animate-shimmer" />
          <div className="h-4 w-28 rounded animate-shimmer" />
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="max-w-3xl mx-auto">
            <div className="h-36 w-full rounded-lg animate-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-heading font-semibold text-muted-foreground">Settings</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="max-w-3xl mx-auto">
            <p className="text-sm text-muted-foreground mb-4">
              Sign in to manage your settings.
            </p>
            <Button variant="outline" onClick={() => navigate("/jams")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h2 className="text-sm font-heading font-semibold text-muted-foreground">Settings</h2>
          <p className="text-xs text-muted-foreground/80">Account and security management.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="w-full max-w-3xl mx-auto space-y-6">
          <section className="rounded-xl border border-border glass-solid p-4 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Account</h2>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={15}
                className="bg-muted/50 border-transparent focus:bg-background focus:border-border"
              />
              <p className="text-xs text-muted-foreground">
                Display name, bio, avatar, banner, and musician profile are edited from your Profile page.
              </p>
              <div className="pt-1">
                <Button onClick={handleSaveUsername} disabled={!usernameChanged || updateProfile.isPending}>
                  {updateProfile.isPending ? "Saving..." : "Save Username"}
                </Button>
              </div>
              {saveError && <p className="text-sm text-destructive">{saveError}</p>}
              {saveSuccess && <p className="text-sm text-green-600 dark:text-green-400">{saveSuccess}</p>}
            </div>

            <div className="pt-2 border-t border-border/40">
              <p className="text-xs text-muted-foreground">DM privacy is currently fixed to friends-only.</p>
            </div>
          </section>

          <section className="rounded-xl border border-border glass-solid p-4 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Security</h2>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Email</label>
              <Input
                value={session?.user?.email ?? "No email provider connected"}
                readOnly
                disabled
                className="opacity-100"
              />
              <p className="text-xs text-muted-foreground">Email change will be available after email provider setup.</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Password</label>
              <div className="flex items-center gap-2">
                <Input value="********" readOnly disabled className="opacity-100" />
                <Button type="button" variant="outline" disabled className="shrink-0">
                  Change Password
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Password change will be enabled in a future update.</p>
            </div>
          </section>

          <section className="rounded-xl border border-destructive/40 p-4 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-destructive">Danger Zone</h2>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <ShieldAlert className="h-4 w-4 mt-0.5 text-destructive" />
              <p>
                Soft delete your account. Posts and DMs remain, but your identity is anonymized.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Type DELETE to confirm</label>
              <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} />
            </div>
            {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
            <Button variant="destructive" onClick={handleSoftDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete Account"}
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
