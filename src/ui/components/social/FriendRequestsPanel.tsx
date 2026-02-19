// FriendRequestsPanel.tsx — Collapsible pending/sent friend requests
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, X, ChevronDown } from "lucide-react";
import {
  useFriendRequests, useSentFriendRequests,
  useAcceptFriend, useDeclineFriend, useCancelFriendRequest,
} from "@/hooks/useFriends";
import type { User } from "@/lib/api/types";

interface FriendRequestsPanelProps {
  onBack: () => void;
}

export default function FriendRequestsPanel({ onBack }: FriendRequestsPanelProps) {
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
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-xs" className="h-6 w-6" onClick={onBack} title="Back to friends">
            <ArrowLeft className="h-3 w-3" />
          </Button>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Friend Requests</h3>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-2 space-y-3">
          {/* Pending */}
          <div>
            <button
              onClick={() => setShowPending(!showPending)}
              className="w-full flex items-center justify-between py-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <span className="uppercase tracking-wider">Pending ({friendRequests.length})</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${showPending ? "" : "-rotate-90"}`} />
            </button>
            {showPending && (
              <>
                {friendRequests.length === 0 ? (
                  <div className="text-center py-4 text-xs text-muted-foreground">No pending friend requests</div>
                ) : (
                  <div className="space-y-1">
                    {friendRequests.map((req: User) => (
                      <div key={req.id} className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent transition-colors">
                        <Avatar size="sm">
                          <AvatarImage src={req.avatar_url || ""} alt={req.username} />
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                            {req.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{req.username}</div>
                        </div>
                        <Button
                          variant="ghost" size="icon-xs"
                          className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-500/20"
                          onClick={() => acceptMutation.mutate(req.id)}
                          disabled={acceptMutation.isPending || declineMutation.isPending}
                          title="Accept"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon-xs"
                          className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-500/20"
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
                  <div className="pt-2 pb-2 border-t border-border mt-2">
                    <button
                      onClick={() => fetchMoreRequests()}
                      disabled={isLoadingMoreRequests}
                      className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors text-center disabled:opacity-50"
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
              className="w-full flex items-center justify-between py-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <span className="uppercase tracking-wider">Sent ({sentRequests.length})</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${showSent ? "" : "-rotate-90"}`} />
            </button>
            {showSent && (
              <>
                {sentRequests.length === 0 ? (
                  <div className="text-center py-4 text-xs text-muted-foreground">No sent requests</div>
                ) : (
                  <div className="space-y-1">
                    {sentRequests.map((req: User) => (
                      <div key={req.id} className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent transition-colors">
                        <Avatar size="sm">
                          <AvatarImage src={req.avatar_url || ""} alt={req.username} />
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                            {req.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{req.username}</div>
                        </div>
                        <Button
                          variant="ghost" size="icon-xs"
                          className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-500/20"
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
                  <div className="pt-2 pb-2 border-t border-border mt-2">
                    <button
                      onClick={() => fetchMoreSent()}
                      disabled={isLoadingMoreSent}
                      className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors text-center disabled:opacity-50"
                    >
                      {isLoadingMoreSent ? 'Loading more...' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
