// FeedTab.tsx — Two-column feed layout with activity sidebar
import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAuthStore } from "@/stores/authStore";
import { usePosts, useCreatePost, useToggleLike } from "@/hooks/usePosts";
import { useCommunities } from "@/hooks/useCommunities";
import { useJams } from "@/hooks/useJams";
import { PostCard } from "@/components/PostCard";
import { ComposePost } from "@/components/ComposePost";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatTimeAgo } from "@/lib/postUtils";
import { Music, Rss, Hash, Users, UserPlus, X, Check } from "lucide-react";

const SUGGESTED_FRIENDS = [
  { id: "sf1", username: "BeatMaker", avatar: "" },
  { id: "sf2", username: "SynthWave", avatar: "" },
  { id: "sf3", username: "JazzCat", avatar: "" },
  { id: "sf4", username: "LoFiKing", avatar: "" },
];

interface FeedTabProps {
  onGuestAction?: () => void;
}

function FeedTab({ onGuestAction }: FeedTabProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isGuest } = useAuthStore();
  const { data: posts = [], isLoading: postsLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = usePosts();
  const { data: communities = [] } = useCommunities();
  const { data: rooms = [] } = useJams();
  const createPostMutation = useCreatePost();
  const toggleLikeMutation = useToggleLike();
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [justSent, setJustSent] = useState<string | null>(null);

  const handleSendRequest = (friendId: string) => {
    setSentRequests(prev => new Set(prev).add(friendId));
    setJustSent(friendId);
    setTimeout(() => setJustSent(null), 1500);
  };

  const handleCancelRequest = (friendId: string) => {
    setSentRequests(prev => { const next = new Set(prev); next.delete(friendId); return next; });
  };

  const handleAuthorClick = (username: string) => {
    navigate(`/profile/${username}`);
  };
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const handleCreatePost = async (content: string, audioFile: File | null) => {
    if (isGuest) return;
    await createPostMutation.mutateAsync({ content, audioFile });
  };

  const handleLikePost = async (postId: string) => {
    if (isGuest) {
      onGuestAction?.();
      return;
    }
    try {
      await toggleLikeMutation.mutateAsync(postId);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const getCommunityName = (communityId?: string) => {
    if (!communityId) return null;
    const community = communities.find(c => c.id === communityId);
    return community?.name || communityId;
  };

  const handleCommunityClick = (communityId: string) => {
    navigate(`/community/${communityId}`);
  };

  const handlePostClick = (postId: string) => {
    navigate(`/post/${postId}`, { state: { backgroundLocation: location } });
  };

  // Virtual scrolling setup
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 300,
    overscan: 3,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const lastItemIndex = virtualItems.at(-1)?.index ?? -1;

  useEffect(() => {
    if (lastItemIndex < 0) return;
    if (
      lastItemIndex >= posts.length - 1 - 5 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    fetchNextPage,
    posts.length,
    isFetchingNextPage,
    lastItemIndex,
  ]);

  return (
    <div className="flex h-full">
      {/* Main Feed Column */}
      <div ref={parentRef} className="flex-1 min-w-0 overflow-y-auto">
        {/* Compact Feed Header */}
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Rss className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-heading font-semibold text-muted-foreground">Feed</h2>
        </div>

        {/* Compose Post Area */}
        <div>
          <ComposePost
            placeholder="What's on your mind? Share a message or upload audio..."
            onSubmit={handleCreatePost}
            onGuestAction={onGuestAction}
            isSubmitting={createPostMutation.isPending}
          />
        </div>

        {/* Posts Feed */}
        {postsLoading ? (
          <LoadingState message="Loading posts..." />
        ) : posts.length === 0 ? (
          <EmptyState
            icon={Music}
            title="No posts yet"
            description="Be the first to share something!"
          />
        ) : (
          <>
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const post = posts[virtualRow.index];
                const communityName = getCommunityName(post.community);

                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="border-b border-border hover:bg-foreground/[0.03] transition-colors"
                  >
                    <div>
                      <PostCard
                        post={post}
                        communityName={communityName}
                        isPlaying={playingAudioId === post.id}
                        isGuest={isGuest}
                        onAuthorClick={handleAuthorClick}
                        onCommunityClick={handleCommunityClick}
                        onPostClick={handlePostClick}
                        onLike={handleLikePost}
                        onPlayPause={() => setPlayingAudioId(playingAudioId === post.id ? null : post.id)}
                        formatTimeAgo={formatTimeAgo}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <LoadMoreButton
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
              />
            </div>
          </>
        )}
      </div>

      {/* Activity Sidebar */}
      <div className="w-72 flex-shrink-0 border-l border-border overflow-y-auto p-4 space-y-6">
        {/* Active Jams */}
        {(() => {
          const activeRooms = rooms.filter(r => r.isEnabled).slice(0, 3);
          if (activeRooms.length === 0) return null;
          return (
            <div>
              <h3 className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Active Jams
              </h3>
              <div className="space-y-2">
                {activeRooms.map(room => (
                  <button
                    key={room.id}
                    onClick={() => navigate(`/jam/${room.id}`)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg glass-solid hover:glass-strong transition-all duration-200 cursor-pointer text-left hover:ring-1 hover:ring-primary/20"
                  >
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Hash className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{room.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {room.genre && (
                          <span className="text-primary/80">{room.genre}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {room.participants}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Suggested Friends */}
        {!isGuest && (
          <div>
            <h3 className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Suggested
            </h3>
            <div className="space-y-1">
              {SUGGESTED_FRIENDS.map(friend => (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <button
                    onClick={() => navigate(`/profile/${friend.username}`)}
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  >
                    <Avatar size="sm" className="h-8 w-8 ring-1 ring-border flex-shrink-0">
                      <AvatarImage src={friend.avatar} alt={friend.username} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {friend.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate">{friend.username}</span>
                  </button>
                  {justSent === friend.id ? (
                    <span className="text-[11px] text-green-500 font-medium flex items-center gap-1 flex-shrink-0 animate-in fade-in duration-200">
                      <Check className="h-3 w-3" />
                      Sent!
                    </span>
                  ) : sentRequests.has(friend.id) ? (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={() => handleCancelRequest(friend.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="h-7 w-7 text-muted-foreground hover:text-primary flex-shrink-0"
                      onClick={() => handleSendRequest(friend.id)}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FeedTab;
