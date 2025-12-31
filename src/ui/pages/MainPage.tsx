import { useEffect, useRef, useState } from "react";
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
import Profile from "@/pages/Profile";
import Post from "@/pages/Post";
import JamRoom from "@/pages/JamRoom";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { useJam } from "@/hooks/useJams";

function MainPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Check if we're in a jam room from URL
  const jamRoomMatch = location.pathname.match(/^\/jam\/(.+)$/);
  const urlRoomId = jamRoomMatch ? jamRoomMatch[1] : null;
  
  // Get persisted room ID from localStorage
  const [persistedRoomId, setPersistedRoomId] = useState<string | null>(() => {
    return localStorage.getItem("currentJamRoomId");
  });
  
  // Use URL room ID if present, otherwise use persisted
  const jamRoomId = urlRoomId || persistedRoomId;
  
  // Update persisted room ID when URL changes (joining a room)
  useEffect(() => {
    if (urlRoomId) {
      // If joining a new room (different from current), update the persisted room ID
      // This will automatically replace the old room tab with the new one
      if (urlRoomId !== persistedRoomId) {
        localStorage.setItem("currentJamRoomId", urlRoomId);
        setPersistedRoomId(urlRoomId);
      }
    }
  }, [urlRoomId, persistedRoomId]);
  
  // Sync persisted room ID with localStorage (for when leaving room)
  // This ensures the tab is removed when localStorage is cleared
  useEffect(() => {
    const storedRoomId = localStorage.getItem("currentJamRoomId");
    // Update state if localStorage value differs (handles leaving room)
    if (storedRoomId !== persistedRoomId) {
      setPersistedRoomId(storedRoomId);
    }
  }, [location.pathname]);
  
  const { data: currentRoom } = useJam(jamRoomId || "");
  
  // Function to clear room (when leaving)
  const clearRoom = () => {
    localStorage.removeItem("currentJamRoomId");
    setPersistedRoomId(null);
  };
  
  // Determine current tab from pathname
  // Room tab is only selected when actually viewing the room page
  const getCurrentTab = () => {
    if (location.pathname.startsWith("/profile/")) return null; // No tab selected for profile
    if (location.pathname.startsWith("/post/")) return null; // No tab selected for post
    if (location.pathname.startsWith("/jam/")) return "room"; // Room tab selected only when viewing room
    if (location.pathname.startsWith("/community/")) return "communities";
    if (location.pathname === "/jams") return "jams";
    if (location.pathname === "/communities") return "communities";
    return "feed"; // default to feed
  };
  
  const tab = getCurrentTab();
  
  const { theme, setTheme } = useUIStore();
  const { isGuest } = useAuthStore();
  
  // Restore scroll position when navigating
  useScrollRestoration(scrollContainerRef);

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
    // If we're in a room, navigate to the tab but keep the room tab visible
    // The room tab will stay selected because tab === "room" when jamRoomId exists
    navigate(`/${newTab}`);
  };

  const handleRoomTabClick = () => {
    if (jamRoomId) {
      navigate(`/jam/${jamRoomId}`);
    }
  };
  
  // Expose clearRoom function to child components via context or prop
  // For now, we'll pass it through navigate state or use a different approach

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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  tab === "feed"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Feed
              </button>
              <button
                onClick={() => handleTabChange("jams")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer ${
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                  tab === "communities"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <UsersIcon className="h-4 w-4" />
                Communities
              </button>
              {currentRoom && (
                <button
                  onClick={handleRoomTabClick}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer relative ${
                    tab === "room"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Music className="h-4 w-4" />
                  {currentRoom.name}
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                </button>
              )}
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

        {/* Tab Content - Keep all components mounted to preserve state and data */}
        {location.pathname.startsWith("/jam/") ? (
          <div className="flex-1 overflow-hidden">
            <JamRoom />
          </div>
        ) : (
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
            <div style={{ display: location.pathname.startsWith("/profile/") || location.pathname.startsWith("/post/") ? "none" : location.pathname === "/feed" ? "block" : "none" }}>
              <FeedTab />
            </div>
            <div style={{ display: location.pathname.startsWith("/profile/") || location.pathname.startsWith("/post/") ? "none" : location.pathname === "/jams" ? "block" : "none" }}>
              <JamsTab />
            </div>
            <div style={{ display: location.pathname.startsWith("/profile/") || location.pathname.startsWith("/post/") ? "none" : location.pathname.startsWith("/community/") || location.pathname === "/communities" ? "block" : "none" }}>
              <CommunitiesTab />
            </div>
            <div style={{ display: location.pathname.startsWith("/profile/") ? "block" : "none" }}>
              <Profile />
            </div>
            <div style={{ display: location.pathname.startsWith("/post/") ? "block" : "none" }}>
              <Post />
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <Sidebar />
    </div>
  );
}

export default MainPage;

