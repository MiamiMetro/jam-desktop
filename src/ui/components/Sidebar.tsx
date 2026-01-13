import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { Avatar, AvatarFallback, AvatarImage, AvatarBadge } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  MoreVertical,

  LogIn,
  UserPlus,
  ArrowLeft,
  Plus,
  X,
  Send,
  Check,
  UserCheck,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useAllUsers, useConversations, useMessages, useSendMessage } from "@/hooks/useUsers";
import { useFriends, useFriendRequests, useAcceptFriend, useDeclineFriend } from "@/hooks/useFriends";
import type { User, Message } from "@/lib/api/types";

function Sidebar() {
  const navigate = useNavigate();
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [showSearchUsers, setShowSearchUsers] = useState(false);
  const [showFriendsSearch, setShowFriendsSearch] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  // Debounce search query to avoid excessive API calls (wait 300ms after user stops typing)
  const [debouncedSearchQuery] = useDebouncedValue(userSearchQuery, {
    wait: 300,
  });
  const [selectedChatPartner, setSelectedChatPartner] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const MAX_MESSAGE_LENGTH = 1000;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { isGuest, user } = useAuthStore();
  
  // Reverse infinite scroll: detect when user scrolls near top (load older messages)
  const { ref: loadOlderMessagesRef, inView: topInView } = useInView({
    threshold: 0,
    rootMargin: '200px',
  });
  
  // Infinite scroll for friends list: detect when user scrolls near bottom
  const { ref: loadMoreFriendsRef, inView: friendsInView } = useInView({
    threshold: 0,
    rootMargin: '200px',
  });
  
  // Track if we should auto-scroll to bottom (when new messages arrive)
  const shouldAutoScrollRef = useRef(true);
  // Only fetch all users when searching globally or when we need to find a chat partner
  const shouldFetchAllUsers = showSearchUsers || !!selectedChatPartner;
  // Use debounced query for API calls to reduce requests
  const { 
    data: allUsers = [], 
    fetchNextPage: fetchMoreUsers, 
    hasNextPage: hasMoreUsers, 
    isFetchingNextPage: isLoadingMoreUsers 
  } = useAllUsers(debouncedSearchQuery || undefined, shouldFetchAllUsers);
  const { 
    data: conversations = [], 
    fetchNextPage: _fetchMoreConversations, 
    hasNextPage: _hasMoreConversations, 
    isFetchingNextPage: _isLoadingMoreConversations 
  } = useConversations(user?.id || "");
  const { 
    data: messages = [], 
    fetchNextPage: loadOlderMessages, 
    hasNextPage: hasOlderMessages, 
    isFetchingNextPage: isLoadingOlderMessages 
  } = useMessages(user?.id || "", selectedChatPartner || "");
  const sendMessageMutation = useSendMessage();
  const { 
    data: friends = [], 
    fetchNextPage: fetchMoreFriends, 
    hasNextPage: hasMoreFriends, 
    isFetchingNextPage: isLoadingMoreFriends 
  } = useFriends(showFriendsSearch ? debouncedSearchQuery : undefined);
  const { 
    data: friendRequests = [], 
    fetchNextPage: fetchMoreFriendRequests, 
    hasNextPage: hasMoreFriendRequests, 
    isFetchingNextPage: isLoadingMoreFriendRequests 
  } = useFriendRequests();
  const acceptFriendMutation = useAcceptFriend();
  const declineFriendMutation = useDeclineFriend();
  
  // Store scroll state when loading older messages
  const scrollStateRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const prevMessagesLengthRef = useRef(messages.length);
  
  // Save scroll state before loading older messages
  useEffect(() => {
    if (isLoadingOlderMessages) {
      const container = messagesContainerRef.current;
      if (container) {
        scrollStateRef.current = {
          scrollHeight: container.scrollHeight,
          scrollTop: container.scrollTop,
        };
      }
    }
  }, [isLoadingOlderMessages]);
  
  // Restore scroll position after older messages are loaded (prepended)
  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !selectedChatPartner || !scrollStateRef.current) return;
    
    // Check if messages were prepended (older messages loaded)
    const messagesIncreased = messages.length > prevMessagesLengthRef.current;
    
    if (messagesIncreased && scrollStateRef.current && !shouldAutoScrollRef.current) {
      const { scrollHeight: oldScrollHeight, scrollTop: oldScrollTop } = scrollStateRef.current;
      const newScrollHeight = container.scrollHeight;
      const heightDifference = newScrollHeight - oldScrollHeight;
      
      // Adjust scroll position to maintain the same visual position
      container.scrollTop = oldScrollTop + heightDifference;
      
      scrollStateRef.current = null;
    }
    
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, selectedChatPartner]);
  
  // Auto-load older messages when scrolling to top
  useEffect(() => {
    if (topInView && hasOlderMessages && !isLoadingOlderMessages && selectedChatPartner) {
      loadOlderMessages();
    }
  }, [topInView, hasOlderMessages, isLoadingOlderMessages, selectedChatPartner, loadOlderMessages]);
  
  // Scroll to bottom when new messages arrive (but not when loading older messages)
  useEffect(() => {
    if (shouldAutoScrollRef.current && messagesEndRef.current && selectedChatPartner) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, selectedChatPartner]);
  
  // Reset auto-scroll flag when chat partner changes
  useEffect(() => {
    shouldAutoScrollRef.current = true;
    if (messagesEndRef.current && selectedChatPartner) {
      // Scroll to bottom when opening a conversation
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
    }
  }, [selectedChatPartner]);
  
  // Track scroll position to determine if user scrolled up
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !selectedChatPartner) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      shouldAutoScrollRef.current = isNearBottom;
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [selectedChatPartner]);
  
  // Auto-load more friends when scrolling to bottom (in sidebar)
  useEffect(() => {
    if (friendsInView && hasMoreFriends && !isLoadingMoreFriends && !showFriendsSearch && !userSearchQuery.trim()) {
      fetchMoreFriends();
    }
  }, [friendsInView, hasMoreFriends, isLoadingMoreFriends, showFriendsSearch, userSearchQuery, fetchMoreFriends]);
  
  // Filter users based on search mode
  const getSearchUsers = () => {
    // Don't show any results if there's no search query
    if (!userSearchQuery.trim()) {
      return [];
    }
    
    if (showSearchUsers) {
      // Global search - all users (already filtered by backend)
      return allUsers.filter((user: User) => 
        user.username.toLowerCase().includes(userSearchQuery.toLowerCase())
      );
    } else if (showFriendsSearch) {
      // Friends search - already filtered by backend via useFriends hook
      return friends;
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
    setAuthError(null);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { loginWithCredentials, registerWithCredentials } = useAuthStore.getState();
    
    try {
      setAuthError(null);
      if (isLogin) {
        await loginWithCredentials(email, password);
      } else {
        await registerWithCredentials(email, password, username);
      }
      setShowAuthForm(false);
      setEmail("");
      setPassword("");
      setUsername("");
      setAuthError(null);
    } catch (error: any) {
      // Extract error message from API error response
      const errorMessage = error?.message || 'An error occurred. Please try again.';
      setAuthError(errorMessage);
      console.error('Auth error:', error);
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
              className="relative p-0 m-0 border-0 bg-transparent cursor-pointer hover:opacity-80 transition-opacity"
              aria-label="Go to profile"
            >
              <Avatar size="lg" className="relative ring-2 ring-primary pointer-events-none">
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
                onClick={() => {
                  handleBackToButtons();
                  setAuthError(null);
                }}
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
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setAuthError(null);
                      }}
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
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setAuthError(null);
                    }}
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
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setAuthError(null);
                    }}
                    required
                    className="h-8 text-sm"
                  />
                </div>
                <Button type="submit" className="w-full h-8 text-sm">
                  {isLogin ? "Login" : "Sign Up"}
                </Button>
                {authError && (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                    {authError}
                  </div>
                )}
              </form>
              <div className="mt-3 pt-3 border-t border-sidebar-border">
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setEmail("");
                    setPassword("");
                    setUsername("");
                    setAuthError(null);
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
                        {getSearchUsers().map((searchUser: User) => (
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
                        {/* Load more button for user search results */}
                        {showSearchUsers && hasMoreUsers && (
                          <div className="pt-2 pb-2 border-t border-sidebar-border">
                            <button
                              onClick={() => fetchMoreUsers()}
                              disabled={isLoadingMoreUsers}
                              className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors text-center disabled:opacity-50"
                            >
                              {isLoadingMoreUsers ? 'Loading more...' : 'Load more users'}
                            </button>
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
                  const formatTime = (date: Date | string) => {
                    const dateObj = date instanceof Date ? date : new Date(date);
                    if (isNaN(dateObj.getTime())) return "now"; // Handle invalid dates
                    const now = new Date();
                    const diff = now.getTime() - dateObj.getTime();
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
                                className="p-0 m-0 border-0 bg-transparent cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                                aria-label={`Go to ${chatPartner.username}'s profile`}
                              >
                                <Avatar size="sm" className="relative pointer-events-none">
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
                      <div 
                        ref={messagesContainerRef}
                        className="flex-1 overflow-y-auto"
                      >
                        <div className="px-3 py-2 space-y-2">
                          {/* Infinite scroll trigger at top (load older messages) */}
                          {hasOlderMessages && (
                            <div ref={loadOlderMessagesRef} className="py-2 text-center">
                              {isLoadingOlderMessages && (
                                <div className="text-xs text-muted-foreground">
                                  Loading older messages...
                                </div>
                              )}
                            </div>
                          )}
                          {messages.map((message: Message) => {
                            const isOwn = message.senderId === user?.id;
                            return (
                              <div
                                key={message.id}
                                data-message-id={message.id}
                                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`max-w-[80%] rounded-lg px-2 py-1 text-xs ${
                                    isOwn
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted text-foreground"
                                  }`}
                                >
                                  <div>{message.content || ''}</div>
                                  <div className={`text-[10px] mt-1 ${
                                    isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                                  }`}>
                                    {message.timestamp ? formatTime(message.timestamp) : 'now'}
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
                            maxLength={MAX_MESSAGE_LENGTH}
                            autoFocus
                            onFocus={() => {
                              // Auto-scroll to bottom when input is focused
                              shouldAutoScrollRef.current = true;
                              setTimeout(() => {
                                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                              }, 100);
                            }}
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
            ) : showFriendRequests ? (
              /* Friend Requests Interface */
              <>
                <div className="px-3 py-2 border-b border-sidebar-border">
                  <div className="flex items-center justify-between mb-0">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="h-6 w-6"
                        onClick={() => setShowFriendRequests(false)}
                        title="Back to friends"
                      >
                        <ArrowLeft className="h-3 w-3" />
                      </Button>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground">
                        Friend Requests
                      </h3>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="px-3 py-2">
                    {friendRequests.length === 0 ? (
                      <div className="text-center py-4 text-xs text-muted-foreground">
                        No pending friend requests
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {friendRequests.map((requestUser: User) => (
                          <div
                            key={requestUser.id}
                            className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-sidebar-accent/50 group transition-colors"
                          >
                            <Avatar size="sm" className="relative">
                              <AvatarImage src={requestUser.avatar || ""} alt={requestUser.username} />
                              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                {requestUser.username.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                              <AvatarBadge className={getStatusColor(requestUser.status || 'Offline')} />
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{requestUser.username}</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-500/20"
                              onClick={() => acceptFriendMutation.mutate(requestUser.id)}
                              disabled={acceptFriendMutation.isPending || declineFriendMutation.isPending}
                              title="Accept request"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-500/20"
                              onClick={() => declineFriendMutation.mutate(requestUser.id)}
                              disabled={acceptFriendMutation.isPending || declineFriendMutation.isPending}
                              title="Decline request"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Load more button for friend requests */}
                    {hasMoreFriendRequests && (
                      <div className="pt-2 pb-2 border-t border-sidebar-border mt-2">
                        <button
                          onClick={() => fetchMoreFriendRequests()}
                          disabled={isLoadingMoreFriendRequests}
                          className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors text-center disabled:opacity-50"
                        >
                          {isLoadingMoreFriendRequests ? 'Loading more...' : 'Load more requests'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
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
                      FRIENDS ({showFriendsSearch && userSearchQuery.trim() ? getSearchUsers().length : friends.length})
                    </div>
                    <div className="space-y-1">
                      {(showFriendsSearch && userSearchQuery.trim() ? getSearchUsers() : friends).map((friend: User) => {
                        const conversation = conversations.find((c: { userId: string }) => c.userId === friend.id);
                        return (
                          <div
                            key={friend.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/50 cursor-pointer group transition-colors"
                            onClick={() => {
                              setSelectedChatPartner(friend.id);
                              setShowSearchUsers(false);
                              setShowFriendsSearch(false);
                              setUserSearchQuery("");
                            }}
                          >
                            <Avatar size="sm" className="relative">
                              <AvatarImage src={friend.avatar || ""} alt={friend.username} />
                              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                {friend.username.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                              <AvatarBadge className={getStatusColor(friend.status || 'Offline')} />
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <div className="text-sm font-medium truncate">{friend.username}</div>
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
                      {!showFriendsSearch && !userSearchQuery.trim() && friends.length === 0 && (
                        <div className="text-center py-4 text-xs text-muted-foreground">
                          No friends yet
                        </div>
                      )}
                      {/* Infinite scroll trigger for friends list (when not searching) */}
                      {!showFriendsSearch && !userSearchQuery.trim() && hasMoreFriends && (
                        <div ref={loadMoreFriendsRef} className="py-2 text-center">
                          {isLoadingMoreFriends && (
                            <div className="text-xs text-muted-foreground">
                              Loading more friends...
                            </div>
                          )}
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
              {!isGuest && (
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
              )}
            </div>
            <div className="text-xs text-muted-foreground">v0.0.1</div>
            <div className="flex items-center gap-1">
              {!isGuest && (
                <Button 
                  variant="ghost" 
                  size="icon-xs" 
                  className="h-6 w-6 relative"
                  onClick={() => setShowFriendRequests(true)}
                  title="Friend requests"
                >
                  <UserCheck className="h-3 w-3" />
                  {friendRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] px-1 rounded-full min-w-[16px] text-center">
                      {friendRequests.length}
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;

