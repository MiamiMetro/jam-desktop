// FriendsTab.tsx — Twitter DM-style split panel: conversation list left, active view right
import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage, AvatarBadge } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  UserCheck,
  Users,
  MessageCircle,
  X,
  ArrowLeft,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useAuthModalStore } from "@/stores/authModalStore";
import { useFriends, useFriendRequests } from "@/hooks/useFriends";
import { useConversations, useOnlineUsers } from "@/hooks/useUsers";
import DMConversation from "@/components/social/DMConversation";
import UserSearchPanel from "@/components/social/UserSearchPanel";
import FriendRequestsPanel from "@/components/social/FriendRequestsPanel";
import type { User } from "@/lib/api/types";

type LeftView = "conversations" | "search" | "requests";

function FriendsTab() {
  const { isGuest, user } = useAuthStore();
  const { openLogin } = useAuthModalStore();
  const { data: friendRequests = [] } = useFriendRequests();
  const { data: friends = [] } = useFriends();
  const { data: conversations = [] } = useConversations(user?.id || "");
  const { data: onlineUsers = [] } = useOnlineUsers();
  const onlineIds = new Set(onlineUsers.map(u => u.id));

  const [searchParams, setSearchParams] = useSearchParams();
  const activeDmPartnerId = searchParams.get("dm");
  const setActiveDmPartnerId = useCallback((id: string | null) => {
    if (id) {
      setSearchParams({ dm: id });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [setSearchParams]);

  const [leftView, setLeftView] = useState<LeftView>("conversations");
  const [friendSearch, setFriendSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  // Sort friends by last message time
  const sortedFriends = [...friends].sort((a: User, b: User) => {
    const convA = conversations.find((c) => String(c.userId) === String(a.id));
    const convB = conversations.find((c) => String(c.userId) === String(b.id));
    if (convA && convB) {
      const timeA = convA.lastMessage?.timestamp ? new Date(convA.lastMessage.timestamp).getTime() : 0;
      const timeB = convB.lastMessage?.timestamp ? new Date(convB.lastMessage.timestamp).getTime() : 0;
      return timeB - timeA;
    }
    if (convA && !convB) return -1;
    if (!convA && convB) return 1;
    return 0;
  });

  const filteredFriends = friendSearch.trim()
    ? sortedFriends.filter((f: User) =>
        f.username.toLowerCase().includes(friendSearch.toLowerCase())
      )
    : sortedFriends;

  const handleSelectFriend = (friendId: string) => {
    setActiveDmPartnerId(friendId);
    setLeftView("conversations");
  };

  if (isGuest) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 text-center">
        <div className="rounded-2xl glass-strong px-10 py-8 flex flex-col items-center gap-4 max-w-sm animate-page-in">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-heading font-bold">Messages</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sign in to connect with friends, send messages, and find new people
          </p>
          <Button variant="default" onClick={openLogin}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {/* ─── Left Panel: Conversations ─── */}
      <div className="w-[320px] min-w-[320px] surface-elevated flex flex-col h-full">
        {/* Left Header */}
        <div className="px-4 pt-3 pb-3 flex-shrink-0 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-heading font-semibold text-muted-foreground">Messages</h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 rounded-full ${leftView === "search" ? "bg-primary/10 text-primary" : ""}`}
                onClick={() => {
                  if (leftView === "search") {
                    setLeftView("conversations");
                    setUserSearch("");
                  } else {
                    setLeftView("search");
                  }
                }}
                title="Find people"
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 rounded-full relative ${leftView === "requests" ? "bg-primary/10 text-primary" : ""}`}
                onClick={() => setLeftView(leftView === "requests" ? "conversations" : "requests")}
                title="Friend requests"
              >
                <UserCheck className="h-4 w-4" />
                {friendRequests.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] px-1 rounded-full min-w-3.5 h-3.5 flex items-center justify-center leading-none">
                    {friendRequests.length}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Search input — changes based on current view */}
          {leftView === "conversations" && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search conversations..."
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                className="pl-9 h-9 text-sm bg-muted/50 border-transparent focus:bg-background focus:border-border"
              />
              {friendSearch && (
                <button
                  onClick={() => setFriendSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          {leftView === "search" && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search by username..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9 h-9 text-sm bg-muted/50 border-transparent focus:bg-background focus:border-border"
                autoFocus
              />
              {userSearch && (
                <button
                  onClick={() => setUserSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          {leftView === "requests" && (
            <div className="flex items-center gap-2 h-9">
              <Button variant="ghost" size="icon-xs" className="h-7 w-7 hover:bg-muted/50" onClick={() => setLeftView("conversations")}>
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-sm font-medium text-muted-foreground">Friend Requests</span>
            </div>
          )}
        </div>

        {/* Left Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {leftView === "search" && (
            <UserSearchPanel searchQuery={userSearch} />
          )}
          {leftView === "requests" && (
            <FriendRequestsPanel />
          )}
          {leftView === "conversations" && (
            <>
              {filteredFriends.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {friendSearch.trim() ? "No conversations found" : "No friends yet"}
                  </p>
                  {!friendSearch.trim() && (
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-2 text-primary"
                      onClick={() => setLeftView("search")}
                    >
                      Find people to chat with
                    </Button>
                  )}
                </div>
              ) : (
                <div>
                  {filteredFriends.map((friend: User) => {
                    const conversation = conversations.find(
                      (c) => String(c.userId) === String(friend.id)
                    );
                    const isActive = activeDmPartnerId === friend.id;

                    return (
                      <button
                        key={friend.id}
                        onClick={() => handleSelectFriend(friend.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left cursor-pointer border-b border-border/50 border-l-2 ${
                          isActive
                            ? "bg-primary/8 border-l-primary"
                            : "border-l-transparent hover:bg-muted/50 hover:border-l-primary/30"
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar size="default" className={`h-11 w-11 ${onlineIds.has(friend.id) ? "ring-2 ring-green-500/30" : ""}`}>
                            <AvatarImage src={friend.avatar_url || ""} alt={friend.username} />
                            <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                              {friend.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                            {onlineIds.has(friend.id) && (
                              <AvatarBadge className="bg-green-500" />
                            )}
                          </Avatar>
                          {conversation?.hasUnread && (
                            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border-2 border-card" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm truncate ${
                              conversation?.hasUnread ? "font-bold" : "font-medium"
                            }`}>
                              {friend.username}
                            </span>
                            {conversation?.lastMessage?.timestamp && (
                              <span className="text-[11px] text-muted-foreground flex-shrink-0">
                                {formatTimeShort(new Date(conversation.lastMessage.timestamp))}
                              </span>
                            )}
                          </div>
                          {conversation?.lastMessage?.content ? (
                            <p className={`text-xs truncate mt-0.5 ${
                              conversation.hasUnread
                                ? "text-foreground font-medium"
                                : "text-muted-foreground"
                            }`}>
                              {conversation.lastMessage.content}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground/60 mt-0.5">
                              Start a conversation
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Right Panel: Active DM or Empty State ─── */}
      <div className="flex-1 flex flex-col h-full min-h-0 min-w-0">
        {activeDmPartnerId ? (
          <DMConversation
            partnerId={activeDmPartnerId}
            onBack={() => setActiveDmPartnerId(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="h-14 w-14 rounded-full bg-muted/30 flex items-center justify-center mb-3">
              <MessageCircle className="h-7 w-7 text-muted-foreground/30" />
            </div>
            <h3 className="text-base font-heading font-semibold mb-1 text-muted-foreground">No conversation selected</h3>
            <p className="text-sm text-muted-foreground/60 max-w-xs mb-4">
              Pick a friend from the list to start chatting
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="glass-solid"
                onClick={() => setLeftView("search")}
              >
                <Search className="h-3.5 w-3.5 mr-1.5" />
                Find People
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="glass-solid relative"
                onClick={() => setLeftView("requests")}
              >
                <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                Requests
                {friendRequests.length > 0 && (
                  <span className="ml-1.5 bg-primary text-primary-foreground text-[9px] px-1 rounded-full min-w-3.5 h-3.5 flex items-center justify-center leading-none">
                    {friendRequests.length}
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTimeShort(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default FriendsTab;
