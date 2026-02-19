// AppLayout.tsx — Two-panel layout: NavSidebar | MainContent
import { useEffect } from "react";
import NavSidebar from "@/components/navigation/NavSidebar";
import MainContent from "@/layouts/MainContent";
import AuthModalRoot from "@/components/auth/AuthModalRoot";
import { useUIStore } from "@/stores/uiStore";

export default function AppLayout() {
  const { theme } = useUIStore();

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
    <div className="flex h-screen bg-background text-foreground">
      <NavSidebar />
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        <MainContent />
      </div>
      <AuthModalRoot />
    </div>
  );
}
