// UserSearchPanel.tsx — Global user search with debounced input
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { useAllUsers } from "@/hooks/useUsers";
import type { User } from "@/lib/api/types";

interface UserSearchPanelProps {
  onClose: () => void;
}

export default function UserSearchPanel({ onClose }: UserSearchPanelProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery] = useDebouncedValue(searchQuery, { wait: 300 });

  const shouldFetch = !!debouncedQuery.trim();
  const {
    data: allUsers = [],
    fetchNextPage: fetchMoreUsers,
    hasNextPage: hasMoreUsers,
    isFetchingNextPage: isLoadingMoreUsers,
    isLoading: isLoadingAllUsers,
  } = useAllUsers(debouncedQuery.trim() || undefined, shouldFetch);

  const filteredUsers = allUsers.filter((u: User) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3 py-2 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground">Search Users</h3>
          <Button variant="ghost" size="icon-xs" className="h-6 w-6" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            type="text" placeholder="Search all users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-7 text-xs" autoFocus
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-2">
          {!searchQuery.trim() ? (
            <div className="text-center py-4 text-xs text-muted-foreground">Start typing to search for users...</div>
          ) : (
            <>
              {isLoadingAllUsers || searchQuery.trim() !== debouncedQuery.trim() ? (
                <div className="text-center py-4 text-xs text-muted-foreground">Searching...</div>
              ) : (
                <>
                  {filteredUsers.map((searchUser: User) => (
                    <div
                      key={searchUser.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/50 cursor-pointer group transition-colors"
                      onClick={() => navigate(`/profile/${searchUser.username}`)}
                    >
                      <Avatar size="sm" className="relative">
                        <AvatarImage src={searchUser.avatar_url || ""} alt={searchUser.username} />
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                          {searchUser.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{searchUser.username}</div>
                      </div>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-4 text-xs text-muted-foreground">No users found</div>
                  )}
                  {hasMoreUsers && filteredUsers.length > 0 && (
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
  );
}
