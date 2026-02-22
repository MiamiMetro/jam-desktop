// SignupModal.tsx — Signup form using shared AuthModalShell
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useAuthModalStore } from "@/stores/authModalStore";
import { AuthModalShell } from "./AuthModalShell";

export default function SignupModal() {
  const location = useLocation();
  const { isOpen, mode, close, openLogin, openUsernameSetup } = useAuthModalStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    <AuthModalShell
      open={open}
      onClose={handleClose}
      title="Join the session"
      description="Create your account and start jamming"
      submitLabel="Continue"
      loadingLabel="Creating account..."
      isSubmitting={isSubmitting}
      error={error}
      onSubmit={handleSubmit}
      footerText="Already have an account?"
      footerLinkText="Login"
      onFooterLink={() => {
        setEmail(""); setPassword(""); setConfirmPassword(""); setError(null);
        openLogin();
      }}
    >
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
          className="h-10 glass-solid border-border/50 focus:ring-primary/30"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signup-password" className="text-xs">Password</Label>
        <div className="relative">
          <Input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            required
            disabled={isSubmitting}
            className="h-10 glass-solid border-border/50 focus:ring-primary/30 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signup-confirm" className="text-xs">Confirm Password</Label>
        <div className="relative">
          <Input
            id="signup-confirm"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
            required
            disabled={isSubmitting}
            className="h-10 glass-solid border-border/50 focus:ring-primary/30 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </AuthModalShell>
  );
}
