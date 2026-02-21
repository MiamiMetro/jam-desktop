// UserSearchPanel.tsx — Global user search results (input is in FriendsTab header)
import { useNavigate } from "react-router-dom";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import { useAllUsers } from "@/hooks/useUsers";
import type { User } from "@/lib/api/types";

interface UserSearchPanelProps {
  searchQuery: string;
}

export default function UserSearchPanel({ searchQuery }: UserSearchPanelProps) {
  const navigate = useNavigate();
  const [debouncedQuery] = useDebouncedValue(searchQuery, { wait: 300 });

  const shouldFetch = !!debouncedQuery.trim();
  const {
    data: allUsers = [],
    fetchNextPage: fetchMoreUsers,
    hasNextPage: hasMoreUsers,
    isFetchingNextPage: isLoadingMoreUsers,
    isLoading: isLoadingAllUsers,
  } = useAllUsers(debouncedQuery.trim() || undefined, shouldFetch);

  if (!searchQuery.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center px-4">
        <Users className="h-8 w-8 text-muted-foreground/30 mb-2 animate-float" />
        <p className="text-xs text-muted-foreground">Start typing to search for users...</p>
      </div>
    );
  }

  if (isLoadingAllUsers || searchQuery.trim() !== debouncedQuery.trim()) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (allUsers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center px-4">
        <p className="text-xs text-muted-foreground">No users found</p>
      </div>
    );
  }

  return (
    <div>
      {allUsers.map((searchUser: User) => (
        <button
          key={searchUser.id}
          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5 transition-colors cursor-pointer text-left"
          onClick={() => navigate(`/profile/${searchUser.username}`)}
        >
          <Avatar size="sm" className="h-9 w-9">
            <AvatarImage src={searchUser.avatar_url || ""} alt={searchUser.username} />
            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
              {searchUser.username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{searchUser.username}</div>
          </div>
        </button>
      ))}
      {hasMoreUsers && (
        <div className="px-4 pb-3">
          <button
            onClick={() => fetchMoreUsers()}
            disabled={isLoadingMoreUsers}
            className="w-full py-2 text-xs text-primary hover:text-primary/80 transition-colors text-center disabled:opacity-50 glass rounded-lg"
          >
            {isLoadingMoreUsers ? 'Loading more...' : 'Load more users'}
          </button>
        </div>
      )}
    </div>
  );
}
