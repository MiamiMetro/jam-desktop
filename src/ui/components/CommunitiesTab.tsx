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
  Search,
  Upload,
  MoreVertical,
  Filter,
  X,
  ArrowLeft,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useCommunities, useCommunity } from "@/hooks/useCommunities";
import { useCommunityPosts } from "@/hooks/usePosts";
import { useAllUsers } from "@/hooks/useUsers";
import { PostCard } from "@/components/PostCard";
import { formatTimeAgo, formatDuration } from "@/lib/postUtils";
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
  const { data: allUsers = [] } = useAllUsers();
  const [communitySearchInput, setCommunitySearchInput] = useState(searchQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [newPost, setNewPost] = useState({
    content: "",
    audioFile: null as File | null,
  });
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  
  const getUserByUsername = (username: string) => {
    return allUsers.find(u => u.username === username);
  };
  
  const handleAuthorClick = (username: string) => {
    const authorUser = getUserByUsername(username);
    if (authorUser) {
      navigate(`/profile/${authorUser.id}`);
    }
  };

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

  const handlePostClick = (postId: string) => {
    navigate(`/post/${postId}`);
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

  if (selectedCommunity) {
    return (
      <>
        {/* Community Header Banner */}
        <div className="bg-gradient-to-r from-primary/20 to-primary/10 border-b border-border">
          <div className="p-6">
            <div className="flex items-start gap-4">
              {/* Back Button */}
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0"
                onClick={() => navigate(-1)}
                title="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
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
              <PostCard
                key={post.id}
                post={post}
                communityName={null}
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
            ))
          )}
        </div>
      </>
    );
  }

  return (
    <div className="p-4">
      <div>
        <h2 className="text-lg font-semibold mb-4">Communities</h2>

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

