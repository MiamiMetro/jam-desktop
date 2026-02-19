import { useState } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Music,
  Users,
  ArrowLeft,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useCommunities, useCommunity } from "@/hooks/useCommunities";
import { useCommunityPosts, useToggleLike } from "@/hooks/usePosts";
import { PostCard } from "@/components/PostCard";
import { ComposePost } from "@/components/ComposePost";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { SearchInput } from "@/components/SearchInput";
import { formatTimeAgo, formatDuration } from "@/lib/postUtils";
import type { FrontendPost } from "@/hooks/usePosts";

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
  const { isGuest } = useAuthStore();
  const { data: communities = [] } = useCommunities({ 
    category: categoryFilter || undefined,
    search: searchQuery || undefined,
  });
  const { data: selectedCommunity } = useCommunity(communityId || "");
  const { data: communityPosts = [], isLoading: postsLoading } = useCommunityPosts(communityId || "");
  const toggleLikeMutation = useToggleLike();
  const [communitySearchInput, setCommunitySearchInput] = useState(searchQuery);
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

  const handleJoin = (_targetCommunityId: string) => {
    if (isGuest) {
      onGuestAction?.();
      return;
    }
    // TODO: Implement join functionality with _targetCommunityId
  };

  const handleCreatePost = (_content: string, _audioFile: File | null) => {
    // TODO: Implement actual post creation with API using _content and _audioFile
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

  if (selectedCommunity) {
    return (
      <>
        {/* Community Header Banner */}
        <div className="relative h-48 bg-gradient-to-br from-primary/25 via-primary/10 to-background border-b border-border overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,oklch(0.78_0.16_70/15%)_0%,transparent_60%)]" />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 left-4 z-10 glass hover:glass-strong"
            onClick={() => navigate(-1)}
            title="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Community Content */}
        <div className="relative px-5 pb-5 border-b border-border">
          {/* Community Avatar */}
          <div className="relative -mt-16 mb-4">
            <div className="h-28 w-28 rounded-full border-4 border-background overflow-hidden ring-2 ring-primary/30 shadow-[0_0_20px_oklch(0.78_0.16_70/20%)]">
              <Avatar className="h-full w-full">
                <AvatarImage src="" alt={selectedCommunity.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold h-full w-full">
                  {selectedCommunity.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Community Info */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-heading font-bold">{selectedCommunity.name}</h1>
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
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {selectedCommunity.category.map((cat) => (
                <span
                  key={cat}
                  className="text-xs px-2.5 py-1 rounded-full glass text-muted-foreground"
                >
                  {cat}
                </span>
              ))}
            </div>
            <Button
              onClick={() => handleJoin(selectedCommunity.id)}
              size="sm"
              className="glow-primary"
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
            communityPosts.map((post: FrontendPost) => {
              return (
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
              );
            })
          )}
        </div>
      </>
    );
  }

  return (
    <div className="p-5">
      <div>
        <div className="mb-5">
          <h2 className="text-2xl font-heading font-bold mb-1">Communities</h2>
          <p className="text-sm text-muted-foreground">Find your people and make music together</p>
        </div>

        {/* Search */}
        <SearchInput
          placeholder="Search communities..."
          value={communitySearchInput}
          onChange={setCommunitySearchInput}
          onSubmit={handleCommunitySearch}
        />

        {/* Category Filters - Always visible pill bar */}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                categoryFilter === category
                  ? "bg-primary text-primary-foreground shadow-[0_0_12px_oklch(0.78_0.16_70/30%)]"
                  : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Communities List */}
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
                className="p-4 cursor-pointer glass hover:glass-strong transition-all duration-200 hover:ring-1 hover:ring-primary/20"
                onClick={() => handleCommunityClick(community.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-full overflow-hidden ring-1 ring-border">
                      <Avatar className="h-full w-full">
                        <AvatarImage src="" alt={community.name} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold h-full w-full">
                          {community.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-heading font-semibold text-base">{community.name}</h3>
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
                            className="px-2 py-0.5 rounded-full text-[10px] glass"
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

