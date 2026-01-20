import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutoLinkedText } from "@/components/AutoLinkedText";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  ChevronDown,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useEnsureProfile, useProfileStore } from "@/hooks/useEnsureProfile";
import { useAllUsers, useConversations, useMessages, useSendMessage, useMarkAsRead } from "@/hooks/useUsers";
import { useFriends, useFriendRequests, useSentFriendRequests, useAcceptFriend, useDeclineFriend, useCancelFriendRequest } from "@/hooks/useFriends";
import type { User } from "@/lib/api/types";

// Helper type for message with creation time
type MessageWithTime = {
  id: string;
  senderId?: string;
  _creationTime?: number;
};

/**
 * Determines if the "New Messages" divider should be shown before a message.
 * Shows divider for:
 * 1. Historical unread messages (from before opening conversation)
 * 2. Messages that arrived while user was scrolled up
 */
function shouldShowUnreadDivider(
  message: MessageWithTime,
  index: number,
  messages: MessageWithTime[],
  isOwn: boolean,
  lastReadMessageAt: number | null,
  conversationOpenedAt: number | null,
  scrollUpStartMessageId: string | null
): boolean {
  const messageTime = message._creationTime;
  
  // Historical unread: messages newer than lastReadMessageAt but older than when we opened
  const isHistoricalUnread = 
    !isOwn &&
    lastReadMessageAt != null &&
    messageTime != null &&
    messageTime > lastReadMessageAt &&
    (conversationOpenedAt == null || messageTime < conversationOpenedAt);
  
  // Check if this is the first message after where user scrolled up
  const isFirstAfterScrollUp = 
    !isOwn &&
    scrollUpStartMessageId != null &&
    index > 0 &&
    messages[index - 1]?.id === scrollUpStartMessageId;
  
  // Is this the first unread message?
  const isFirstHistoricalUnread = 
    isHistoricalUnread && 
    (index === 0 || (messages[index - 1]._creationTime ?? 0) <= (lastReadMessageAt ?? 0));
  
  return isFirstHistoricalUnread || isFirstAfterScrollUp;
}

function Sidebar() {
  const navigate = useNavigate();
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [showUsernameStep, setShowUsernameStep] = useState(false);
  const [showSearchUsers, setShowSearchUsers] = useState(false);
  const [showFriendsSearch, setShowFriendsSearch] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showPendingRequests, setShowPendingRequests] = useState(true);
  const [showSentRequests, setShowSentRequests] = useState(true);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  // Debounce search query to avoid excessive API calls (wait 300ms after user stops typing)
  const [debouncedSearchQuery] = useDebouncedValue(userSearchQuery, {
    wait: 300,
  });
  const [selectedChatPartner, setSelectedChatPartner] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const MAX_MESSAGE_LENGTH = 300; // Keep in sync with convex/helpers.ts MAX_LENGTHS.MESSAGE_TEXT
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { isGuest, user, setUser } = useAuthStore();

  // Check if profile exists for authenticated users
  useEnsureProfile();
  const { needsUsernameSetup } = useProfileStore();

  // Mutation for creating profile
  const createProfile = useMutation(api.profiles.createProfile);

  // If user is authenticated but has no profile, show username step
  useEffect(() => {
    if (needsUsernameSetup && !showUsernameStep && !isGuest) {
      setShowAuthForm(true);
      setShowUsernameStep(true);
    }
  }, [needsUsernameSetup, showUsernameStep, isGuest]);

  // Track if we should auto-scroll to bottom (when new messages arrive)
  const shouldAutoScrollRef = useRef(true);
  // Track if user just sent a message (force scroll to bottom)
  const justSentMessageRef = useRef(false);
  // Track if user is scrolled up (for showing scroll-to-bottom button)
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  // Track new messages that arrived while scrolled up
  const [newMessagesWhileScrolledUp, setNewMessagesWhileScrolledUp] = useState(0);
  // Track the message ID where "scroll up" started (for divider placement)
  // Using state instead of ref so it can be safely read during render
  const [scrollUpStartMessageId, setScrollUpStartMessageId] = useState<string | null>(null);
  // Only fetch all users when we have a search query OR when we need to find a chat partner
  // Don't fetch when just opening search without typing
  const shouldFetchAllUsers = (showSearchUsers && !!debouncedSearchQuery.trim()) || !!selectedChatPartner;
  // Use debounced query for API calls to reduce requests
  const { 
    data: allUsers = [], 
    fetchNextPage: fetchMoreUsers, 
    hasNextPage: hasMoreUsers, 
    isFetchingNextPage: isLoadingMoreUsers,
    isLoading: isLoadingAllUsers
  } = useAllUsers(debouncedSearchQuery.trim() || undefined, shouldFetchAllUsers);
  const { 
    data: conversations = []
  } = useConversations(user?.id || "");
  const { 
    data: messages = [], 
    fetchNextPage: loadOlderMessages, 
    hasNextPage: hasOlderMessages, 
    isFetchingNextPage: isLoadingOlderMessages,
    lastReadMessageAt,
    conversationOpenedAt,
    otherParticipantLastRead,
  } = useMessages(user?.id || "", selectedChatPartner || "");
  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkAsRead();
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
  const {
    data: sentRequests = [],
    fetchNextPage: fetchMoreSentRequests,
    hasNextPage: hasMoreSentRequests,
    isFetchingNextPage: isLoadingMoreSentRequests
  } = useSentFriendRequests();
  const acceptFriendMutation = useAcceptFriend();
  const declineFriendMutation = useDeclineFriend();
  const cancelFriendMutation = useCancelFriendRequest();
  
  // Store scroll state when loading older messages
  const scrollStateRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const prevMessagesLengthRef = useRef(messages.length);
  // Track if we're actively loading older messages
  const isLoadingOlderRef = useRef(false);
  // Track if we just loaded older messages (to skip auto-scroll for that render)
  const justLoadedOlderMessagesRef = useRef(false);
  
  // Save scroll state when starting to load older messages
  useEffect(() => {
    if (isLoadingOlderMessages && !isLoadingOlderRef.current) {
      // Just started loading
      isLoadingOlderRef.current = true;
      const container = messagesContainerRef.current;
      if (container) {
        scrollStateRef.current = {
          scrollHeight: container.scrollHeight,
          scrollTop: container.scrollTop,
        };
      }
    } else if (!isLoadingOlderMessages) {
      isLoadingOlderRef.current = false;
    }
  }, [isLoadingOlderMessages]);
  
  // Restore scroll position after older messages are loaded (prepended)
  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !selectedChatPartner) return;
    
    // Check if messages were prepended (older messages loaded)
    const messagesIncreased = messages.length > prevMessagesLengthRef.current;
    
    // Only restore scroll if we have saved state AND loading just finished
    if (messagesIncreased && scrollStateRef.current && !isLoadingOlderMessages) {
      const { scrollHeight: oldScrollHeight, scrollTop: oldScrollTop } = scrollStateRef.current;
      const newScrollHeight = container.scrollHeight;
      const heightDifference = newScrollHeight - oldScrollHeight;
      
      // Adjust scroll position to maintain the same visual position
      container.scrollTop = oldScrollTop + heightDifference;
      
      // Clear the saved state immediately
      scrollStateRef.current = null;
      // Mark that we just loaded older messages - skip auto-scroll effect
      justLoadedOlderMessagesRef.current = true;
    }
    
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, selectedChatPartner, isLoadingOlderMessages]);
  
  // Get the last message ID to detect new messages (length might not change after 50)
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1]?.id : null;
  
  // Scroll to bottom when new messages arrive (but not when loading older messages)
  useEffect(() => {
    // Skip if we just loaded older messages (they're prepended, not appended)
    if (justLoadedOlderMessagesRef.current) {
      justLoadedOlderMessagesRef.current = false;
      return;
    }
    
    const scrollToBottom = () => {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    };
    
    // Force scroll if user just sent a message
    if (justSentMessageRef.current) {
      justSentMessageRef.current = false;
      // Use setTimeout to ensure DOM is updated
      setTimeout(scrollToBottom, 0);
      setTimeout(scrollToBottom, 100); // Backup scroll
      return;
    }
    
    if (shouldAutoScrollRef.current && selectedChatPartner) {
      scrollToBottom();
    }
  }, [lastMessageId, selectedChatPartner]); // Use lastMessageId instead of messages.length
  
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
    
    // Capture current value to avoid stale closure
    let currentScrollUpStartId = scrollUpStartMessageId;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      shouldAutoScrollRef.current = isNearBottom;
      
      // Update scrolled up state for UI (button visibility)
      const wasScrolledUp = !shouldAutoScrollRef.current;
      setIsScrolledUp(!isNearBottom);
      
      // When user scrolls back to bottom, reset new messages counter
      if (isNearBottom && wasScrolledUp) {
        setNewMessagesWhileScrolledUp(0);
        setScrollUpStartMessageId(null);
        currentScrollUpStartId = null;
      }
      
      // When user starts scrolling up, record the last message ID
      if (!isNearBottom && !currentScrollUpStartId && messages.length > 0) {
        const newId = messages[messages.length - 1]?.id || null;
        setScrollUpStartMessageId(newId);
        currentScrollUpStartId = newId;
      }
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [selectedChatPartner, messages, scrollUpStartMessageId]);
  
  // Track the last message ID to detect NEW messages (not older messages from "Load more")
  const lastMessageIdRef = useRef<string | null>(null);
  
  // Track new messages arriving while scrolled up
  // Only count as "new" if the LAST message changed (new message at end)
  // Not when older messages are prepended via "Load more"
  useEffect(() => {
    const currentLastId = messages.length > 0 ? messages[messages.length - 1]?.id : null;
    
    if (isScrolledUp && currentLastId && lastMessageIdRef.current && currentLastId !== lastMessageIdRef.current) {
      // Last message changed = new message arrived at the end
      setNewMessagesWhileScrolledUp(prev => prev + 1);
    }
    
    lastMessageIdRef.current = currentLastId ?? null;
  }, [messages, isScrolledUp]);
  
  // Reset ALL scroll state when conversation changes
  // This is a valid pattern for resetting state when a key prop changes
  useEffect(() => {
    setIsScrolledUp(false);
    setNewMessagesWhileScrolledUp(0);
    setSendError(null);
    setScrollUpStartMessageId(null);
    lastMessageIdRef.current = null;
    // Reset load-more related refs
    scrollStateRef.current = null;
    isLoadingOlderRef.current = false;
    justLoadedOlderMessagesRef.current = false;
    justSentMessageRef.current = false;
    prevMessagesLengthRef.current = 0;
    shouldAutoScrollRef.current = true;
  }, [selectedChatPartner]);

  // Track if user has been in the conversation long enough (to mark on leave)
  const canMarkOnLeaveRef = useRef(false);
  const currentPartnerRef = useRef<string | null>(null);
  // Track if we've already marked this "unread session" - reset when hasUnread transitions
  const hasMarkedCurrentUnreadRef = useRef(false);
  const prevHasUnreadRef = useRef(false);
  
  // Find current conversation's unread state
  const currentConversation = conversations.find((c) => String(c.userId) === String(selectedChatPartner));
  const hasUnread = currentConversation?.hasUnread ?? false;
  
  // Reset mark flag when hasUnread transitions from false to true (new incoming message)
  useEffect(() => {
    if (hasUnread && !prevHasUnreadRef.current) {
      // New unread messages arrived - allow re-marking
      hasMarkedCurrentUnreadRef.current = false;
    }
    prevHasUnreadRef.current = hasUnread;
  }, [hasUnread]);
  
  // Mark as read when user is in conversation with unread messages
  // Uses 1 second debounce to avoid excessive function calls
  useEffect(() => {
    if (!selectedChatPartner) {
      canMarkOnLeaveRef.current = false;
      return;
    }
    
    // Track current partner for cleanup
    currentPartnerRef.current = selectedChatPartner;
    
    // Don't mark if not unread or already marked this batch
    if (!hasUnread) return;
    if (hasMarkedCurrentUnreadRef.current) return;
    
    // After 500ms, enable "mark on leave" behavior
    const enableLeaveTimer = setTimeout(() => {
      canMarkOnLeaveRef.current = true;
    }, 500);
    
    // Debounce: mark as read after 1 second of viewing
    const timer = setTimeout(() => {
      markAsReadMutation.mutate(selectedChatPartner);
      hasMarkedCurrentUnreadRef.current = true;
      canMarkOnLeaveRef.current = false;
    }, 1000);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(enableLeaveTimer);
      // Mark as read on cleanup if user was in chat long enough
      if (canMarkOnLeaveRef.current && currentPartnerRef.current && !hasMarkedCurrentUnreadRef.current) {
        markAsReadMutation.mutate(currentPartnerRef.current);
        hasMarkedCurrentUnreadRef.current = true;
      }
      canMarkOnLeaveRef.current = false;
    };
  }, [selectedChatPartner, hasUnread, markAsReadMutation]);
  
  // Reset refs when conversation changes
  useEffect(() => {
    hasMarkedCurrentUnreadRef.current = false;
    prevHasUnreadRef.current = false;
    canMarkOnLeaveRef.current = false;
  }, [selectedChatPartner]);
  
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

  // Status functionality removed - not available in Convex User type

  const handleAuthClick = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setShowAuthForm(true);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setAuthError(null);
    setShowUsernameStep(false);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { loginWithCredentials, registerWithCredentials } = useAuthStore.getState();

    try {
      setAuthError(null);
      setIsAuthSubmitting(true);

      if (isLogin) {
        await loginWithCredentials(email, password);
        setShowAuthForm(false);
        setEmail("");
        setPassword("");
        setAuthError(null);
      } else {
        // Validate password match
        if (password !== confirmPassword) {
          setAuthError("Passwords don't match");
          setIsAuthSubmitting(false);
          return;
        }

        // Create auth account
        await registerWithCredentials(email, password);

        // Show username step
        setShowUsernameStep(true);
        setAuthError(null);
      }
    } catch (error: unknown) {
      // Extract error message from API error response
      let errorMessage = 'An error occurred. Please try again.';

      if (error && typeof error === 'object') {
        // Check if it's a structured error with message property
        if ('message' in error && typeof error.message === 'string') {
          errorMessage = error.message;
        }
        // Check for better-auth style errors
        else if ('code' in error && 'message' in error) {
          errorMessage = (error as any).message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setAuthError(errorMessage);
      console.error('Auth error:', error);
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleBackToButtons = () => {
    setShowAuthForm(false);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowUsernameStep(false);
  };

  const handleUsernameSubmit = async () => {
    if (!username.trim()) {
      setAuthError("Username is required");
      return;
    }

    try {
      setAuthError(null);
      setIsAuthSubmitting(true);

      // Create profile with username
      const profile = await createProfile({
        username: username.trim(),
        displayName: displayName.trim() || username.trim(),
      });

      // Update user in store and mark profile as ready
      if (profile) {
        setUser(profile);
        // Clear the needsUsernameSetup flag
        const { setNeedsUsernameSetup, setProfileReady } = useProfileStore.getState();
        setNeedsUsernameSetup(false);
        setProfileReady(true);
      }

      // Close form and reset
      setShowAuthForm(false);
      setShowUsernameStep(false);
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setUsername("");
      setDisplayName("");
      setAuthError(null);
    } catch (error: any) {
      // Parse error code from error message
      // Convex format: "[requestId] Server Error Uncaught Error: ERROR_CODE: message at handler..."
      const errorMessage = error.message || "Failed to create profile";

      // Extract clean error message from our error codes
      const extractMessage = (msg: string) => {
        // Find the error code pattern and extract everything after it
        // Match until " at handler" or " at (" (stack trace patterns) or end of string
        const match = msg.match(/([A-Z_]+):\s*(.+?)(?:\s+at\s+(?:handler|\()|$)/);
        if (match && match[2]) {
          return match[2].trim();
        }
        // Fallback: return the original message
        return msg;
      };

      if (errorMessage.includes("USERNAME_TAKEN:")) {
        setAuthError("Username already taken. Please try a different one.");
      } else if (errorMessage.includes("USERNAME_TOO_SHORT:")) {
        setAuthError(extractMessage(errorMessage));
      } else if (errorMessage.includes("USERNAME_TOO_LONG:")) {
        setAuthError(extractMessage(errorMessage));
      } else if (errorMessage.includes("USERNAME_INVALID_CHARS:")) {
        setAuthError(extractMessage(errorMessage));
      } else if (errorMessage.includes("USERNAME_REQUIRED:")) {
        setAuthError(extractMessage(errorMessage));
      } else if (errorMessage.includes("PROFILE_EXISTS:")) {
        setAuthError(extractMessage(errorMessage));
      } else if (errorMessage.includes("PROFILE_CREATE_FAILED:")) {
        setAuthError(extractMessage(errorMessage));
      } else {
        setAuthError(errorMessage);
      }
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleCancelUsernameSetup = async () => {
    try {
      // Delete the auth account (permanently removes user from database)
      await authClient.deleteUser();

      // Reset form
      setShowAuthForm(false);
      setShowUsernameStep(false);
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setUsername("");
      setDisplayName("");
      setAuthError(null);

      // Clear user state
      setUser(null);
    } catch (error) {
      console.error("Failed to delete account:", error);
      setAuthError("Failed to delete account. Please try again.");
    }
  };

  // Handle sending a message - defined at component level to avoid ref access during render
  const handleSendMessage = () => {
    if (!messageInput.trim() || !user || !selectedChatPartner) return;
    
    // Reset all scroll state BEFORE sending - ensure we scroll to see sent message
    shouldAutoScrollRef.current = true;
    justSentMessageRef.current = true;
    justLoadedOlderMessagesRef.current = false;
    setIsScrolledUp(false);
    setNewMessagesWhileScrolledUp(0);
    setScrollUpStartMessageId(null);
    
    // Clear any previous error
    setSendError(null);
    
    sendMessageMutation.mutate(
      {
        senderId: user.id,
        receiverId: selectedChatPartner,
        content: messageInput.trim(),
      },
      {
        onError: (error) => {
          // Show error message (e.g., rate limit)
          const errorMessage = error.message || "Failed to send message";
          if (errorMessage.includes("Rate limit")) {
            setSendError("Slow down! Please wait a moment before sending again.");
          } else {
            setSendError(errorMessage);
          }
          // Auto-clear error after 5 seconds
          setTimeout(() => setSendError(null), 5000);
        },
      }
    );
    setMessageInput("");
  };

  // Format time for message timestamps
  const formatTime = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return "now";
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
                <AvatarImage src={user?.avatar_url || ""} alt={user?.username || "Profile"} />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {user?.username?.substring(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
                {/* Status not available in Convex User type */}
              </Avatar>
            </button>
          ) : (
            <div className="relative">
              <Avatar size="lg" className="relative ring-2 ring-primary">
                <AvatarImage src={user?.avatar_url || ""} alt={isGuest ? "Guest" : user?.username || "Profile"} />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {isGuest ? "GU" : (user?.username?.substring(0, 2).toUpperCase() || "U")}
                </AvatarFallback>
                {/* Status not available in Convex User type */}
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
              {isGuest ? "Not logged in" : "Online"}
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

              {/* Email + Password (Login or Signup) */}
              {(
                <form onSubmit={handleAuthSubmit} className="space-y-3">
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
                      disabled={isAuthSubmitting}
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
                      disabled={isAuthSubmitting}
                      className="h-8 text-sm"
                    />
                  </div>
                  {!isLogin && (
                    <div className="space-y-1.5">
                      <Label htmlFor="sidebar-confirm-password" className="text-xs">Confirm Password</Label>
                      <Input
                        id="sidebar-confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setAuthError(null);
                        }}
                        required={!isLogin}
                        disabled={isAuthSubmitting}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                  <Button type="submit" className="w-full h-8 text-sm" disabled={isAuthSubmitting}>
                    {isAuthSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                        {isLogin ? "Logging in..." : "Creating account..."}
                      </span>
                    ) : (
                      isLogin ? "Login" : "Continue"
                    )}
                  </Button>
                  {authError && (
                    <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                      {authError}
                    </div>
                  )}
                </form>
              )}

              {/* Step 2: Username Setup (Only after signup) */}
              {showUsernameStep && (
                <form onSubmit={handleUsernameSubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="sidebar-username" className="text-xs">Username *</Label>
                    <Input
                      id="sidebar-username"
                      type="text"
                      placeholder="johndoe"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setAuthError(null);
                      }}
                      required
                      disabled={isAuthSubmitting}
                      minLength={3}
                      maxLength={30}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sidebar-display-name" className="text-xs">Display Name (optional)</Label>
                    <Input
                      id="sidebar-display-name"
                      type="text"
                      placeholder="John Doe"
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value);
                        setAuthError(null);
                      }}
                      disabled={isAuthSubmitting}
                      maxLength={50}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelUsernameSetup}
                      disabled={isAuthSubmitting}
                      className="flex-1 h-8 text-sm"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isAuthSubmitting} className="flex-1 h-8 text-sm">
                      {isAuthSubmitting ? (
                        <span className="flex items-center gap-2">
                          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                          Creating...
                        </span>
                      ) : (
                        "Create Profile"
                      )}
                    </Button>
                  </div>
                  {authError && (
                    <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                      {authError}
                    </div>
                  )}
                </form>
              )}
              {!showUsernameStep && (
                <div className="mt-3 pt-3 border-t border-sidebar-border">
                  <button
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setEmail("");
                      setPassword("");
                      setConfirmPassword("");
                      setAuthError(null);
                    }}
                    className="text-xs text-muted-foreground hover:text-sidebar-foreground transition-colors w-full text-center cursor-pointer"
                  >
                    {isLogin ? (
                      <>Don't have an account? <span className="font-medium text-primary hover:underline">Sign up</span></>
                    ) : (
                      <>Already have an account? <span className="font-medium text-primary hover:underline">Login</span></>
                    )}
                  </button>
                </div>
              )}
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
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground flex" />
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
                        {/* Show loading state while debouncing or fetching */}
                        {isLoadingAllUsers || userSearchQuery.trim() !== debouncedSearchQuery.trim() ? (
                          <div className="text-center py-4 text-xs text-muted-foreground">
                            Searching...
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
                                  <AvatarImage src={searchUser.avatar_url || ""} alt={searchUser.username} />
                                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                    {searchUser.username.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                  {/* Status not available in Convex User type */}
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{searchUser.username}</div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {/* Status not available in Convex User type */}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {/* Only show "No users found" after search has completed and there are no results */}
                            {getSearchUsers().length === 0 && (
                              <div className="text-center py-4 text-xs text-muted-foreground">
                                No users found
                              </div>
                            )}
                            {/* Load more button for user search results - only show when we have results */}
                            {showSearchUsers && hasMoreUsers && getSearchUsers().length > 0 && (
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
                                className="p-0 m-0 border-0 bg-transparent cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                                aria-label={`Go to ${chatPartner.username}'s profile`}
                              >
                                <Avatar size="sm" className="relative pointer-events-none">
                                  <AvatarImage src={chatPartner.avatar_url || ""} alt={chatPartner.username} />
                                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                    {chatPartner.username.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                  {/* Status not available in Convex User type */}
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
                                  {/* Status not available in Convex User type */}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Messages */}
                      <div 
                        ref={messagesContainerRef}
                        className="flex-1 overflow-y-auto relative"
                      >
                        <div className="px-3 py-2 space-y-2">
                          {/* Load More button at top (load older messages) */}
                          {hasOlderMessages && (
                            <div className="py-2 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => loadOlderMessages()}
                                disabled={isLoadingOlderMessages}
                                className="text-xs text-muted-foreground hover:text-foreground"
                              >
                                {isLoadingOlderMessages ? "Loading..." : "Load older messages"}
                              </Button>
                            </div>
                          )}
                          {messages.map((message: any, index: number) => {
                            const isOwn = message.senderId === user?.id;
                            const isFirstUnread = shouldShowUnreadDivider(
                              message,
                              index,
                              messages,
                              isOwn,
                              lastReadMessageAt,
                              conversationOpenedAt,
                              scrollUpStartMessageId
                            );
                            
                            return (
                              <div key={message.id}>
                                {/* New Messages divider - only for messages from others */}
                                {isFirstUnread && (
                                  <div className="flex items-center gap-2 py-2">
                                    <div className="flex-1 h-px bg-primary/30" />
                                    <span className="text-[10px] text-primary font-medium px-2">
                                      New Messages
                                    </span>
                                    <div className="flex-1 h-px bg-primary/30" />
                                  </div>
                                )}
                                <div
                                  data-message-id={message.id}
                                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                                >
                                  <div
                                    className={`max-w-[80%] rounded-lg px-2 py-1 text-xs wrap-break-word ${
                                      isOwn
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-foreground"
                                    }`}
                                  >
                                    <AutoLinkedText
                                      text={message.content || ''}
                                      className="wrap-break-word whitespace-pre-wrap"
                                      linkClassName={isOwn ? "underline text-primary-foreground hover:opacity-80" : "underline text-blue-500 hover:text-blue-600"}
                                    />
                                    <div className={`text-[10px] mt-1 flex items-center gap-1 ${
                                      isOwn ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"
                                    }`}>
                                      <span>{message.timestamp ? formatTime(message.timestamp) : 'now'}</span>
                                      {/* 
                                        Read indicator for sent messages - dot style
                                        A message is marked as "Read" when its _creationTime (timestamp when the message was created)
                                        is less than or equal to otherParticipantLastRead (the last timestamp when the other user
                                        marked messages as read). Otherwise, it's marked as "Delivered".
                                      */}
                                      {isOwn && (
                                        <span 
                                          className={`inline-block w-1.5 h-1.5 rounded-full ${
                                            message._creationTime && otherParticipantLastRead && message._creationTime <= otherParticipantLastRead
                                              ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)]" // Read - glowing teal/emerald
                                              : "bg-primary-foreground/40" // Delivered - muted
                                          }`}
                                          title={
                                            message._creationTime && otherParticipantLastRead && message._creationTime <= otherParticipantLastRead
                                              ? "Read"
                                              : "Delivered"
                                          }
                                        />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={messagesEndRef} />
                        </div>
                        
                        {/* Scroll to bottom button - shows when scrolled up */}
                        {isScrolledUp && (
                          <div className="sticky bottom-2 flex justify-end pr-4 pointer-events-none">
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-8 w-8 rounded-full shadow-md relative pointer-events-auto"
                              onClick={() => {
                                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                                shouldAutoScrollRef.current = true;
                                setNewMessagesWhileScrolledUp(0);
                                setScrollUpStartMessageId(null);
                              }}
                            >
                              <ChevronDown className="h-4 w-4" />
                              {newMessagesWhileScrolledUp > 0 && (
                                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                                  {newMessagesWhileScrolledUp > 99 ? "99+" : newMessagesWhileScrolledUp}
                                </span>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {/* Error indicator */}
                      {sendError && (
                        <div className="px-3 py-2 border-t border-orange-500/30 bg-orange-500/10">
                          <div className="flex items-center gap-2 text-xs text-orange-400">
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                            {sendError}
                          </div>
                        </div>
                      )}
                      
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
              /* Friend Requests Interface with Collapsible Sections */
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
                  <div className="px-3 py-2 space-y-3">
                    {/* Pending Requests Section (Incoming) */}
                    <div>
                      <button
                        onClick={() => setShowPendingRequests(!showPendingRequests)}
                        className="w-full flex items-center justify-between py-2 text-xs font-medium text-sidebar-foreground hover:text-primary transition-colors cursor-pointer"
                      >
                        <span className="uppercase tracking-wider">
                          Pending ({friendRequests.length})
                        </span>
                        <ChevronDown
                          className={`h-3 w-3 transition-transform ${
                            showPendingRequests ? "" : "-rotate-90"
                          }`}
                        />
                      </button>
                      {showPendingRequests && (
                        <>
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
                                    <AvatarImage src={requestUser.avatar_url || ""} alt={requestUser.username} />
                                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                      {requestUser.username.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
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
                          {/* Load more button for pending requests */}
                          {hasMoreFriendRequests && (
                            <div className="pt-2 pb-2 border-t border-sidebar-border mt-2">
                              <button
                                onClick={() => fetchMoreFriendRequests()}
                                disabled={isLoadingMoreFriendRequests}
                                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors text-center disabled:opacity-50"
                              >
                                {isLoadingMoreFriendRequests ? 'Loading more...' : 'Load more'}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Sent Requests Section (Outgoing) */}
                    <div>
                      <button
                        onClick={() => setShowSentRequests(!showSentRequests)}
                        className="w-full flex items-center justify-between py-2 text-xs font-medium text-sidebar-foreground hover:text-primary transition-colors cursor-pointer"
                      >
                        <span className="uppercase tracking-wider">
                          Sent ({sentRequests.length})
                        </span>
                        <ChevronDown
                          className={`h-3 w-3 transition-transform ${
                            showSentRequests ? "" : "-rotate-90"
                          }`}
                        />
                      </button>
                      {showSentRequests && (
                        <>
                          {sentRequests.length === 0 ? (
                            <div className="text-center py-4 text-xs text-muted-foreground">
                              No sent requests
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {sentRequests.map((requestUser: User) => (
                                <div
                                  key={requestUser.id}
                                  className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-sidebar-accent/50 group transition-colors"
                                >
                                  <Avatar size="sm" className="relative">
                                    <AvatarImage src={requestUser.avatar_url || ""} alt={requestUser.username} />
                                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                      {requestUser.username.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{requestUser.username}</div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-500/20"
                                    onClick={() => cancelFriendMutation.mutate(requestUser.id)}
                                    disabled={cancelFriendMutation.isPending}
                                    title="Cancel request"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Load more button for sent requests */}
                          {hasMoreSentRequests && (
                            <div className="pt-2 pb-2 border-t border-sidebar-border mt-2">
                              <button
                                onClick={() => fetchMoreSentRequests()}
                                disabled={isLoadingMoreSentRequests}
                                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors text-center disabled:opacity-50"
                              >
                                {isLoadingMoreSentRequests ? 'Loading more...' : 'Load more'}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
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
                    <div className="relative mt-2">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground flex items-center justify-center" />
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
                      {(() => {
                        // Get the list to display (search results or all friends)
                        const friendsList = showFriendsSearch && userSearchQuery.trim() ? getSearchUsers() : friends;

                        // Sort friends: prioritize those with conversations (by last message time), then others
                        const sortedFriends = [...friendsList].sort((a, b) => {
                          const convA = conversations.find((c) => String(c.userId) === String(a.id));
                          const convB = conversations.find((c) => String(c.userId) === String(b.id));

                          // If both have conversations, sort by last message time
                          if (convA && convB) {
                            const timeA = convA.lastMessage?.timestamp
                              ? new Date(convA.lastMessage.timestamp).getTime()
                              : 0;
                            const timeB = convB.lastMessage?.timestamp
                              ? new Date(convB.lastMessage.timestamp).getTime()
                              : 0;
                            return timeB - timeA; // Most recent first
                          }

                          // Friends with conversations come first
                          if (convA && !convB) return -1;
                          if (!convA && convB) return 1;

                          // Both have no conversations, maintain original order
                          return 0;
                        });

                        return sortedFriends.map((friend: User) => {
                          const conversation = conversations.find((c) => String(c.userId) === String(friend.id));
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
                                <AvatarImage src={friend.avatar_url || ""} alt={friend.username} />
                                <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                  {friend.username.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                                {/* Status not available in Convex User type */}
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{friend.username}</div>
                                {conversation?.lastMessage?.content && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    {conversation.lastMessage.content}
                                  </div>
                                )}
                              </div>
                              {/* Unread dot indicator - right side, bright orange */}
                              {conversation?.hasUnread && (
                                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0 shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
                              )}
                            </div>
                          );
                        });
                      })()}
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
                    </div>
                    {/* Load More button for friends list (when not searching) */}
                    {!showFriendsSearch && !userSearchQuery.trim() && hasMoreFriends && (
                      <div className="pt-2 pb-2 border-t border-sidebar-border">
                        <button
                          onClick={() => fetchMoreFriends()}
                          disabled={isLoadingMoreFriends}
                          className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors text-center disabled:opacity-50"
                        >
                          {isLoadingMoreFriends ? 'Loading more...' : 'Load more friends'}
                        </button>
                      </div>
                    )}
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
                  onClick={() => {
                    setShowFriendRequests(true);
                    setShowSearchUsers(false);
                    setSelectedChatPartner(null);
                  }}
                  title="Friend requests"
                >
                  <UserCheck className="h-3 w-3" />
                  {friendRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] px-1 rounded-full min-w-4 text-center">
                      {friendRequests.length}
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Username Setup Dialog */}
      <AlertDialog open={showUsernameStep} onOpenChange={setShowUsernameStep}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Your Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Choose a unique username to complete your profile setup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setAuthError(null);
                }}
                required
                disabled={isAuthSubmitting}
                minLength={3}
                maxLength={15}
                pattern="[a-zA-Z0-9][a-zA-Z0-9_]*"
              />
              <p className="text-xs text-muted-foreground">
                3-15 characters · Letters, numbers, underscores · Must start with letter or number
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name (Optional)</Label>
              <Input
                id="display-name"
                type="text"
                placeholder="John Doe"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setAuthError(null);
                }}
                disabled={isAuthSubmitting}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                Your display name shown to others
              </p>
            </div>
            {authError && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                {authError}
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleCancelUsernameSetup}
              disabled={isAuthSubmitting}
              className="text-destructive hover:text-destructive"
            >
              Cancel & Delete Account
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUsernameSubmit}
              disabled={!username.trim() || isAuthSubmitting}
            >
              {isAuthSubmitting ? "Creating..." : "Create Profile"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Sidebar;

