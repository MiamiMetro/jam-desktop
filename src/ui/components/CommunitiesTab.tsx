import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Disc3 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/authStore";
import { useCommunities } from "@/hooks/useCommunities";
import { SearchInput } from "@/components/SearchInput";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { getCommunityColors, COMMUNITY_TAGS } from "@/lib/communityColors";
import { CreateCommunityDialog } from "@/components/community/CreateCommunityDialog";

function CommunitiesTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isGuest } = useAuthStore();
  const tagFilter = searchParams.get("tag") || "";
  const searchQuery = searchParams.get("search") || "";
  const [createOpen, setCreateOpen] = useState(false);

  const {
    data: communities = [],
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useCommunities({
    tag: tagFilter || undefined,
    search: searchQuery || undefined,
  });

  const handleSearchChange = (query: string) => {
    const params: Record<string, string> = {};
    if (tagFilter) params.tag = tagFilter;
    if (query) params.search = query;
    setSearchParams(params, { replace: true });
  };

  const handleTagClick = (tag: string) => {
    const params: Record<string, string> = {};
    if (tagFilter !== tag) params.tag = tag;
    if (searchQuery) params.search = searchQuery;
    setSearchParams(params);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="page-header caption-safe px-5 py-3 border-b border-border flex items-center gap-2 shrink-0">
        <Disc3 className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-heading font-semibold text-muted-foreground">Communities</h2>
      </div>

      {/* Search + tag filters */}
      <div className="px-5 pt-3 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <SearchInput
            placeholder="Search communities..."
            value={searchQuery}
            onSearch={handleSearchChange}
            className="flex-1"
          />
          {!isGuest && (
            <button
              onClick={() => setCreateOpen(true)}
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer whitespace-nowrap"
            >
              + Create
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 pb-3">
          {COMMUNITY_TAGS.map((tag) => {
            const isActive = tagFilter === tag;
            return (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-primary/15 text-primary ring-1 ring-primary/20"
                    : "glass-solid text-muted-foreground hover:text-foreground hover:ring-1 hover:ring-primary/20"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Communities list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <LoadingState message="Loading communities..." />
        ) : communities.length === 0 ? (
          <EmptyState
            icon={Disc3}
            title="No communities found"
            description={searchQuery || tagFilter ? "Try adjusting your filters" : "Be the first to create one!"}
          />
        ) : (
          <>
            <div className="divide-y divide-border/50">
              {communities.map((community) => {
                const colors = getCommunityColors(community.theme_color);
                return (
                  <div
                    key={community.id}
                    onClick={() => navigate(`/community/${community.handle}`)}
                    className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-foreground/3 transition-colors border-l-2 border-l-transparent hover:${colors.border}`}
                  >
                    <Avatar className={`h-11 w-11 shrink-0 ring-1 ${colors.ring}`}>
                      <AvatarImage src={community.avatar_url ?? ""} alt={community.name} />
                      <AvatarFallback className={`${colors.avatarBg} ${colors.text} text-base font-bold`}>
                        {community.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-heading font-semibold text-sm truncate">{community.name}</h3>
                        <span className={`text-xs ${colors.text} shrink-0`}>#{community.handle}</span>
                      </div>
                      {community.description && (
                        <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">{community.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {community.members_count} member{community.members_count !== 1 ? "s" : ""}
                        </span>
                        {community.tags?.slice(0, 2).map((tag: string) => (
                          <span
                            key={tag}
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors.badgeBg} ${colors.text}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4">
              <LoadMoreButton
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
              />
            </div>
          </>
        )}
      </div>

      <CreateCommunityDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

export default CommunitiesTab;
