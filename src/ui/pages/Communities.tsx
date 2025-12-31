import { useState } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  Music, 
  Users, 
  Hash, 
  Search,
  Play,
  Sun,
  Moon,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { useCommunities, useCommunity } from "@/hooks/useCommunities";

const CATEGORIES = [
  "LoFi", "Metal", "Electronic", "Jazz", "Hip Hop", "Indie", 
  "Classical", "R&B", "Reggae", "Beginner", "Late Night", 
  "Practice", "Collab"
];

function Communities() {
  const { id: communityId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryFilter = searchParams.get("category") || "";
  const searchQuery = searchParams.get("search") || "";
  
  const { isGuest } = useAuthStore();
  const { theme, setTheme } = useUIStore();
  const { data: communities = [], isLoading } = useCommunities({ 
    category: categoryFilter || undefined,
    search: searchQuery || undefined,
  });
  const { data: selectedCommunity } = useCommunity(communityId || "");
  
  const [searchInput, setSearchInput] = useState(searchQuery);

  const getCurrentTheme = () => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme;
  };

  const toggleTheme = () => {
    const currentTheme = getCurrentTheme();
    setTheme(currentTheme === "dark" ? "light" : "dark");
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params: Record<string, string> = {};
    if (categoryFilter) params.category = categoryFilter;
    if (searchInput) params.search = searchInput;
    setSearchParams(params);
  };

  const handleCommunityClick = (communityId: string) => {
    navigate(`/community/${communityId}`);
  };

  const handleJoin = (communityId: string) => {
    if (isGuest) {
      // User can sign up/login using the inline auth panel
      return;
    }
    // TODO: Implement join functionality
    console.log("Join community:", communityId);
  };

  // Get entry ramp communities (new & active, live jams, trending)
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
      <div className="flex h-screen bg-background text-foreground">
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Navigation Header */}
          <div className="border-b border-border px-4 py-3 bg-background sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate("/feed")}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-muted"
                >
                  Feed
                </button>
                <button
                  onClick={() => navigate("/jams")}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-muted-foreground hover:bg-muted"
                >
                  <Music className="h-4 w-4" />
                  Jams
                </button>
                <button
                  onClick={() => navigate("/communities")}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 bg-primary text-primary-foreground"
                >
                  <Users className="h-4 w-4" />
                  Communities
                </button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-8 w-8"
              >
                {getCurrentTheme() === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/communities")}
            className="mb-4"
          >
            ← Back to Communities
          </Button>
          
          <div className="space-y-6">
            {/* Community Header */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Hash className="h-6 w-6 text-primary" />
                <h1 className="text-3xl font-bold">{selectedCommunity.name}</h1>
              </div>
              <p className="text-muted-foreground mb-4">{selectedCommunity.description}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{selectedCommunity.activeCount} active</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>{selectedCommunity.totalMembers} members</span>
                </div>
                {selectedCommunity.isLive && (
                  <div className="flex items-center gap-1 text-green-500">
                    <Play className="h-4 w-4" />
                    <span>Live</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                {selectedCommunity.category.map((cat) => (
                  <span
                    key={cat}
                    className="text-xs px-2 py-1 rounded bg-muted"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            {/* Join Button */}
            <Button
              onClick={() => handleJoin(selectedCommunity.id)}
              size="lg"
              className="w-full sm:w-auto"
            >
              Join Community
            </Button>

            {/* Promise */}
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>A place for {selectedCommunity.category[0]?.toLowerCase() || "musicians"} to {selectedCommunity.description.toLowerCase()}.</strong>
              </p>
            </div>

            {/* Recent Activity */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              {selectedCommunity.recentJam && (
                <Card className="p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <Music className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <h3 className="font-semibold">{selectedCommunity.recentJam.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedCommunity.recentJam.participants}/{selectedCommunity.recentJam.maxParticipants} participants
                      </p>
                    </div>
                  </div>
                </Card>
              )}
              {selectedCommunity.recentPosts.length === 0 && (
                <p className="text-sm text-muted-foreground">No recent posts yet.</p>
              )}
            </div>

            {/* Sample Content */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Sample Content</h2>
              <p className="text-sm text-muted-foreground">
                Join to see posts and audio clips from this community.
              </p>
            </div>
          </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navigation Header */}
        <div className="border-b border-border px-4 py-3 bg-background sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/feed")}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-muted"
              >
                Feed
              </button>
              <button
                onClick={() => navigate("/jams")}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-muted-foreground hover:bg-muted"
              >
                <Music className="h-4 w-4" />
                Jams
              </button>
              <button
                onClick={() => navigate("/communities")}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 bg-primary text-primary-foreground"
              >
                <Users className="h-4 w-4" />
                Communities
              </button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8"
            >
              {getCurrentTheme() === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">Communities</h1>

          {/* Entry Ramps */}
          {entryRamps.length > 0 && (
            <div className="mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {entryRamps.map((community) => (
                  <Card
                    key={community.id}
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleCommunityClick(community.id)}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <Hash className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{community.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                          {community.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{community.activeCount} active</span>
                      </div>
                      {community.isLive && (
                        <div className="flex items-center gap-1 text-xs text-green-500">
                          <Play className="h-3 w-3" />
                          <span>Live</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                        {community.label}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Category Filters */}
          <div className="mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryClick(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    categoryFilter === category
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search communities..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">Search</Button>
            </div>
          </form>

          {/* Communities List */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Loading communities...</p>
            </div>
          ) : communities.length === 0 ? (
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {communities.map((community) => (
                <Card
                  key={community.id}
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleCommunityClick(community.id)}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <Hash className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{community.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {community.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {community.category.slice(0, 3).map((cat) => (
                      <span
                        key={cat}
                        className="text-xs px-2 py-0.5 rounded bg-muted"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{community.activeCount} active</span>
                    </div>
                    {community.isLive && (
                      <div className="flex items-center gap-1 text-xs text-green-500">
                        <Play className="h-3 w-3" />
                        <span>Live</span>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Communities;

