// FeedTab.tsx — Two-column feed layout with activity sidebar
import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAuthStore } from "@/stores/authStore";
import { usePosts, useCreatePost, useToggleLike } from "@/hooks/usePosts";
import { useCommunities } from "@/hooks/useCommunities";
import { PostCard } from "@/components/PostCard";
import { ComposePost } from "@/components/ComposePost";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { formatTimeAgo } from "@/lib/postUtils";
import { Music, Rss } from "lucide-react";

interface FeedTabProps {
  onGuestAction?: () => void;
}

function FeedTab({ onGuestAction }: FeedTabProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isGuest } = useAuthStore();
  const { data: posts = [], isLoading: postsLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = usePosts();
  const { data: communities = [] } = useCommunities();
  const createPostMutation = useCreatePost();
  const toggleLikeMutation = useToggleLike();

  const handleAuthorClick = (username: string) => {
    navigate(`/profile/${username}`);
  };
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const handleCreatePost = async (content: string) => {
    if (isGuest) return;

    try {
      await createPostMutation.mutateAsync({ content });
    } catch (error) {
      console.error('Error creating post:', error);
    }
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
      <div ref={parentRef} className="flex-1 min-w-0 overflow-y-auto border-r border-border">
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
    </div>
  );
}

export default FeedTab;
