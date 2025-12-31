import { useState } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { 
  Music, 
  Users, 
  Hash, 
  Search,
  Play,
  Pause,
  Heart,
  MessageCircle,
  Share2,
  Upload,
  MoreVertical,
  Filter,
  X,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useCommunities, useCommunity } from "@/hooks/useCommunities";
import { useCommunityPosts } from "@/hooks/usePosts";
import type { Post } from "@/lib/api/mock";

const CATEGORIES = [
  "LoFi", "Metal", "Electronic", "Jazz", "Hip Hop", "Indie", 
  "Classical", "R&B", "Reggae", "Beginner", "Late Night", 
  "Practice", "Collab"
];

interface CommunitiesTabProps {
  onGuestAction?: () => void;
}

function CommunitiesTab({ onGuestAction }: CommunitiesTabProps) {
  const { id: communityId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryFilter = searchParams.get("category") || "";
  const searchQuery = searchParams.get("search") || "";
  const { isGuest, user } = useAuthStore();
  const { data: communities = [] } = useCommunities({ 
    category: categoryFilter || undefined,
    search: searchQuery || undefined,
  });
  const { data: selectedCommunity } = useCommunity(communityId || "");
  const { data: communityPosts = [], isLoading: postsLoading } = useCommunityPosts(communityId || "");
  const [communitySearchInput, setCommunitySearchInput] = useState(searchQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [newPost, setNewPost] = useState({
    content: "",
    audioFile: null as File | null,
  });
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const handleCategoryClick = (category: string) => {
    if (categoryFilter === category) {
      // Deselect category - only include search if it exists
      const params: Record<string, string> = {};
      if (searchQuery) params.search = searchQuery;
      setSearchParams(params);
    } else {
      // Select category - only include search if it exists
      const params: Record<string, string> = { category };
      if (searchQuery) params.search = searchQuery;
      setSearchParams(params);
    }
  };

  const handleCommunitySearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params: Record<string, string> = {};
    if (categoryFilter) params.category = categoryFilter;
    if (communitySearchInput) params.search = communitySearchInput;
    setSearchParams(params);
  };

  const handleCommunityClick = (communityId: string) => {
    navigate(`/community/${communityId}`);
  };

  const handleJoin = (communityId: string) => {
    if (isGuest) {
      onGuestAction?.();
      return;
    }
    // TODO: Implement join functionality
    console.log("Join community:", communityId);
  };

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

  // Get entry ramp communities
  const newAndActive = communities
    .filter(c => c.activeCount > 15)
    .slice(0, 2);
  const liveJams = communities
    .filter(c => c.isLive)
    .slice(0, 2);
  const trending = communities
    .sort((a, b) => b.activeCount - a.activeCount)
    .slice(0, 1);

  const entryRamps = [
    ...newAndActive.map(c => ({ ...c, label: "New & Active" })),
    ...liveJams.map(c => ({ ...c, label: "Live Jams Now" })),
    ...trending.map(c => ({ ...c, label: "Trending This Week" })),
  ].slice(0, 5);

  if (selectedCommunity) {
    return (
      <>
        {/* Community Header Banner */}
        <div className="bg-gradient-to-r from-primary/20 to-primary/10 border-b border-border">
          <div className="p-6">
            <div className="flex items-start gap-4">
              {/* Community Avatar */}
              <div className="flex-shrink-0">
                <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
                  {selectedCommunity.name.substring(0, 2).toUpperCase()}
                </div>
              </div>
              
              {/* Community Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold">{selectedCommunity.name}</h1>
                </div>
                <p className="text-muted-foreground mb-3">{selectedCommunity.description}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{selectedCommunity.activeCount} active</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{selectedCommunity.totalMembers} members</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {selectedCommunity.category.map((cat) => (
                    <span
                      key={cat}
                      className="text-xs px-2 py-1 rounded bg-muted"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
                <Button
                  onClick={() => handleJoin(selectedCommunity.id)}
                  size="sm"
                >
                  Join Community
                </Button>
              </div>
            </div>
          </div>
        </div>

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
                  placeholder={`Post to ${selectedCommunity.name}...`}
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
                    <label htmlFor="community-audio-upload" className="cursor-pointer">
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
                        id="community-audio-upload"
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
          ) : communityPosts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Music className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No posts yet</p>
              <p className="text-xs mt-1">Be the first to share something!</p>
            </div>
          ) : (
            communityPosts.map((post: Post) => (
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
            ))
          )}
        </div>
      </>
    );
  }

  return (
    <div className="p-4">
      <div>
        <h2 className="text-lg font-semibold mb-6">Communities</h2>

        {/* Search and Filter Toggle */}
        <div className="mb-4">
          <form onSubmit={handleCommunitySearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search communities..."
                value={communitySearchInput}
                onChange={(e) => setCommunitySearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
            <Button
              type="button"
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </form>
        </div>

        {/* Category Filters - Toggleable */}
        {showFilters && (
          <div className="mb-6 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Filter by Category</span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setShowFilters(false)}
                className="h-6 w-6"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryClick(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    categoryFilter === category
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Communities List - One per row */}
        {communities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Music className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No communities found</p>
            <p className="text-xs mt-1">
              {searchQuery || categoryFilter 
                ? "Try adjusting your filters"
                : "No communities available yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {communities.map((community) => (
              <Card
                key={community.id}
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleCommunityClick(community.id)}
              >
                <div className="flex items-center gap-4">
                  {/* Community Avatar/Icon */}
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-lg font-bold text-primary-foreground">
                      {community.name.substring(0, 2).toUpperCase()}
                    </div>
                  </div>
                  
                  {/* Community Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-base">{community.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                      {community.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{community.activeCount} active</span>
                      </div>
                      <span>•</span>
                      <span>{community.totalMembers} members</span>
                      <div className="flex items-center gap-2 ml-auto">
                        {community.category.slice(0, 3).map((cat) => (
                          <span
                            key={cat}
                            className="px-2 py-0.5 rounded bg-muted"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CommunitiesTab;

