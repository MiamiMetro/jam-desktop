// Profile.tsx — Two-column profile: sidebar info + tabbed content (Activities / Friends)
import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  UserPlus,
  ArrowLeft,
  Music,
  ChevronRight,
  UserMinus,
  Star,
  Guitar,
  Piano,
  CalendarDays,
  Plus,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useUser } from "@/hooks/useUsers";
import { useUserPosts, useToggleLike, type FrontendPost } from "@/hooks/usePosts";
import { useFriends, useRequestFriend, useSentFriendRequests, useDeleteFriend } from "@/hooks/useFriends";
import { EmptyState } from "@/components/EmptyState";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { PostCard } from "@/components/PostCard";
import { formatTimeAgo } from "@/lib/postUtils";
import type { User } from "@/lib/api/types";

function Profile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser, isGuest } = useAuthStore();
  const { data: profileUser, isLoading } = useUser(username || "");
  const {
    data: userPosts = [],
    fetchNextPage: fetchMorePosts,
    hasNextPage: hasMorePosts,
    isFetchingNextPage: isLoadingMorePosts
  } = useUserPosts(profileUser?.username || "");
  const { data: profileUserFriends = [], fetchNextPage: fetchMoreFriends, hasNextPage: hasMoreFriends, isFetchingNextPage: isLoadingMoreFriends } = useFriends(undefined, profileUser?.id);
  const { data: currentUserFriends = [] } = useFriends();

  const requestFriendMutation = useRequestFriend();
  const deleteFriendMutation = useDeleteFriend();
  const toggleLikeMutation = useToggleLike();
  const { hasPendingRequest } = useSentFriendRequests();
  const [activeTab, setActiveTab] = useState<"posts" | "friends">("posts");
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const isOwnProfile = currentUser?.username === profileUser?.username;
  const isFriend = currentUserFriends.some((friend: User) => friend.id === profileUser?.id);
  const hasSentRequest = profileUser?.id ? hasPendingRequest(profileUser.id) : false;

  const mutualFriends = !isOwnProfile
    ? currentUserFriends.filter((f: User) => profileUserFriends.some((pf: User) => pf.id === f.id))
    : [];

  const handleAddFriend = async () => {
    if (isGuest || !profileUser?.id) return;
    try {
      await requestFriendMutation.mutateAsync(profileUser.id);
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const handleCancelRequest = async () => {
    if (isGuest || !profileUser?.id) return;
    try {
      await deleteFriendMutation.mutateAsync(profileUser.id);
    } catch (error) {
      console.error('Error canceling friend request:', error);
    }
  };

  const handleUnfriend = async () => {
    if (isGuest || !profileUser?.id) return;
    try {
      await deleteFriendMutation.mutateAsync(profileUser.id);
    } catch (error) {
      console.error('Error unfriending:', error);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (isGuest) return;
    try {
      await toggleLikeMutation.mutateAsync(postId);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        {/* Banner skeleton */}
        <div className="h-36 animate-shimmer flex-shrink-0" />
        {/* Two-column skeleton */}
        <div className="flex-1 flex min-h-0">
          {/* Left sidebar skeleton */}
          <div className="w-[320px] min-w-[320px] border-r border-border p-5">
            <div className="-mt-14 h-24 w-24 rounded-full animate-shimmer ring-2 ring-background mb-4" />
            <div className="h-6 w-36 rounded animate-shimmer mb-2" />
            <div className="h-4 w-48 rounded animate-shimmer mb-4" />
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/50">
              <div className="h-4 w-16 rounded animate-shimmer" />
              <div className="h-4 w-16 rounded animate-shimmer" />
            </div>
            <div className="h-9 w-full rounded-lg animate-shimmer mb-4" />
            <div className="pt-4 border-t border-border/50 space-y-2">
              <div className="h-4 w-20 rounded animate-shimmer" />
              <div className="h-10 w-full rounded-lg animate-shimmer" />
            </div>
          </div>
          {/* Right content skeleton */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex border-b border-border px-5 py-3 gap-4 flex-shrink-0">
              <div className="h-4 w-20 rounded animate-shimmer" />
              <div className="h-4 w-16 rounded animate-shimmer" />
            </div>
            <div className="p-5 space-y-4">
              <div className="h-24 w-full rounded-lg animate-shimmer" />
              <div className="h-24 w-full rounded-lg animate-shimmer" />
              <div className="h-24 w-full rounded-lg animate-shimmer" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="p-6">
        <EmptyState
          icon={UserPlus}
          title="User not found"
          action={<Button variant="outline" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-3.5 w-3.5 mr-1.5" />Go Back</Button>}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Banner */}
      <div className="relative h-36 bg-gradient-to-br from-primary/30 via-primary/15 to-primary/5 border-b border-border overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,oklch(0.78_0.16_70/18%)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,oklch(0.78_0.16_70/10%)_0%,transparent_50%)]" />
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 left-3 z-10 glass-solid hover:glass-strong"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left sidebar — profile info */}
        <div className="w-[320px] min-w-[320px] border-r border-border p-5">
          {/* Avatar overlapping banner */}
          <div className="-mt-14 relative z-10 h-24 w-24 rounded-full border-4 border-background overflow-hidden ring-2 ring-primary/30 shadow-[0_0_20px_oklch(0.78_0.16_70/20%)] mb-4">
            <Avatar className="h-full w-full">
              <AvatarImage src={profileUser.avatar_url || ""} alt={profileUser.username} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold h-full w-full">
                {profileUser.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Username + badge */}
          <div className="flex items-center gap-2 mb-3">
            <h1 className="text-xl font-heading font-bold">{profileUser.username}</h1>
            {isOwnProfile && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                <Star className="h-3 w-3" />
                You
              </span>
            )}
          </div>

          {/* Bio — placeholder for future customization */}
          {isOwnProfile ? (
            <button
              className="w-full text-left text-sm text-muted-foreground/60 hover:text-muted-foreground mb-3 transition-colors cursor-pointer"
              onClick={() => {}}
            >
              + Add a bio...
            </button>
          ) : (
            <p className="text-sm text-muted-foreground mb-3">No bio yet.</p>
          )}

          {/* Stats */}
          <div className="flex items-center text-sm mb-4 pb-4 border-b border-border/50">
            <button
              onClick={() => setActiveTab("posts")}
              className={`flex items-center gap-1.5 transition-colors cursor-pointer pb-1 border-b-2 ${
                activeTab === "posts"
                  ? "border-b-primary text-foreground"
                  : "border-b-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="font-semibold text-primary">{userPosts.length}</span>
              <span>Posts</span>
            </button>
            <span className="mx-3 text-border">·</span>
            <button
              onClick={() => setActiveTab("friends")}
              className={`flex items-center gap-1.5 transition-colors cursor-pointer pb-1 border-b-2 ${
                activeTab === "friends"
                  ? "border-b-primary text-foreground"
                  : "border-b-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="font-semibold text-primary">{profileUserFriends.length}</span>
              <span>Friends</span>
            </button>
          </div>

          {/* Mutual friends */}
          {!isOwnProfile && mutualFriends.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <AvatarGroup>
                {mutualFriends.slice(0, 3).map((friend: User) => (
                  <Avatar key={friend.id} size="xs" className="h-5 w-5">
                    <AvatarImage src={friend.avatar_url || ""} alt={friend.username} />
                    <AvatarFallback className="bg-muted text-muted-foreground text-[8px]">
                      {friend.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </AvatarGroup>
              <span className="text-xs text-muted-foreground">
                {mutualFriends.length} mutual friend{mutualFriends.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Friend action */}
          {!isOwnProfile && !isGuest && (
            <div className="mb-4">
              {isFriend ? (
                <Button onClick={handleUnfriend} size="sm" variant="outline" className="w-full">
                  <UserMinus className="h-4 w-4 mr-2" />
                  Unfriend
                </Button>
              ) : hasSentRequest ? (
                <Button onClick={handleCancelRequest} size="sm" variant="outline" className="w-full">
                  <UserMinus className="h-4 w-4 mr-2" />
                  Cancel Request
                </Button>
              ) : (
                <Button onClick={handleAddFriend} size="sm" className="w-full glow-primary">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Friend
                </Button>
              )}
            </div>
          )}

          {/* Musician Profile */}
          <div className="pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Music className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Musician</span>
            </div>
            {isOwnProfile ? (
              <button
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-border/60 hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer group"
                onClick={() => {}}
              >
                <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Add instruments & genres</p>
                  <p className="text-xs text-muted-foreground">Let others know what you play</p>
                </div>
              </button>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    { icon: Guitar, label: "Guitar" },
                    { icon: Piano, label: "Keys" },
                  ].map(({ icon: Icon, label }) => (
                    <span key={label} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      <Icon className="h-3 w-3" />
                      {label}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["Lo-Fi", "Jazz"].map((genre) => (
                    <span key={genre} className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium">
                      {genre}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Member since */}
          {profileUser.created_at && (
            <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              <span>Member since {new Date(profileUser.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
          )}
        </div>

        {/* Right — tabbed content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Tab bar */}
          <div className="flex border-b border-border flex-shrink-0">
            <button
              onClick={() => setActiveTab("posts")}
              className={`px-5 py-3 text-sm font-medium transition-colors relative cursor-pointer ${
                activeTab === "posts"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Activities
              {activeTab === "posts" && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("friends")}
              className={`px-5 py-3 text-sm font-medium transition-colors relative cursor-pointer ${
                activeTab === "friends"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Friends
              <span className="ml-1.5 text-xs text-muted-foreground">({profileUserFriends.length})</span>
              {activeTab === "friends" && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "posts" ? (
              <>
                {userPosts.length === 0 ? (
                  <EmptyState icon={Music} title="No recent activities" />
                ) : (
                  <div className="divide-y divide-border/50">
                    {userPosts.map((post: FrontendPost) => (
                      <div key={post.id} className="hover:bg-foreground/[0.03] transition-colors">
                        <PostCard
                          post={post}
                          communityName={null}
                          isPlaying={playingAudioId === post.id}
                          isGuest={isGuest}
                          onAuthorClick={(u) => navigate(`/profile/${u}`)}
                          onPostClick={(pid) => navigate(`/post/${pid}`, { state: { backgroundLocation: location } })}
                          onLike={handleLikePost}
                          onPlayPause={() => setPlayingAudioId(playingAudioId === post.id ? null : post.id)}
                          formatTimeAgo={formatTimeAgo}
                        />
                      </div>
                    ))}
                  </div>
                )}
                {userPosts.length > 0 && (
                  <LoadMoreButton
                    hasNextPage={hasMorePosts}
                    isFetchingNextPage={isLoadingMorePosts}
                    fetchNextPage={fetchMorePosts}
                  />
                )}
              </>
            ) : (
              <>
                {profileUserFriends.length === 0 ? (
                  <EmptyState icon={UserPlus} title="No friends yet" />
                ) : (
                  <div className="divide-y divide-border/50">
                    {profileUserFriends.map((friend: User) => (
                      <div
                        key={friend.id}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-foreground/[0.03] transition-colors cursor-pointer"
                        onClick={() => navigate(`/profile/${friend.username}`)}
                      >
                        <Avatar size="sm" className="h-10 w-10 ring-1 ring-border">
                          <AvatarImage src={friend.avatar_url || ""} alt={friend.username} />
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                            {friend.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{friend.username}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )}
                <LoadMoreButton
                  hasNextPage={hasMoreFriends}
                  isFetchingNextPage={isLoadingMoreFriends}
                  fetchNextPage={fetchMoreFriends}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
