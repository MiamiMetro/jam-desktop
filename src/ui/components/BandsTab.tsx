import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Guitar, Users as UsersIcon, MapPin } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/authStore";
import {
  useBandListings,
  useMyBands,
  useMyBandListings,
  type BandListing,
  type MyBand,
} from "@/hooks/useBands";
import { SearchInput } from "@/components/SearchInput";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { CreateBandListingDialog } from "@/components/bands/CreateBandListingDialog";
import { BandApplicationDialog } from "@/components/bands/BandApplicationDialog";
import { MyBandListingCard } from "@/components/bands/MyBandListingCard";

const SEEKING_ROLES = [
  "Vocalist",
  "Guitarist",
  "Bassist",
  "Drummer",
  "Keyboardist",
  "Producer",
  "Other",
] as const;

type BandsView = "all" | "myListings" | "joined";

function MyBandCard({ band }: { band: MyBand }) {
  const { listing, application, joined_at: joinedAt, membership_role: membershipRole } = band;
  const activityDate = joinedAt
    ? new Date(joinedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;
  const isOwner = membershipRole === "owner";

  return (
    <div className="flex items-start gap-4 px-5 py-3.5 hover:bg-foreground/3 transition-colors">
      <Avatar className="h-11 w-11 shrink-0 ring-1 ring-primary/20 mt-0.5">
        <AvatarImage src={listing.owner?.avatar_url || ""} alt={listing.band_name} />
        <AvatarFallback className="bg-primary/10 text-primary text-base font-bold">
          {listing.band_name.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-heading font-semibold text-sm truncate">{listing.band_name}</h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
            isOwner
              ? "bg-primary/10 text-primary"
              : "bg-green-500/15 text-green-400"
          }`}>
            {isOwner ? "Owner" : "Member"}
          </span>
          {application && (
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0">
              {application.instrument}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
          <span className="flex items-center gap-1">
            <UsersIcon className="h-3 w-3" />
            {listing.current_members}/{listing.max_members}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {listing.region}
          </span>
          {listing.genre && <span>• {listing.genre}</span>}
        </div>

        {listing.description && (
          <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-1.5">
            {listing.description}
          </p>
        )}

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            by @{listing.owner?.username || "unknown"}
          </span>
          {activityDate && (
            <span className="text-[10px] text-muted-foreground">
              • {isOwner ? "created" : "joined"} {activityDate}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function BandsTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isGuest } = useAuthStore();
  const roleFilter = searchParams.get("role") || "";
  const searchQuery = searchParams.get("search") || "";
  const [createOpen, setCreateOpen] = useState(false);
  const [applyListing, setApplyListing] = useState<BandListing | null>(null);
  const [activeView, setActiveView] = useState<BandsView>("all");

  const {
    data: listings = [],
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useBandListings({
    seekingRole: roleFilter || undefined,
    search: searchQuery || undefined,
  });

  const {
    data: myListings = [],
    isLoading: myListingsLoading,
    hasNextPage: hasMoreMyListings,
    isFetchingNextPage: isLoadingMoreMyListings,
    fetchNextPage: fetchMoreMyListings,
  } = useMyBandListings();

  const {
    data: joinedBands = [],
    isLoading: joinedBandsLoading,
    hasNextPage: hasMoreMyBands,
    isFetchingNextPage: isLoadingMoreMyBands,
    fetchNextPage: fetchMoreMyBands,
  } = useMyBands();

  const handleSearchChange = (query: string) => {
    const params: Record<string, string> = {};
    if (roleFilter) params.role = roleFilter;
    if (query) params.search = query;
    setSearchParams(params, { replace: true });
  };

  const handleRoleClick = (role: string) => {
    const params: Record<string, string> = {};
    if (roleFilter !== role) params.role = role;
    if (searchQuery) params.search = searchQuery;
    setSearchParams(params);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="page-header caption-safe px-5 py-3 border-b border-border flex items-center gap-2 shrink-0">
        <Guitar className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-heading font-semibold text-muted-foreground">Bands</h2>
      </div>

      {/* Tabs + Search + Create */}
      <div className="px-5 pt-3 shrink-0">
        {/* View tabs */}
        {!isGuest && (
          <div className="flex items-center gap-1 mb-3">
            <button
              onClick={() => setActiveView("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                activeView === "all"
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              All Listings
            </button>
            <button
              onClick={() => setActiveView("myListings")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                activeView === "myListings"
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              My Listings
              {myListings.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                  {myListings.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveView("joined")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                activeView === "joined"
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              My Bands
              {joinedBands.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                  {joinedBands.length}
                </span>
              )}
            </button>
          </div>
        )}

        {activeView === "all" && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <SearchInput
                placeholder="Search bands..."
                value={searchQuery}
                onSearch={handleSearchChange}
                className="flex-1"
              />
              {!isGuest && (
                <button
                  onClick={() => setCreateOpen(true)}
                  className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer whitespace-nowrap"
                >
                  + Create Listing
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pb-3">
              {SEEKING_ROLES.map((role) => {
                const isActive = roleFilter === role;
                return (
                  <button
                    key={role}
                    onClick={() => handleRoleClick(role)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-primary/15 text-primary ring-1 ring-primary/20"
                        : "glass-solid text-muted-foreground hover:text-foreground hover:ring-1 hover:ring-primary/20"
                    }`}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {activeView === "myListings" && !isGuest && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1" />
            <button
              onClick={() => setCreateOpen(true)}
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer whitespace-nowrap"
            >
              + Create Listing
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeView === "myListings" ? (
          /* My Listings View */
          myListingsLoading ? (
            <LoadingState message="Loading your listings..." />
          ) : myListings.length === 0 ? (
            <EmptyState
              icon={Guitar}
              title="No listings yet"
              description="Create your first band listing to find musicians!"
            />
          ) : (
            <>
              <div className="px-5 py-3 space-y-3">
                {myListings.map((listing) => (
                  <MyBandListingCard key={listing.id} listing={listing} />
                ))}
              </div>
              <div className="p-4">
                <LoadMoreButton
                  hasNextPage={hasMoreMyListings}
                  isFetchingNextPage={isLoadingMoreMyListings}
                  fetchNextPage={fetchMoreMyListings}
                />
              </div>
            </>
          )
        ) : activeView === "joined" ? (
          /* Joined Bands View */
          joinedBandsLoading ? (
            <LoadingState message="Loading your bands..." />
          ) : joinedBands.length === 0 ? (
            <EmptyState
              icon={Guitar}
              title="No bands yet"
              description="Create a listing or join a band to see it here."
            />
          ) : (
            <>
              <div className="divide-y divide-border/50">
                {joinedBands.map((joinedBand) => (
                  <MyBandCard
                    key={`${joinedBand.membership_role}:${joinedBand.listing.id}`}
                    band={joinedBand}
                  />
                ))}
              </div>
              <div className="p-4">
                <LoadMoreButton
                  hasNextPage={hasMoreMyBands}
                  isFetchingNextPage={isLoadingMoreMyBands}
                  fetchNextPage={fetchMoreMyBands}
                />
              </div>
            </>
          )
        ) : (
          /* All Listings View */
          isLoading ? (
            <LoadingState message="Loading bands..." />
          ) : listings.length === 0 ? (
            <EmptyState
              icon={Guitar}
              title="No band listings found"
              description={searchQuery || roleFilter ? "Try adjusting your filters" : "Be the first to create one!"}
            />
          ) : (
            <>
              <div className="divide-y divide-border/50">
                {listings.map((listing) => (
                  <div
                    key={listing.id}
                    className="flex items-start gap-4 px-5 py-3.5 hover:bg-foreground/3 transition-colors"
                  >
                    {/* Avatar */}
                    <Avatar className="h-11 w-11 shrink-0 ring-1 ring-primary/20 mt-0.5">
                      <AvatarImage src={listing.owner?.avatar_url || ""} alt={listing.band_name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-base font-bold">
                        {listing.band_name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-heading font-semibold text-sm truncate">
                          {listing.band_name}
                        </h3>
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0">
                          {listing.seeking_role}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
                        <span className="flex items-center gap-1">
                          <UsersIcon className="h-3 w-3" />
                          {listing.current_members}/{listing.max_members}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {listing.region}
                        </span>
                        {listing.genre && <span>• {listing.genre}</span>}
                      </div>

                      {listing.description && (
                        <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-1.5">
                          {listing.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          by @{listing.owner?.username || "unknown"}
                        </span>
                        {listing.applications_count > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            • {listing.applications_count} application{listing.applications_count !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Apply button */}
                    {!isGuest && (
                      <button
                        onClick={() => setApplyListing(listing)}
                        className="shrink-0 mt-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="p-4">
                <LoadMoreButton
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  fetchNextPage={fetchNextPage}
                />
              </div>
            </>
          )
        )}
      </div>

      <CreateBandListingDialog open={createOpen} onOpenChange={setCreateOpen} />
      <BandApplicationDialog
        open={!!applyListing}
        onOpenChange={(open) => !open && setApplyListing(null)}
        listing={applyListing}
      />
    </div>
  );
}

export default BandsTab;
