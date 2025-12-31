import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { usePosts } from "@/hooks/usePosts";
import { useCommunities } from "@/hooks/useCommunities";
import { useAllUsers } from "@/hooks/useUsers";
import { PostCard } from "@/components/PostCard";
import { ComposePost } from "@/components/ComposePost";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { formatTimeAgo, formatDuration } from "@/lib/postUtils";
import { Music } from "lucide-react";
import type { Post } from "@/lib/api/mock";

interface FeedTabProps {
  onGuestAction?: () => void;
}

function FeedTab({ onGuestAction }: FeedTabProps) {
  const navigate = useNavigate();
  const { isGuest, user } = useAuthStore();
  const { data: posts = [], isLoading: postsLoading } = usePosts();
  const { data: communities = [] } = useCommunities();
  const { data: allUsers = [] } = useAllUsers();
  
  const getUserByUsername = (username: string) => {
    return allUsers.find(u => u.username === username);
  };
  
  const handleAuthorClick = (username: string) => {
    const authorUser = getUserByUsername(username);
    if (authorUser) {
      navigate(`/profile/${authorUser.id}`);
    }
  };
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const handleCreatePost = (content: string, audioFile: File | null) => {
    // TODO: Implement actual post creation with API
    console.log("Creating post:", { content, audioFile });
  };

  const handleLikePost = () => {
    if (isGuest) {
      onGuestAction?.();
      return;
    }
    // TODO: Implement actual like with API
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
          posts.map((post: Post) => {
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
          })
        )}
      </div>
    </>
  );
}

export default FeedTab;

