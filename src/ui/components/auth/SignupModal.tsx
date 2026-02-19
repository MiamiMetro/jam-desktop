// SignupModal.tsx — Branded signup modal with warm studio aesthetic
import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music, X } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useAuthModalStore } from "@/stores/authModalStore";

export default function SignupModal() {
  const location = useLocation();
  const { isOpen, mode, close, openLogin, openUsernameSetup } = useAuthModalStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const open = isOpen && mode === "signup";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    try {
      setError(null);
      setIsSubmitting(true);
      // Save current path so we can restore it after auth redirects
      sessionStorage.setItem("auth_return_path", location.pathname);
      await useAuthStore.getState().registerWithCredentials(email, password);
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setError(null);
      openUsernameSetup();
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        {/* Branded header */}
        <div className="relative bg-gradient-to-br from-primary/15 via-primary/8 to-transparent px-6 pt-6 pb-4">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1 -m-1"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/15">
              <Music className="h-4.5 w-4.5 text-primary" />
            </div>
            <span className="font-heading font-bold text-lg tracking-tight">Jam</span>
          </div>
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-semibold">Join the session</DialogTitle>
            <DialogDescription className="text-xs">
              Create your account and start jamming
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 px-6 pb-2">
          <div className="space-y-1.5">
            <Label htmlFor="signup-email" className="text-xs">Email</Label>
            <Input
              id="signup-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              required
              disabled={isSubmitting}
              className="h-10 glass border-border/50 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signup-password" className="text-xs">Password</Label>
            <Input
              id="signup-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              required
              disabled={isSubmitting}
              className="h-10 glass border-border/50 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signup-confirm" className="text-xs">Confirm Password</Label>
            <Input
              id="signup-confirm"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
              required
              disabled={isSubmitting}
              className="h-10 glass border-border/50 focus:ring-primary/30"
            />
          </div>
          <Button type="submit" className="w-full h-10 glow-primary font-heading font-semibold" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                Creating account...
              </span>
            ) : (
              "Continue"
            )}
          </Button>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 pb-5 pt-2 border-t border-primary/10">
          <button
            type="button"
            onClick={() => {
              setEmail(""); setPassword(""); setConfirmPassword(""); setError(null);
              openLogin();
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center cursor-pointer"
          >
            Already have an account? <span className="font-medium text-primary hover:underline">Login</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
