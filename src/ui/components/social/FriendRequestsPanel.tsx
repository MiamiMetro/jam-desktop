// FriendRequestsPanel.tsx — Collapsible pending/sent friend requests (header in FriendsTab)
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Check, X, ChevronDown, Send } from "lucide-react";
import {
  useFriendRequests, useSentFriendRequests,
  useAcceptFriend, useDeclineFriend, useCancelFriendRequest,
} from "@/hooks/useFriends";
import type { User } from "@/lib/api/types";

export default function FriendRequestsPanel() {
  const navigate = useNavigate();
  const [showPending, setShowPending] = useState(true);
  const [showSent, setShowSent] = useState(true);

  const {
    data: friendRequests = [],
    fetchNextPage: fetchMoreRequests,
    hasNextPage: hasMoreRequests,
    isFetchingNextPage: isLoadingMoreRequests,
  } = useFriendRequests();

  const {
    data: sentRequests = [],
    fetchNextPage: fetchMoreSent,
    hasNextPage: hasMoreSent,
    isFetchingNextPage: isLoadingMoreSent,
  } = useSentFriendRequests();

  const acceptMutation = useAcceptFriend();
  const declineMutation = useDeclineFriend();
  const cancelMutation = useCancelFriendRequest();

  return (
    <>
      {/* Pending */}
      <div>
        <button
          onClick={() => setShowPending(!showPending)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-heading font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer border-b border-border/30"
        >
          <span className="flex items-center gap-2 uppercase tracking-wider">
            <span className="w-1 h-3.5 rounded-full bg-primary" />
            Pending
            {friendRequests.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                {friendRequests.length}
              </span>
            )}
          </span>
          <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showPending ? "" : "-rotate-90"}`} />
        </button>
        {showPending && (
          <>
            {friendRequests.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground/60">No pending requests</div>
            ) : (
              <div>
                {friendRequests.map((req: User) => (
                  <div key={req.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5 transition-colors border-l-2 border-l-primary/40">
                    <button className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${req.username}`)}>
                      <Avatar size="sm" className="h-9 w-9 flex-shrink-0">
                        <AvatarImage src={req.avatar_url || ""} alt={req.username} />
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                          {req.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate text-left">{req.username}</div>
                      </div>
                    </button>
                    <Button
                      variant="ghost" size="icon-xs"
                      className="h-7 w-7 text-green-500 hover:text-green-400 hover:bg-green-500/15 rounded-full transition-colors"
                      onClick={() => acceptMutation.mutate(req.id)}
                      disabled={acceptMutation.isPending || declineMutation.isPending}
                      title="Accept"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon-xs"
                      className="h-7 w-7 text-red-500 hover:text-red-400 hover:bg-red-500/15 rounded-full transition-colors"
                      onClick={() => declineMutation.mutate(req.id)}
                      disabled={acceptMutation.isPending || declineMutation.isPending}
                      title="Decline"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {hasMoreRequests && (
              <div className="px-4 pb-2">
                <button
                  onClick={() => fetchMoreRequests()}
                  disabled={isLoadingMoreRequests}
                  className="w-full py-2 text-xs text-primary hover:text-primary/80 transition-colors text-center disabled:opacity-50 glass-solid rounded-lg"
                >
                  {isLoadingMoreRequests ? 'Loading more...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sent */}
      <div>
        <button
          onClick={() => setShowSent(!showSent)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-heading font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer border-b border-border/30"
        >
          <span className="flex items-center gap-2 uppercase tracking-wider">
            <span className="w-1 h-3.5 rounded-full bg-muted-foreground/30" />
            Sent
            {sentRequests.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                {sentRequests.length}
              </span>
            )}
          </span>
          <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showSent ? "" : "-rotate-90"}`} />
        </button>
        {showSent && (
          <>
            {sentRequests.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground/60">No sent requests</div>
            ) : (
              <div>
                {sentRequests.map((req: User) => (
                  <div key={req.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5 transition-colors">
                    <button className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${req.username}`)}>
                      <Avatar size="sm" className="h-9 w-9 flex-shrink-0">
                        <AvatarImage src={req.avatar_url || ""} alt={req.username} />
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                          {req.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate text-left">{req.username}</div>
                        <div className="text-[10px] text-muted-foreground/50 flex items-center gap-1 mt-0.5">
                          <Send className="h-2.5 w-2.5" />
                          Awaiting response
                        </div>
                      </div>
                    </button>
                    <Button
                      variant="ghost" size="icon-xs"
                      className="h-7 w-7 text-red-500 hover:text-red-400 hover:bg-red-500/15 rounded-full transition-colors"
                      onClick={() => cancelMutation.mutate(req.id)}
                      disabled={cancelMutation.isPending}
                      title="Cancel request"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {hasMoreSent && (
              <div className="px-4 pb-2">
                <button
                  onClick={() => fetchMoreSent()}
                  disabled={isLoadingMoreSent}
                  className="w-full py-2 text-xs text-primary hover:text-primary/80 transition-colors text-center disabled:opacity-50 glass-solid rounded-lg"
                >
                  {isLoadingMoreSent ? 'Loading more...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
