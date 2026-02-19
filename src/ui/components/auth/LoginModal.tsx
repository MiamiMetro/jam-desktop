// LoginModal.tsx — Login modal with email/password
import { useState } from "react";
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
import { X } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useAuthModalStore } from "@/stores/authModalStore";

export default function LoginModal() {
  const { isOpen, mode, close, openSignup } = useAuthModalStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const open = isOpen && mode === "login";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setIsSubmitting(true);
      await useAuthStore.getState().loginWithCredentials(email, password);
      setEmail("");
      setPassword("");
      setError(null);
      close();
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setPassword("");
    setError(null);
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm">
        <div className="flex items-start justify-between">
          <DialogHeader className="flex-1">
            <DialogTitle>Login</DialogTitle>
            <DialogDescription>
              Enter your credentials to continue
            </DialogDescription>
          </DialogHeader>
          <button
            type="button"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1 -m-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="login-email" className="text-xs">Email</Label>
            <Input
              id="login-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-password" className="text-xs">Password</Label>
            <Input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              required
              disabled={isSubmitting}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                Logging in...
              </span>
            ) : (
              "Login"
            )}
          </Button>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </form>
        <div className="pt-2 border-t border-border">
          <button
            type="button"
            onClick={() => {
              setEmail(""); setPassword(""); setError(null);
              openSignup();
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center cursor-pointer"
          >
            Don't have an account? <span className="font-medium text-primary hover:underline">Sign up</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
