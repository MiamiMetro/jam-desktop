import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Music,
  Upload,
  MoreVertical,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { usePosts } from "@/hooks/usePosts";
import { useCommunities } from "@/hooks/useCommunities";
import { useAllUsers } from "@/hooks/useUsers";
import { PostCard } from "@/components/PostCard";
import { formatTimeAgo, formatDuration } from "@/lib/postUtils";
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
  const [newPost, setNewPost] = useState({
    content: "",
    audioFile: null as File | null,
  });
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const handleCreatePost = () => {
    if (isGuest) {
      onGuestAction?.();
      return;
    }
    if (!newPost.content.trim() && !newPost.audioFile) return;
    // TODO: Implement actual post creation with API
    setNewPost({
      content: "",
      audioFile: null,
    });
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
      {!isGuest && (
        <div className="border-b border-border p-4 bg-background">
          <div className="flex gap-3">
            <Avatar size="default" className="flex-shrink-0">
              <AvatarImage src={user?.avatar || ""} alt={user?.username || "You"} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user?.username?.substring(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <Textarea
                placeholder="What's on your mind? Share a message or upload audio..."
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                className="min-h-[100px] resize-none border-border"
                rows={4}
              />
              {newPost.audioFile && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Music className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm flex-1 truncate">{newPost.audioFile.name}</span>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="h-6 w-6"
                            onClick={() => setNewPost({ ...newPost, audioFile: null })}
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label htmlFor="audio-upload" className="cursor-pointer">
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Audio
                    </Button>
                    <input
                      id="audio-upload"
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setNewPost({ ...newPost, audioFile: file });
                        }
                      }}
                    />
                  </label>
                </div>
                <Button
                  onClick={handleCreatePost}
                  disabled={!newPost.content.trim() && !newPost.audioFile}
                  size="sm"
                >
                  Post
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Posts Feed */}
      <div className="divide-y divide-border">
        {postsLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            <p className="text-sm">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Music className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No posts yet</p>
            <p className="text-xs mt-1">Be the first to share something!</p>
          </div>
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

