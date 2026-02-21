// AuthModalShell.tsx — Shared branded auth modal base (header, gradient, form wrapper, footer)
import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { Logo } from "@/components/Logo";

interface AuthModalShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  submitLabel: string;
  loadingLabel: string;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  footerText: string;
  footerLinkText: string;
  onFooterLink: () => void;
  children: ReactNode;
}

export function AuthModalShell({
  open,
  onClose,
  title,
  description,
  submitLabel,
  loadingLabel,
  isSubmitting,
  error,
  onSubmit,
  footerText,
  footerLinkText,
  onFooterLink,
  children,
}: AuthModalShellProps) {
  const { theme } = useUIStore();
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        {/* Branded header */}
        <div className="relative bg-gradient-to-br from-primary/15 via-primary/8 to-transparent px-6 pt-6 pb-4">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1 -m-1"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/15">
              <Logo className="w-5 h-5 opacity-90" />
            </div>
            <span className="font-heading font-bold text-lg tracking-tight">Jam</span>
          </div>
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-semibold">{title}</DialogTitle>
            <DialogDescription className="text-xs">{description}</DialogDescription>
          </DialogHeader>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-3 px-6 pb-2">
          {children}
          <Button type="submit" className="w-full h-10 glow-primary font-heading font-semibold" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                {loadingLabel}
              </span>
            ) : (
              submitLabel
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
            onClick={onFooterLink}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center cursor-pointer"
          >
            {footerText} <span className="font-medium text-primary hover:underline">{footerLinkText}</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
