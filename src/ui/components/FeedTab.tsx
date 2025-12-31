import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { usePosts, useCreatePost } from "@/hooks/usePosts";
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

  const handleLikePost = () => {
    if (isGuest) {
      onGuestAction?.();
      return;
    }
    // TODO: Implement actual like with API (will be done in PostCard/Post component)
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
            {posts.map((post) => {
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
            {hasNextPage && (
              <div className="p-4 text-center">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isFetchingNextPage ? 'Loading more...' : 'Load more posts'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default FeedTab;

