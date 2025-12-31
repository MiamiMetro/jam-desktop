import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Music,
  Heart,
  Share2,
  Upload,
  Play,
  Pause,
  MessageCircle,
  Hash as HashIcon,
  MoreVertical,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { usePosts } from "@/hooks/usePosts";
import { useCommunities } from "@/hooks/useCommunities";
import type { Post } from "@/lib/api/mock";

interface FeedTabProps {
  onGuestAction?: () => void;
}

function FeedTab({ onGuestAction }: FeedTabProps) {
  const navigate = useNavigate();
  const { isGuest, user } = useAuthStore();
  const { data: posts = [], isLoading: postsLoading } = usePosts();
  const { data: communities = [] } = useCommunities();
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

  const formatTimeAgo = (date: Date) => {
    const now = new Date().getTime();
    const seconds = Math.floor((now - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCommunityName = (communityId?: string) => {
    if (!communityId) return null;
    const community = communities.find(c => c.id === communityId);
    return community?.name || communityId;
  };

  const handleCommunityClick = (communityId: string) => {
    navigate(`/community/${communityId}`);
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
              <div key={post.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex gap-3">
                  <Avatar size="default" className="flex-shrink-0">
                    <AvatarImage src={post.author.avatar || ""} alt={post.author.username} />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {post.author.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm">{post.author.username}</span>
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
                      <span className="text-xs text-muted-foreground">
                        • {formatTimeAgo(post.timestamp)}
                      </span>
                    </div>
                    {post.content && (
                      <p className="text-sm mb-3 whitespace-pre-wrap">{post.content}</p>
                    )}
                    {post.audioFile && (
                      <div className="mb-3 p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-full"
                            onClick={() => {
                              if (isGuest) {
                                onGuestAction?.();
                                return;
                              }
                              setPlayingAudioId(playingAudioId === post.id ? null : post.id);
                            }}
                          >
                            {playingAudioId === post.id ? (
                              <Pause className="h-5 w-5" />
                            ) : (
                              <Play className="h-5 w-5" />
                            )}
                          </Button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Music className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm font-medium truncate">
                                {post.audioFile.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary transition-all"
                                  style={{ width: playingAudioId === post.id ? "45%" : "0%" }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatDuration(post.audioFile.duration)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-6 mt-3">
                      <button
                        onClick={handleLikePost}
                        className={`flex items-center gap-2 text-sm transition-colors ${
                          post.isLiked
                            ? "text-red-500 hover:text-red-600"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${post.isLiked ? "fill-current" : ""}`} />
                        <span>{post.likes}</span>
                      </button>
                      <button 
                        onClick={() => isGuest && onGuestAction?.()}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>{post.comments}</span>
                      </button>
                      <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <Share2 className="h-4 w-4" />
                        <span>{post.shares}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

export default FeedTab;

