// AppLayout.tsx — Two-panel layout: NavSidebar | MainContent (Outlet + JamRoom)
import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NavSidebar from "@/components/navigation/NavSidebar";
import MainContent from "@/layouts/MainContent";
import AuthModalRoot from "@/components/auth/AuthModalRoot";
import { useUIStore } from "@/stores/uiStore";

export default function AppLayout() {
  const { theme, setTheme } = useUIStore();
  const navigate = useNavigate();

  // Keyboard shortcuts: Ctrl/Cmd + 1-4 for nav, Ctrl/Cmd + T for theme
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;

    const routes: Record<string, string> = {
      "1": "/jams",
      "2": "/feed",
      "3": "/friends",
      "4": "/communities",
    };

    if (routes[e.key]) {
      e.preventDefault();
      navigate(routes[e.key]);
    } else if (e.key.toLowerCase() === "t") {
      e.preventDefault();
      const currentTheme =
        theme === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
          : theme;
      setTheme(currentTheme === "dark" ? "light" : "dark");
    }
  }, [navigate, theme, setTheme]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Theme management — dark is the default, light is opt-in
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      if (theme === "system") {
        const isSystemLight = !window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.toggle("dark", !isSystemLight);
        root.classList.toggle("light", isSystemLight);
      } else {
        root.classList.toggle("dark", theme === "dark");
        root.classList.toggle("light", theme === "light");
      }
    };

    applyTheme();

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  return (
    <div className="flex h-screen bg-background text-foreground app-bg">
      <NavSidebar />
      <div className="flex-1 flex flex-col bg-background overflow-hidden relative z-10">
        <MainContent />
      </div>
      <AuthModalRoot />
    </div>
  );
}
