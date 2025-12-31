import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft,
  Music,
  Play,
  Pause,
  Heart,
  MessageCircle,
  Share2,
  Hash as HashIcon,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { usePost } from "@/hooks/usePosts";
import { useCommunities } from "@/hooks/useCommunities";
import { useAllUsers } from "@/hooks/useUsers";
import { formatTimeAgo, formatDuration } from "@/lib/postUtils";

function Post() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isGuest, user } = useAuthStore();
  const { data: post, isLoading } = usePost(id || "");
  const { data: communities = [] } = useCommunities();
  const { data: allUsers = [] } = useAllUsers();
  const [playingAudio, setPlayingAudio] = useState(false);
  
  const getUserByUsername = (username: string) => {
    return allUsers.find(u => u.username === username);
  };

  const handleAuthorClick = (username: string) => {
    const authorUser = getUserByUsername(username);
    if (authorUser) {
      navigate(`/profile/${authorUser.id}`);
    }
  };

  const handleCommunityClick = (communityId: string) => {
    navigate(`/community/${communityId}`);
  };

  const handleLikePost = () => {
    if (isGuest) return;
    // TODO: Implement actual like with API
  };

  const getCommunityName = (communityId?: string) => {
    if (!communityId) return null;
    const community = communities.find(c => c.id === communityId);
    return community?.name || communityId;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Post not found</p>
        </div>
      </div>
    );
  }

  const communityName = getCommunityName(post.community);

  return (
    <div className="p-4">
      {/* Back Button */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Post Content */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-background border border-border rounded-lg p-6">
          <div className="flex gap-3">
            <button
              onClick={() => handleAuthorClick(post.author.username)}
              className="flex-shrink-0 cursor-pointer p-0 border-0 bg-transparent hover:opacity-80 transition-opacity self-start"
            >
              <Avatar size="default">
                <AvatarImage src={post.author.avatar || ""} alt={post.author.username} />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {post.author.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <button
                  onClick={() => handleAuthorClick(post.author.username)}
                  className="font-semibold text-base hover:underline cursor-pointer"
                >
                  {post.author.username}
                </button>
                {post.isGlobal ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                    Discover
                  </span>
                ) : communityName ? (
                  <button
                    onClick={() => post.community && handleCommunityClick(post.community)}
                    className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-muted/80 transition-colors flex items-center gap-1"
                  >
                    <HashIcon className="h-3 w-3" />
                    From {communityName}
                  </button>
                ) : null}
                <span className="text-sm text-muted-foreground">
                  • {formatTimeAgo(post.timestamp)}
                </span>
              </div>
              {post.content && (
                <p className="text-base mb-4 whitespace-pre-wrap">{post.content}</p>
              )}
              {post.audioFile && (
                <div className="mb-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-12 w-12 rounded-full"
                      onClick={() => {
                        if (isGuest) return;
                        setPlayingAudio(!playingAudio);
                      }}
                    >
                      {playingAudio ? (
                        <Pause className="h-6 w-6" />
                      ) : (
                        <Play className="h-6 w-6" />
                      )}
                    </Button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Music className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <span className="text-base font-medium truncate">
                          {post.audioFile.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted-foreground/20 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: playingAudio ? "45%" : "0%" }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatDuration(post.audioFile.duration)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-6 pt-4 border-t border-border">
                <button
                  onClick={handleLikePost}
                  className={`flex items-center gap-2 text-base transition-colors cursor-pointer ${
                    post.isLiked
                      ? "text-red-500 hover:text-red-600"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Heart className={`h-5 w-5 ${post.isLiked ? "fill-current" : ""}`} />
                  <span>{post.likes}</span>
                </button>
                <button 
                  className="flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>{post.comments}</span>
                </button>
                <button className="flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <Share2 className="h-5 w-5" />
                  <span>{post.shares}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Comments Section - Placeholder */}
        <div className="mt-6 bg-background border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Comments</h3>
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No comments yet</p>
            <p className="text-xs mt-1">Be the first to comment!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Post;

