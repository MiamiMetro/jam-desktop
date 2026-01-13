import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import { useAuthStore } from "@/stores/authStore";
import { usePosts, useCreatePost, useToggleLike, type FrontendPost } from "@/hooks/usePosts";
import { useCommunities } from "@/hooks/useCommunities";
import { PostCard } from "@/components/PostCard";
import { ComposePost } from "@/components/ComposePost";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { formatTimeAgo, formatDuration } from "@/lib/postUtils";
import { Music } from "lucide-react";
// Post type is inferred from usePosts hook

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
  
  // Infinite scroll: detect when user scrolls near bottom
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '200px', // Start loading 200px before reaching the element
  });
  
  // Auto-load next page when scroll reaches trigger point
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && !postsLoading) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, postsLoading, fetchNextPage]);
  
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

  return (
    <>
      {/* Compose Post Area */}
      <ComposePost
        placeholder="What's on your mind? Share a message or upload audio..."
        onSubmit={handleCreatePost}
        onGuestAction={onGuestAction}
      />

      {/* Posts Feed */}
      <div className="divide-y divide-border">
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
            {posts.map((post: FrontendPost) => {
            const communityName = getCommunityName(post.community);
            return (
              <PostCard
                key={post.id}
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
            );
            })}
            {/* Infinite scroll trigger - invisible element at bottom */}
            {hasNextPage && (
              <div ref={loadMoreRef} className="py-4 text-center">
                {isFetchingNextPage && (
                  <div className="text-sm text-muted-foreground">
                    Loading more posts...
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default FeedTab;

