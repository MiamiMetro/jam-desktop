// Logo.tsx — Reusable app logo, theme-aware
import { useUIStore } from "@/stores/uiStore";

interface LogoProps {
  className?: string;
}

export function Logo({ className = "w-5 h-5" }: LogoProps) {
  const { theme } = useUIStore();
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <img
      src={isDark ? "./logo-sidebar-dark.svg" : "./logo-sidebar-light.svg"}
      alt="Jam"
      className={className}
    />
  );
}
