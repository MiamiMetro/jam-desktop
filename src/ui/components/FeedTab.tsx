import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAuthStore } from "@/stores/authStore";
import { usePosts, useCreatePost, useToggleLike } from "@/hooks/usePosts";
import { useCommunities } from "@/hooks/useCommunities";
import { PostCard } from "@/components/PostCard";
import { ComposePost } from "@/components/ComposePost";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { formatTimeAgo, formatDuration } from "@/lib/postUtils";
import { Music } from "lucide-react";

interface FeedTabProps {
  onGuestAction?: () => void;
}

function FeedTab({ onGuestAction }: FeedTabProps) {
  const navigate = useNavigate();
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
      // Audio upload is not implemented yet - audioFile is ignored
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
    navigate(`/post/${postId}`);
  };

  // Virtual scrolling setup
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 300, // Estimated post height in pixels
    overscan: 3, // Render 3 items above/below viewport
  });

  // Auto-load more when scrolling near bottom
  useEffect(() => {
    const [lastItem] = [...virtualizer.getVirtualItems()].reverse();

    if (!lastItem) return;

    // Load more when user scrolls within 5 items of the end
    if (
      lastItem.index >= posts.length - 1 - 5 &&
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
    virtualizer.getVirtualItems(),
  ]);

  return (
    <>
      {/* Compose Post Area */}
      <ComposePost
        placeholder="What's on your mind? Share a message or upload audio..."
        onSubmit={handleCreatePost}
        onGuestAction={onGuestAction}
      />

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
        <div ref={parentRef} className="overflow-auto">
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
                  className="border-b border-border"
                >
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
                    onGuestAction={onGuestAction}
                    formatTimeAgo={formatTimeAgo}
                    formatDuration={formatDuration}
                  />
                </div>
              );
            })}
          </div>

          {/* Load More button for manual pagination (also auto-loads) */}
          <div style={{ paddingTop: `${virtualizer.getTotalSize()}px` }}>
            <LoadMoreButton
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default FeedTab;

