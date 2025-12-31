import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Sun,
  Moon,
  Music,
  Users as UsersIcon,
  User,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import Sidebar from "@/components/Sidebar";
import FeedTab from "@/components/FeedTab";
import JamsTab from "@/components/JamsTab";
import CommunitiesTab from "@/components/CommunitiesTab";

function MainPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Determine current tab from pathname
  const getCurrentTab = () => {
    if (location.pathname.startsWith("/community/")) return "communities";
    if (location.pathname === "/jams") return "jams";
    if (location.pathname === "/communities") return "communities";
    return "feed"; // default to feed
  };
  
  const tab = getCurrentTab();
  
  const { theme, setTheme } = useUIStore();
  const { isGuest } = useAuthStore();

  // Theme management
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      if (theme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        root.classList.toggle("dark", systemTheme === "dark");
      } else {
        root.classList.toggle("dark", theme === "dark");
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

  const getCurrentTheme = () => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme;
  };

  const toggleTheme = () => {
    const currentTheme = getCurrentTheme();
    setTheme(currentTheme === "dark" ? "light" : "dark");
  };

  const handleTabChange = (newTab: "feed" | "jams" | "communities") => {
    navigate(`/${newTab}`);
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Main Section */}
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-4 py-3 bg-background sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleTabChange("feed")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === "feed"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Feed
              </button>
              <button
                onClick={() => handleTabChange("jams")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  tab === "jams"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Music className="h-4 w-4" />
                Jams
              </button>
              <button
                onClick={() => handleTabChange("communities")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  tab === "communities"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <UsersIcon className="h-4 w-4" />
                Communities
              </button>
            </div>
            <div className="flex items-center gap-2">
              {/* Debug Switch - Toggle Guest/Logged In */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (isGuest) {
                    useAuthStore.getState().login({
                      id: "1",
                      username: "Tylobic",
                      status: "Online",
                      level: 40,
                    });
                  } else {
                    useAuthStore.getState().logout();
                  }
                }}
                className="h-8 w-8"
                title={isGuest ? "Switch to logged in mode" : "Switch to guest mode"}
              >
                <User className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-8 w-8"
              >
                {getCurrentTheme() === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {location.pathname.startsWith("/community/") || location.pathname === "/communities" ? (
            <CommunitiesTab />
          ) : tab === "jams" ? (
            <JamsTab />
          ) : (
            <FeedTab />
          )}
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar />
    </div>
  );
}

export default MainPage;

