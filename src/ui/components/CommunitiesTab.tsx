import { useState } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Music, 
  Users, 
  Filter,
  X,
  ArrowLeft,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useCommunities, useCommunity } from "@/hooks/useCommunities";
import { useCommunityPosts } from "@/hooks/usePosts";
import { PostCard } from "@/components/PostCard";
import { ComposePost } from "@/components/ComposePost";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { SearchInput } from "@/components/SearchInput";
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
  const [communitySearchInput, setCommunitySearchInput] = useState(searchQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  
  const handleAuthorClick = (username: string) => {
    navigate(`/profile/${username}`);
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

  const handleCreatePost = (content: string, audioFile: File | null) => {
    // TODO: Implement actual post creation with API
    console.log("Creating post to community:", { communityId, content, audioFile });
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
        <div className="relative h-40 bg-gradient-to-r from-primary/20 to-primary/10 border-b border-border">
          {/* Back Button - positioned absolutely */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={() => navigate(-1)}
            title="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Community Content */}
        <div className="relative px-4 pb-4 border-b border-border">
          {/* Community Avatar */}
          <div className="relative -mt-16 mb-4">
            <div className="h-24 w-24 rounded-full border-4 border-background overflow-hidden">
              <Avatar className="h-full w-full">
                <AvatarImage src={selectedCommunity.avatar || ""} alt={selectedCommunity.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold h-full w-full">
                  {selectedCommunity.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Community Info */}
          <div className="mb-4">
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

        {/* Compose Post Area */}
        <ComposePost
          placeholder={selectedCommunity ? `Post to ${selectedCommunity.name}...` : "What's on your mind? Share a message or upload audio..."}
          onSubmit={handleCreatePost}
          onGuestAction={onGuestAction}
        />

        {/* Posts Feed */}
        <div className="divide-y divide-border">
          {postsLoading ? (
            <LoadingState message="Loading posts..." />
          ) : communityPosts.length === 0 ? (
            <EmptyState 
              icon={Music} 
              title="No posts yet" 
              description="Be the first to share something!"
            />
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
        <SearchInput
          placeholder="Search communities..."
          value={communitySearchInput}
          onChange={setCommunitySearchInput}
          onSubmit={handleCommunitySearch}
          extraButtons={
            <Button
              type="button"
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          }
        />

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
          <EmptyState
            icon={Music}
            title="No communities found"
            description={searchQuery || categoryFilter 
              ? "Try adjusting your filters"
              : "No communities available yet"}
          />
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
                    <div className="h-12 w-12 rounded-full overflow-hidden">
                      <Avatar className="h-full w-full">
                        <AvatarImage src={community.avatar || ""} alt={community.name} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold h-full w-full">
                          {community.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
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

