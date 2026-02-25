// NavSidebar.tsx - Warm Studio left navigation sidebar
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Music,
  Rss,
  Users as UsersIcon,
  MessageCircle,
  Sun,
  Moon,
  Activity,
  LogIn,
  LogOut,
  User as UserIcon,
  Settings as SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AvatarBadge, AvatarGroup } from "@/components/ui/avatar";
import { Logo } from "@/components/Logo";
import { api } from "../../../../convex/_generated/api";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { useAuthModalStore } from "@/stores/authModalStore";
import { useJam } from "@/hooks/useJams";
import { useFriends } from "@/hooks/useFriends";
import { useOnlineUsers } from "@/hooks/useUsers";
import { usePresenceStore, type PresenceStatus } from "@/stores/presenceStore";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  matchPrefix?: string;
  shortcut: string;
}

const isMac = navigator.platform.toUpperCase().includes("MAC");
const modKey = isMac ? "\u2318" : "Ctrl+";
const AUTO_AWAY_MS = 5 * 60 * 1000;

const navItems: NavItem[] = [
  { label: "Jams", icon: <Music className="h-5 w-5" />, path: "/jams", shortcut: `${modKey}1` },
  { label: "Feed", icon: <Rss className="h-5 w-5" />, path: "/feed", shortcut: `${modKey}2` },
  {
    label: "Friends",
    icon: <MessageCircle className="h-5 w-5" />,
    path: "/friends",
    shortcut: `${modKey}3`,
  },
  {
    label: "Communities",
    icon: <UsersIcon className="h-5 w-5" />,
    path: "/communities",
    matchPrefix: "/communit",
    shortcut: `${modKey}4`,
  },
];

function getPresenceDotClass(status: PresenceStatus) {
  if (status === "busy") return "!ring-red-500/60";
  if (status === "away") return "!ring-amber-500/60";
  return "!ring-green-500/60";
}

function getPresenceBadgeClass(status: PresenceStatus) {
  if (status === "busy") return "bg-red-500";
  if (status === "away") return "bg-amber-500";
  return "bg-green-500";
}

export default function NavSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isGuest, user } = useAuthStore();
  const { theme, setTheme } = useUIStore();
  const { openLogin } = useAuthModalStore();
  const setMyPresenceStatus = useMutation(api.presence.setMyStatus);
  const manualPresenceStatus = usePresenceStore((state) => state.manualStatus);
  const setManualPresenceStatus = usePresenceStore((state) => state.setManualStatus);
  const setCurrentPresenceStatus = usePresenceStore((state) => state.setCurrentStatus);

  const persistedRoomId = localStorage.getItem("currentJamRoomId");
  const { data: currentRoom } = useJam(persistedRoomId || "");
  const { data: friends = [] } = useFriends();
  const { data: onlineUsers = [] } = useOnlineUsers();

  const [isAutoAway, setIsAutoAway] = useState(false);
  const idleTimeoutRef = useRef<number | null>(null);

  const effectivePresenceStatus: PresenceStatus =
    manualPresenceStatus === "online" && isAutoAway ? "away" : manualPresenceStatus;

  const isActive = (item: NavItem) => {
    if (item.matchPrefix) return location.pathname.startsWith(item.matchPrefix);
    return location.pathname === item.path;
  };

  const isRoomActive = location.pathname.startsWith("/jam/");

  const toggleTheme = useCallback(() => {
    const currentTheme =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;
    setTheme(currentTheme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const syncPresenceStatus = useCallback(
    async (status: PresenceStatus) => {
      if (isGuest || !user) return;
      try {
        await setMyPresenceStatus({ status });
      } catch (error) {
        console.error("Failed to update presence status:", error);
      }
    },
    [isGuest, setMyPresenceStatus, user]
  );

  const clearIdleTimer = useCallback(() => {
    if (idleTimeoutRef.current !== null) {
      window.clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
  }, []);

  const scheduleAutoAway = useCallback(() => {
    clearIdleTimer();
    idleTimeoutRef.current = window.setTimeout(() => {
      setIsAutoAway((prev) => {
        if (!prev) {
          void syncPresenceStatus("away");
        }
        return true;
      });
    }, AUTO_AWAY_MS);
  }, [clearIdleTimer, syncPresenceStatus]);

  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    setCurrentPresenceStatus(effectivePresenceStatus);
  }, [effectivePresenceStatus, setCurrentPresenceStatus]);

  useEffect(() => {
    if (isGuest || !user || manualPresenceStatus !== "online") {
      clearIdleTimer();
      return;
    }

    const handleActivity = () => {
      setIsAutoAway((prev) => {
        if (prev) {
          void syncPresenceStatus("online");
        }
        return false;
      });
      scheduleAutoAway();
    };

    scheduleAutoAway();
    const activityEvents: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
    ];

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, handleActivity);
    }

    return () => {
      clearIdleTimer();
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, handleActivity);
      }
    };
  }, [
    clearIdleTimer,
    isGuest,
    manualPresenceStatus,
    scheduleAutoAway,
    syncPresenceStatus,
    user,
  ]);

  useEffect(() => {
    if (!isGuest) return;
    setManualPresenceStatus("online");
    setCurrentPresenceStatus("online");
    setIsAutoAway(false);
    clearIdleTimer();
  }, [clearIdleTimer, isGuest, setCurrentPresenceStatus, setManualPresenceStatus]);

  useEffect(() => {
    if (isGuest || !user) return;
    void syncPresenceStatus(effectivePresenceStatus);
  }, [effectivePresenceStatus, isGuest, syncPresenceStatus, user?.id]);

  return (
    <div className="w-[220px] min-w-[220px] surface-elevated flex flex-col h-full select-none relative z-10">
      {/* Brand */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => navigate("/")}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 group-hover:bg-primary/20 transition-colors">
            <Logo className="w-5 h-5 opacity-90 group-hover:opacity-100 transition-opacity" />
          </div>
          <h1 className="text-xl font-heading font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
            Jam
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Tooltip key={item.path}>
              <TooltipTrigger
                render={
                  <button
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer relative ${
                      active
                        ? "bg-primary/12 text-primary shadow-inset-primary"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground "
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-primary" />
                    )}
                    <span className={`transition-colors duration-200 ${active ? "text-primary" : ""}`}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </button>
                }
              />
              <TooltipContent side="right">{item.shortcut}</TooltipContent>
            </Tooltip>
          );
        })}

        {/* Active room indicator */}
        {currentRoom && (
          <button
            onClick={() => navigate(`/jam/${persistedRoomId}`)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer relative ${
              isRoomActive
                ? "bg-primary/12 text-primary shadow-inset-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground "
            }`}
          >
            {isRoomActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-primary" />
            )}
            <Music className="h-5 w-5" />
            <span className="truncate flex-1 text-left">{currentRoom.name}</span>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 animate-pulse" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
          </button>
        )}
      </nav>

      {/* Online Friends */}
      {!isGuest &&
        (() => {
          const onlineStatusById = new Map(
            onlineUsers.map((onlineUser) => [String(onlineUser.id), onlineUser.status])
          );
          const onlineFriends = friends.filter(
            (friend) => friend && onlineStatusById.has(String(friend.id))
          );
          if (onlineFriends.length === 0) return null;
          const shown = onlineFriends.slice(0, 4);
          const extra = onlineFriends.length - shown.length;
          return (
            <div className="px-3 pb-2 mt-2 pt-2 border-t border-border/30 mx-3">
              <button onClick={() => navigate("/friends")} className="w-full text-left group cursor-pointer">
                <p className="text-[11px] font-medium text-muted-foreground mb-2 px-1 uppercase tracking-wider">
                  Friends Online
                </p>
                <div className="flex items-center gap-2 px-1">
                  <AvatarGroup>
                    {shown.map((friend) => {
                      if (!friend) return null;
                      const status = onlineStatusById.get(String(friend.id)) ?? "online";
                      return (
                        <Tooltip key={friend.id}>
                          <TooltipTrigger
                            render={
                              <Avatar
                                size="sm"
                                className={`ring-2 ${getPresenceDotClass(status)}`}
                              >
                                <AvatarImage src={friend.avatar_url || ""} alt={friend.username} />
                                <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                                  {friend.username.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                                <AvatarBadge className={getPresenceBadgeClass(status)} />
                              </Avatar>
                            }
                          />
                          <TooltipContent side="top">{friend.username}</TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </AvatarGroup>
                  {extra > 0 && <span className="text-xs text-muted-foreground">+{extra}</span>}
                </div>
              </button>
            </div>
          );
        })()}

      {/* Bottom section */}
      <div className="px-3 pb-3 flex-shrink-0 space-y-2">
        {!isGuest && user ? (
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors duration-200 cursor-pointer">
                    <Avatar
                      size="sm"
                      className={`ring-2 ${getPresenceDotClass(effectivePresenceStatus)} pointer-events-none flex-shrink-0`}
                    >
                      <AvatarImage src={user.avatar_url || ""} alt={user.username || "Profile"} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {user.username?.substring(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate text-foreground">
                      {user.username || "User"}
                    </span>
                  </button>
                }
              />
              <DropdownMenuContent side="top" align="start" sideOffset={4} className="w-48">
                <DropdownMenuItem onClick={() => user.username && navigate(`/profile/${user.username}`)}>
                  <UserIcon className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Activity className="h-4 w-4 mr-2" />
                    Status
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                      value={effectivePresenceStatus}
                      onValueChange={(value) => {
                        const nextStatus = value as PresenceStatus;
                        setManualPresenceStatus(nextStatus);
                        if (nextStatus !== "online") {
                          clearIdleTimer();
                        } else {
                          scheduleAutoAway();
                        }
                        setIsAutoAway(false);
                        void syncPresenceStatus(nextStatus);
                      }}
                    >
                      <DropdownMenuRadioItem value="online">Online</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="away">Away</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="busy">Busy</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleTheme}>
                  {isDark ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                  {isDark ? "Light Mode" : "Dark Mode"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => useAuthStore.getState().logout()}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Button variant="default" className="w-full animate-glow-pulse" onClick={openLogin}>
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Button>
        )}
      </div>
    </div>
  );
}
