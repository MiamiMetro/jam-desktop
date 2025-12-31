import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage, AvatarBadge } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  Settings, 
  MessageCircle, 
  MoreVertical,
  Sun,
  Moon,
  Monitor,
  LogIn,
  UserPlus,
  ArrowLeft,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { useOnlineUsers } from "@/hooks/useUsers";

interface SidebarProps {}

function Sidebar({}: SidebarProps) {
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const { isGuest, user } = useAuthStore();
  const { theme, setTheme } = useUIStore();
  const { data: onlineUsers = [] } = useOnlineUsers();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Online":
      case "In Game":
      case "In Queue":
        return "bg-green-500";
      case "Away":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getCurrentTheme = () => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme;
  };

  const handleAuthClick = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setShowAuthForm(true);
    setEmail("");
    setPassword("");
    setUsername("");
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      // TODO: Implement actual login
      useAuthStore.getState().login({
        id: "1",
        username: email.split("@")[0] || "User",
        status: "Online",
        level: 1,
      });
    } else {
      // TODO: Implement actual signup
      useAuthStore.getState().login({
        id: "1",
        username: username || email.split("@")[0] || "User",
        status: "Online",
        level: 1,
      });
    }
    setShowAuthForm(false);
    setEmail("");
    setPassword("");
    setUsername("");
  };

  const handleBackToButtons = () => {
    setShowAuthForm(false);
    setEmail("");
    setPassword("");
    setUsername("");
  };

  return (
    <div className="w-64 bg-sidebar border-l border-sidebar-border flex flex-col">
      {/* Profile Section - Show for both guest and logged in */}
      <div className="p-3 border-b border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar size="lg" className="relative ring-2 ring-primary">
              <AvatarImage src={user?.avatar || ""} alt={isGuest ? "Guest" : user?.username || "Profile"} />
              <AvatarFallback className="bg-muted text-muted-foreground">
                {isGuest ? "GU" : (user?.username?.substring(0, 2).toUpperCase() || "U")}
              </AvatarFallback>
              {!isGuest && user?.status && (
                <AvatarBadge className={getStatusColor(user.status)} />
              )}
            </Avatar>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate text-sidebar-foreground">
              {isGuest ? "Guest" : (user?.username || "User")}
            </div>
            <div className="text-xs text-muted-foreground">
              {isGuest ? "Not logged in" : (user?.status || "Online")}
            </div>
            {!isGuest && user?.level && (
              <div className="text-xs text-muted-foreground">Level {user.level}</div>
            )}
          </div>
          {!isGuest && (
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button variant="ghost" size="icon-xs" className="h-6 w-6">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              } />
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => useAuthStore.getState().logout()}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Friends/Login Section */}
      <div className="flex-1 flex flex-col min-h-0">
        {isGuest ? (
          showAuthForm ? (
            /* Auth Form */
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToButtons}
                className="mb-4 text-xs"
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                Back
              </Button>
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-1">
                  {isLogin ? "Login" : "Sign Up"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isLogin 
                    ? "Enter your credentials to continue"
                    : "Create an account to join communities, post, and jam!"}
                </p>
              </div>
              <form onSubmit={handleAuthSubmit} className="space-y-3">
                {!isLogin && (
                  <div className="space-y-1.5">
                    <Label htmlFor="sidebar-username" className="text-xs">Username</Label>
                    <Input
                      id="sidebar-username"
                      type="text"
                      placeholder="Choose a username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required={!isLogin}
                      className="h-8 text-sm"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="sidebar-email" className="text-xs">Email</Label>
                  <Input
                    id="sidebar-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sidebar-password" className="text-xs">Password</Label>
                  <Input
                    id="sidebar-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-8 text-sm"
                  />
                </div>
                <Button type="submit" className="w-full h-8 text-sm">
                  {isLogin ? "Login" : "Sign Up"}
                </Button>
              </form>
              <div className="mt-3 pt-3 border-t border-sidebar-border">
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setEmail("");
                    setPassword("");
                    setUsername("");
                  }}
                  className="text-xs text-muted-foreground hover:text-sidebar-foreground transition-colors w-full text-center"
                >
                  {isLogin ? (
                    <>Don't have an account? <span className="font-medium text-primary">Sign up</span></>
                  ) : (
                    <>Already have an account? <span className="font-medium text-primary">Login</span></>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Guest Login/Signup Buttons */
            <div className="flex-1 flex flex-col justify-center px-3 py-4">
              <div className="space-y-3">
                <Button 
                  variant="default" 
                  className="w-full"
                  onClick={() => handleAuthClick(true)}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleAuthClick(false)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Sign Up
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Sign up to join communities, post, and jam!
              </p>
            </div>
          )
        ) : (
          <>
            <div className="px-3 py-2 border-b border-sidebar-border">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground">
                  Friends
                </h3>
                <Button variant="ghost" size="icon-xs" className="h-6 w-6" title="Search">
                  <Search className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Friends List */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-3 py-2">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  ONLINE ({onlineUsers.length})
                </div>
                <div className="space-y-1">
                  {onlineUsers.map((onlineUser) => (
                    <div
                      key={onlineUser.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/50 cursor-pointer group transition-colors"
                      onClick={() => {
                        // TODO: Navigate to profile
                        console.log("Profile:", onlineUser.username);
                      }}
                    >
                      <Avatar size="sm" className="relative">
                        <AvatarImage src={onlineUser.avatar || ""} alt={onlineUser.username} />
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                          {onlineUser.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                        <AvatarBadge className={getStatusColor(onlineUser.status)} />
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{onlineUser.username}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {onlineUser.statusMessage || onlineUser.status}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MessageCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Bottom Section */}
        <div className="border-t border-sidebar-border p-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-xs" className="h-6 w-6">
                <MessageCircle className="h-3 w-3" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">v1.0.0</div>
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button variant="ghost" size="icon-xs" className="h-6 w-6">
                  <Settings className="h-3 w-3" />
                </Button>
              } />
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Appearance</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setTheme("light")}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    Light
                  </div>
                  {theme === "light" && <span className="text-xs">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme("dark")}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Dark
                  </div>
                  {theme === "dark" && <span className="text-xs">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme("system")}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    System
                  </div>
                  {theme === "system" && <span className="text-xs">✓</span>}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;

