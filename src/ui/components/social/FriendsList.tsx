// FriendsList.tsx — Friends list with conversation sorting, search, and unread indicators
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useAuthStore } from "@/stores/authStore";
import { useFriends } from "@/hooks/useFriends";
import { useConversations } from "@/hooks/useUsers";
import type { User } from "@/lib/api/types";

interface FriendsListProps {
  onSelectFriend: (friendId: string) => void;
}

export default function FriendsList({ onSelectFriend }: FriendsListProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery] = useDebouncedValue(searchQuery, { wait: 300 });

  const {
    data: friends = [],
    fetchNextPage: fetchMoreFriends,
    hasNextPage: hasMoreFriends,
    isFetchingNextPage: isLoadingMoreFriends,
  } = useFriends(showSearch ? debouncedQuery : undefined);

  const { data: conversations = [] } = useConversations(user?.id || "");

  const displayList = showSearch && searchQuery.trim()
    ? friends.filter((f: User) => f.username.toLowerCase().includes(searchQuery.toLowerCase()))
    : friends;

  const sortedFriends = [...displayList].sort((a, b) => {
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

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center justify-between mb-0">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Friends</h3>
          <Button
            variant="ghost" size="icon-xs" className="h-6 w-6"
            onClick={() => { setShowSearch(!showSearch); if (!showSearch) setSearchQuery(""); }}
            title="Search friends"
          >
            {showSearch ? <X className="h-3 w-3" /> : <Search className="h-3 w-3" />}
          </Button>
        </div>
        {showSearch && (
          <div className="relative mt-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              type="text" placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-7 text-xs" autoFocus
            />
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-2">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            FRIENDS ({showSearch && searchQuery.trim() ? displayList.length : friends.length})
          </div>
          <div className="space-y-1">
            {sortedFriends.map((friend: User) => {
              const conversation = conversations.find((c) => String(c.userId) === String(friend.id));
              return (
                <div
                  key={friend.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer group transition-colors"
                  onClick={() => onSelectFriend(friend.id)}
                >
                  <Avatar size="sm" className="relative">
                    <AvatarImage src={friend.avatar_url || ""} alt={friend.username} />
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                      {friend.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{friend.username}</div>
                    {conversation?.lastMessage?.content && (
                      <div className="text-xs text-muted-foreground truncate">
                        {conversation.lastMessage.content}
                      </div>
                    )}
                  </div>
                  {conversation?.hasUnread && (
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0 shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
                  )}
                </div>
              );
            })}
            {showSearch && searchQuery.trim() && displayList.length === 0 && (
              <div className="text-center py-4 text-xs text-muted-foreground">No friends found</div>
            )}
            {!showSearch && friends.length === 0 && (
              <div className="text-center py-4 text-xs text-muted-foreground">No friends yet</div>
            )}
          </div>
          {!showSearch && hasMoreFriends && (
            <div className="pt-2 pb-2 border-t border-border">
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
    </div>
  );
}
