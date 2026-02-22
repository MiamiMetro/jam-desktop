import { useState, useCallback } from "react";
import { useSearchParams, useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import {
  Music,
  Users,
  ArrowLeft,
  Disc3,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useCommunities, useCommunity } from "@/hooks/useCommunities";
import { useCommunityPosts, useToggleLike, useCreatePost } from "@/hooks/usePosts";
import { PostCard } from "@/components/PostCard";
import { ComposePost } from "@/components/ComposePost";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { SearchInput } from "@/components/SearchInput";
import { formatTimeAgo } from "@/lib/postUtils";
import type { FrontendPost } from "@/hooks/usePosts";

const CATEGORIES = [
  "LoFi", "Metal", "Electronic", "Jazz", "Hip Hop", "Indie",
  "Classical", "R&B", "Reggae", "Beginner", "Late Night",
  "Practice", "Collab"
];

// Genre-to-color map for community avatars
const GENRE_COLORS: Record<string, { bg: string; text: string }> = {
  "LoFi": { bg: "bg-indigo-500/20", text: "text-indigo-400" },
  "Rock": { bg: "bg-red-500/20", text: "text-red-400" },
  "Metal": { bg: "bg-red-600/20", text: "text-red-500" },
  "Electronic": { bg: "bg-purple-500/20", text: "text-purple-400" },
  "Jazz": { bg: "bg-amber-500/20", text: "text-amber-400" },
  "Hip Hop": { bg: "bg-green-500/20", text: "text-green-400" },
  "Indie": { bg: "bg-teal-500/20", text: "text-teal-400" },
  "Classical": { bg: "bg-rose-500/20", text: "text-rose-400" },
  "R&B": { bg: "bg-pink-500/20", text: "text-pink-400" },
  "Reggae": { bg: "bg-yellow-500/20", text: "text-yellow-400" },
  "Beginner": { bg: "bg-sky-500/20", text: "text-sky-400" },
  "Late Night": { bg: "bg-violet-500/20", text: "text-violet-400" },
  "Practice": { bg: "bg-cyan-500/20", text: "text-cyan-400" },
  "Collab": { bg: "bg-orange-500/20", text: "text-orange-400" },
};

function getGenreColor(categories: string[]) {
  for (const cat of categories) {
    if (GENRE_COLORS[cat]) return GENRE_COLORS[cat];
  }
  return { bg: "bg-primary/20", text: "text-primary" };
}

interface CommunitiesTabProps {
  onGuestAction?: () => void;
}

function CommunitiesTab({ onGuestAction }: CommunitiesTabProps) {
  const { id: communityId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
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
  const handleSearchChange = useCallback((query: string) => {
    const params: Record<string, string> = {};
    if (categoryFilter) params.category = categoryFilter;
    if (query) params.search = query;
    setSearchParams(params, { replace: true });
  }, [categoryFilter, setSearchParams]);
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


  const handleCommunityClick = (communityId: string) => {
    navigate(`/community/${communityId}`);
  };

  const handlePostClick = (postId: string) => {
    navigate(`/post/${postId}`, { state: { backgroundLocation: location } });
  };

  const handleJoin = (_targetCommunityId: string) => {
    if (isGuest) {
      onGuestAction?.();
      return;
    }
    // TODO: Implement join functionality with _targetCommunityId
  };

  const createPostMutation = useCreatePost();

  const handleCreatePost = (content: string, _audioFile: File | null) => {
    if (!content.trim()) return;
    createPostMutation.mutate(
      { content: content.trim() },
      { onSuccess: () => {} }
    );
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

  // Mock active members for sidebar and list avatars
  const mockMembers = [
    { id: "m1", username: "Tylobic", avatar: "" },
    { id: "m2", username: "BeatMaker", avatar: "" },
    { id: "m3", username: "SynthWave", avatar: "" },
    { id: "m4", username: "JazzCat", avatar: "" },
    { id: "m5", username: "LoFiKing", avatar: "" },
  ];

  // Deterministic mock members per community (rotate from pool)
  const getMockMembersForCommunity = (communityId: string) => {
    const hash = communityId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const start = hash % mockMembers.length;
    return [
      mockMembers[start % mockMembers.length],
      mockMembers[(start + 1) % mockMembers.length],
      mockMembers[(start + 2) % mockMembers.length],
    ];
  };

  if (selectedCommunity) {
    const communityGenre = getGenreColor(selectedCommunity.category);
    return (
      <div className="flex h-full">
        {/* Main Content */}
        <div className="flex-1 min-w-0 overflow-y-auto border-r border-border">
          {/* Community Header — compact, consistent */}
          <div className="px-5 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Avatar className="h-10 w-10 flex-shrink-0 ring-1 ring-border">
                <AvatarImage src="" alt={selectedCommunity.name} />
                <AvatarFallback className={`${communityGenre.bg} ${communityGenre.text} text-sm font-bold`}>
                  {selectedCommunity.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-heading font-bold truncate">{selectedCommunity.name}</h1>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {selectedCommunity.activeCount} active
                  </span>
                  <span className="text-border">·</span>
                  <span>{selectedCommunity.totalMembers} members</span>
                  {selectedCommunity.category.slice(0, 2).map((cat) => {
                    const catColor = GENRE_COLORS[cat] || { bg: "bg-muted", text: "text-muted-foreground" };
                    return (
                      <span key={cat} className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${catColor.bg} ${catColor.text}`}>
                        {cat}
                      </span>
                    );
                  })}
                </div>
              </div>
              <Button
                onClick={() => handleJoin(selectedCommunity.id)}
                size="sm"
                className="glow-primary flex-shrink-0"
              >
                Join
              </Button>
            </div>
            {selectedCommunity.description && (
              <p className="text-xs text-muted-foreground mt-2 ml-[52px] line-clamp-2">
                {selectedCommunity.description}
              </p>
            )}
          </div>

          {/* Compose Post Area */}
          <ComposePost
            placeholder={`Post to ${selectedCommunity.name}...`}
            onSubmit={handleCreatePost}
            onGuestAction={onGuestAction}
          />

          {/* Posts Feed */}
          <div className="divide-y divide-border/50">
            {postsLoading ? (
              <LoadingState message="Loading posts..." />
            ) : communityPosts.length === 0 ? (
              <EmptyState
                icon={Music}
                title="No posts yet"
                description="Be the first to share something!"
              />
            ) : (
              communityPosts.map((post: FrontendPost) => (
                <div key={post.id} className="hover:bg-foreground/[0.03] transition-colors">
                  <PostCard
                    post={post}
                    communityName={null}
                    isPlaying={playingAudioId === post.id}
                    isGuest={isGuest}
                    onAuthorClick={handleAuthorClick}
                    onCommunityClick={handleCommunityClick}
                    onPostClick={handlePostClick}
                    onLike={handleLikePost}
                    onPlayPause={() => setPlayingAudioId(playingAudioId === post.id ? null : post.id)}
                    formatTimeAgo={formatTimeAgo}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Members Sidebar */}
        <div className="w-60 flex-shrink-0 p-4 overflow-y-auto">
          <h3 className="text-xs font-heading font-semibold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
            <Users className="h-3.5 w-3.5" />
            Active Members
          </h3>
          <div className="space-y-1">
            {mockMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => navigate(`/profile/${member.username}`)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <Avatar size="sm" className="h-8 w-8">
                  <AvatarImage src={member.avatar} alt={member.username} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    {member.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate">{member.username}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Compact Header */}
      <div className="px-5 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
        <Disc3 className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-heading font-semibold text-muted-foreground">Communities</h2>
      </div>

      {/* Search + Filters */}
      <div className="px-5 pt-3 flex-shrink-0">
        <SearchInput
          placeholder="Search communities..."
          value={searchQuery}
          onSearch={handleSearchChange}
          className="mb-3"
        />

        {/* Category Filters — genre-colored active state */}
        <div className="flex flex-wrap gap-2 py-1 pb-3">
          {CATEGORIES.map((category) => {
            const isActive = categoryFilter === category;
            const genreColor = GENRE_COLORS[category] || { bg: "bg-primary/20", text: "text-primary" };
            return (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? `${genreColor.bg} ${genreColor.text} ring-1 ring-current/20`
                    : "glass-solid text-muted-foreground hover:text-foreground hover:ring-1 hover:ring-primary/20"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Communities List */}
      <div className="flex-1 overflow-y-auto">
        {communities.length === 0 ? (
          <EmptyState
            icon={Music}
            title="No communities found"
            description={searchQuery || categoryFilter
              ? "Try adjusting your filters"
              : "No communities available yet"}
          />
        ) : (
          <div className="divide-y divide-border/50">
            {communities.map((community) => {
              const genreColor = getGenreColor(community.category);
              return (
                <div
                  key={community.id}
                  className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-foreground/[0.03] transition-colors border-l-2 border-l-transparent hover:border-l-primary/40"
                  onClick={() => handleCommunityClick(community.id)}
                >
                  <div className="flex-shrink-0">
                    <Avatar className="h-11 w-11 ring-1 ring-border">
                      <AvatarImage src="" alt={community.name} />
                      <AvatarFallback className={`${genreColor.bg} ${genreColor.text} text-base font-bold`}>
                        {community.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-heading font-semibold text-sm truncate">{community.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">
                      {community.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {community.activeCount} active
                      </span>
                      <span className="text-border">·</span>
                      <span>{community.totalMembers} members</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <AvatarGroup>
                      {getMockMembersForCommunity(community.id).map(m => (
                        <Avatar key={m.id} size="xs" className="h-5 w-5 ring-1 ring-background">
                          <AvatarFallback className="bg-muted text-muted-foreground text-[7px]">
                            {m.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </AvatarGroup>
                    {community.category.slice(0, 2).map((cat) => {
                      const catColor = GENRE_COLORS[cat] || { bg: "bg-muted", text: "text-muted-foreground" };
                      return (
                        <span
                          key={cat}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${catColor.bg} ${catColor.text}`}
                        >
                          {cat}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default CommunitiesTab;

