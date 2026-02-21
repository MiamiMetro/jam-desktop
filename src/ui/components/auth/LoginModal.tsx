// LoginModal.tsx — Login form using shared AuthModalShell
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/authStore";
import { useAuthModalStore } from "@/stores/authModalStore";
import { AuthModalShell } from "./AuthModalShell";

export default function LoginModal() {
  const location = useLocation();
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
      sessionStorage.setItem("auth_return_path", location.pathname);
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
    <AuthModalShell
      open={open}
      onClose={handleClose}
      title="Welcome back"
      description="Sign in to continue making music"
      submitLabel="Login"
      loadingLabel="Logging in..."
      isSubmitting={isSubmitting}
      error={error}
      onSubmit={handleSubmit}
      footerText="Don't have an account?"
      footerLinkText="Sign up"
      onFooterLink={() => {
        setEmail(""); setPassword(""); setError(null);
        openSignup();
      }}
    >
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
          className="h-10 glass border-border/50 focus:ring-primary/30"
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
          className="h-10 glass border-border/50 focus:ring-primary/30"
        />
      </div>
    </AuthModalShell>
  );
}
