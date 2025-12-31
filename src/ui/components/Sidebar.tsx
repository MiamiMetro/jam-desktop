import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  MoreVertical,
  Sun,
  Moon,
  Monitor,
  LogIn,
  UserPlus,
  ArrowLeft,
  Plus,
  X,
  Send,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { useOnlineUsers, useAllUsers, useConversations, useMessages, useSendMessage } from "@/hooks/useUsers";

function Sidebar() {
  const navigate = useNavigate();
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showSearchUsers, setShowSearchUsers] = useState(false);
  const [showFriendsSearch, setShowFriendsSearch] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedChatPartner, setSelectedChatPartner] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isGuest, user } = useAuthStore();
  const { theme, setTheme } = useUIStore();
  const { data: onlineUsers = [] } = useOnlineUsers();
  // Only fetch all users when searching globally or when we need to find a chat partner
  const shouldFetchAllUsers = showSearchUsers || !!selectedChatPartner;
  const { data: allUsers = [] } = useAllUsers(userSearchQuery || undefined, shouldFetchAllUsers);
  const { data: conversations = [] } = useConversations(user?.id || "");
  const { data: messages = [] } = useMessages(user?.id || "", selectedChatPartner || "");
  const sendMessageMutation = useSendMessage();
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Filter users based on search mode
  const getSearchUsers = () => {
    // Don't show any results if there's no search query
    if (!userSearchQuery.trim()) {
      return [];
    }
    
    if (showSearchUsers) {
      // Global search - all users
      return allUsers.filter(user => 
        user.username.toLowerCase().includes(userSearchQuery.toLowerCase())
      );
    } else if (showFriendsSearch) {
      // Friends search - only online users (friends)
      return onlineUsers.filter(user => 
        user.username.toLowerCase().includes(userSearchQuery.toLowerCase())
      );
    }
    return [];
  };

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

  const handleAuthClick = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setShowAuthForm(true);
    setEmail("");
    setPassword("");
    setUsername("");
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { loginWithCredentials, registerWithCredentials } = useAuthStore.getState();
    
    try {
      if (isLogin) {
        await loginWithCredentials(email, password);
      } else {
        await registerWithCredentials(email, password, username);
      }
      setShowAuthForm(false);
      setEmail("");
      setPassword("");
      setUsername("");
    } catch (error) {
      // Error handling - could show toast notification here
      console.error('Auth error:', error);
      // For now, just log the error
    }
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
          {!isGuest && user ? (
            <button
              onClick={() => user.username && navigate(`/profile/${user.username}`)}
              className="relative cursor-pointer hover:opacity-80 transition-opacity"
            >
              <Avatar size="lg" className="relative ring-2 ring-primary">
                <AvatarImage src={user?.avatar || ""} alt={user?.username || "Profile"} />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {user?.username?.substring(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
                {user?.status && (
                  <AvatarBadge className={getStatusColor(user.status)} />
                )}
              </Avatar>
            </button>
          ) : (
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
          )}
          <div className="flex-1 min-w-0">
            {!isGuest && user ? (
              <button
                onClick={() => user.username && navigate(`/profile/${user.username}`)}
                className="font-semibold text-sm truncate text-sidebar-foreground hover:underline cursor-pointer block w-full text-left"
                disabled={!user.username}
              >
                {user.username || "User"}
              </button>
            ) : (
              <div className="font-semibold text-sm truncate text-sidebar-foreground">
                {isGuest ? "Guest" : "User"}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {isGuest ? "Not logged in" : (user?.status || "Online")}
            </div>
          </div>
          {!isGuest && (
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button variant="ghost" size="icon-xs" className="h-6 w-6">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              } />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => user?.username && navigate(`/profile/${user.username}`)} disabled={!user?.username}>
                  Profile
                </DropdownMenuItem>
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
            {showSearchUsers ? (
              /* Global Search Interface */
              <div className="flex-1 flex flex-col min-h-0">
                <div className="px-3 py-2 border-b border-sidebar-border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground">
                      Search Users
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="h-6 w-6"
                      onClick={() => {
                        setShowSearchUsers(false);
                        setUserSearchQuery("");
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search all users..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="pl-7 h-7 text-xs"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="px-3 py-2">
                    {!userSearchQuery.trim() ? (
                      <div className="text-center py-4 text-xs text-muted-foreground">
                        Start typing to search for users...
                      </div>
                    ) : (
                      <>
                        {getSearchUsers().map((searchUser) => (
                          <div
                            key={searchUser.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/50 cursor-pointer group transition-colors"
                            onClick={() => {
                              navigate(`/profile/${searchUser.username}`);
                              // Keep search view open for continued searching
                            }}
                          >
                            <Avatar size="sm" className="relative">
                              <AvatarImage src={searchUser.avatar || ""} alt={searchUser.username} />
                              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                {searchUser.username.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                              <AvatarBadge className={getStatusColor(searchUser.status || 'Offline')} />
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{searchUser.username}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {searchUser.statusMessage || searchUser.status}
                              </div>
                            </div>
                          </div>
                        ))}
                        {getSearchUsers().length === 0 && (
                          <div className="text-center py-4 text-xs text-muted-foreground">
                            No users found
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : selectedChatPartner ? (
              /* DM Interface */
              <>
                {(() => {
                  const chatPartner = allUsers.find((u: { id: string }) => u.id === selectedChatPartner);
                  const formatTime = (date: Date) => {
                    const now = new Date();
                    const diff = now.getTime() - date.getTime();
                    const minutes = Math.floor(diff / 60000);
                    if (minutes < 1) return "now";
                    if (minutes < 60) return `${minutes}m ago`;
                    const hours = Math.floor(minutes / 60);
                    if (hours < 24) return `${hours}h ago`;
                    const days = Math.floor(hours / 24);
                    return `${days}d ago`;
                  };
                  
                  const handleSendMessage = () => {
                    if (!messageInput.trim() || !user || !selectedChatPartner) return;
                    sendMessageMutation.mutate({
                      senderId: user.id,
                      receiverId: selectedChatPartner,
                      content: messageInput.trim(),
                    });
                    setMessageInput("");
                  };
                  
                  return (
                    <>
                      <div className="px-3 py-2 border-b border-sidebar-border">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="h-6 w-6"
                            onClick={() => {
                              setSelectedChatPartner(null);
                              setMessageInput("");
                            }}
                          >
                            <ArrowLeft className="h-3 w-3" />
                          </Button>
                          {chatPartner && (
                            <>
                              <button
                                onClick={() => navigate(`/profile/${chatPartner.username}`)}
                                className="cursor-pointer hover:opacity-80 transition-opacity"
                              >
                                <Avatar size="sm" className="relative">
                                  <AvatarImage src={chatPartner.avatar || ""} alt={chatPartner.username} />
                                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                    {chatPartner.username.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                  <AvatarBadge className={getStatusColor(chatPartner?.status || 'Offline')} />
                                </Avatar>
                              </button>
                              <div className="flex-1 min-w-0">
                                <button
                                  onClick={() => navigate(`/profile/${chatPartner.username}`)}
                                  className="text-sm font-medium truncate hover:underline cursor-pointer block w-full text-left"
                                >
                                  {chatPartner.username}
                                </button>
                                <div className="text-xs text-muted-foreground truncate">
                                  {chatPartner.status}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto">
                        <div className="px-3 py-2 space-y-2">
                          {messages.map((message) => {
                            const isOwn = message.senderId === user?.id;
                            return (
                              <div
                                key={message.id}
                                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`max-w-[80%] rounded-lg px-2 py-1 text-xs ${
                                    isOwn
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted text-foreground"
                                  }`}
                                >
                                  <div>{message.content}</div>
                                  <div className={`text-[10px] mt-1 ${
                                    isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                                  }`}>
                                    {formatTime(new Date(message.timestamp))}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={messagesEndRef} />
                        </div>
                      </div>
                      
                      {/* Message Input */}
                      <div className="px-3 py-2 border-t border-sidebar-border">
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            placeholder="Type a message..."
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            className="h-7 text-xs flex-1"
                            autoFocus
                          />
                          <Button
                            variant="default"
                            size="icon-xs"
                            className="h-7 w-7"
                            onClick={handleSendMessage}
                            disabled={!messageInput.trim() || sendMessageMutation.isPending}
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              /* Friends/Chat Interface */
              <>
                <div className="px-3 py-2 border-b border-sidebar-border">
                  <div className="flex items-center justify-between mb-0">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground">
                      Friends
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="h-6 w-6"
                      onClick={() => {
                        setShowFriendsSearch(!showFriendsSearch);
                        if (!showFriendsSearch) {
                          setUserSearchQuery("");
                        }
                      }}
                      title="Search friends"
                    >
                      {showFriendsSearch ? <X className="h-3 w-3" /> : <Search className="h-3 w-3" />}
                    </Button>
                  </div>
                  {showFriendsSearch && (
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search friends..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="pl-7 h-7 text-xs"
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                {/* Friends List with Conversations */}
                <div className="flex-1 overflow-y-auto">
                  <div className="px-3 py-2">
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      ONLINE ({showFriendsSearch && userSearchQuery.trim() ? getSearchUsers().length : onlineUsers.length})
                    </div>
                    <div className="space-y-1">
                      {(showFriendsSearch && userSearchQuery.trim() ? getSearchUsers().slice(0, 50) : onlineUsers.slice(0, 100)).map((onlineUser) => {
                        const conversation = conversations.find(c => c.userId === onlineUser.id);
                        return (
                          <div
                            key={onlineUser.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/50 cursor-pointer group transition-colors"
                            onClick={() => {
                              setSelectedChatPartner(onlineUser.id);
                              setShowSearchUsers(false);
                              setShowFriendsSearch(false);
                              setUserSearchQuery("");
                            }}
                          >
                            <Avatar size="sm" className="relative">
                              <AvatarImage src={onlineUser.avatar || ""} alt={onlineUser.username} />
                              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                {onlineUser.username.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                              <AvatarBadge className={getStatusColor(onlineUser.status || 'Offline')} />
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <div className="text-sm font-medium truncate">{onlineUser.username}</div>
                                {conversation && conversation.unreadCount > 0 && (
                                  <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                    {conversation.unreadCount}
                                  </span>
                                )}
                              </div>
                              {conversation?.lastMessage?.content && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {conversation.lastMessage.content}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {showFriendsSearch && userSearchQuery.trim() && getSearchUsers().length === 0 && (
                        <div className="text-center py-4 text-xs text-muted-foreground">
                          No friends found
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Bottom Section */}
        <div className="border-t border-sidebar-border p-2">
          <div className="flex items-center justify-between mb-0">
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon-xs" 
                className="h-6 w-6"
                onClick={() => {
                  setShowSearchUsers(true);
                  setShowFriendsSearch(false);
                }}
                title="Search all users"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">v0.0.1</div>
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

