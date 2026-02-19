// Profile.tsx — User profile page with glass surfaces, PostCard reuse, own-profile badge
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  UserPlus,
  ArrowLeft,
  Music,
  Users,
  ChevronRight,
  UserMinus,
  Star,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useUser } from "@/hooks/useUsers";
import { useUserPosts, useToggleLike, type FrontendPost } from "@/hooks/usePosts";
import { useFriends, useRequestFriend, useSentFriendRequests, useDeleteFriend } from "@/hooks/useFriends";
import { EmptyState } from "@/components/EmptyState";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { PostCard } from "@/components/PostCard";
import { formatTimeAgo, formatDuration } from "@/lib/postUtils";
import type { User } from "@/lib/api/types";

function Profile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
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
  const [showFriends, setShowFriends] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const isOwnProfile = currentUser?.username === profileUser?.username;
  const isFriend = currentUserFriends.some((friend: User) => friend.id === profileUser?.id);
  const hasSentRequest = profileUser?.id ? hasPendingRequest(profileUser.id) : false;

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
      <div className="p-6">
        {/* Loading skeleton */}
        <div className="h-48 rounded-xl glass animate-pulse mb-6" />
        <div className="flex gap-4 mb-4">
          <div className="h-28 w-28 rounded-full glass animate-pulse" />
          <div className="flex-1 space-y-3 pt-4">
            <div className="h-6 w-40 rounded glass animate-pulse" />
            <div className="h-4 w-24 rounded glass animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="p-6">
        <EmptyState icon={UserPlus} title="User not found" />
      </div>
    );
  }

  return (
    <>
      {/* Profile Header Banner */}
      <div className="relative h-48 bg-gradient-to-br from-primary/30 via-primary/15 to-primary/5 border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,oklch(0.78_0.16_70/18%)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,oklch(0.78_0.16_70/10%)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,oklch(0.78_0.16_70/6%)_0%,transparent_40%)]" />
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

      {/* Profile Content */}
      <div className="relative px-5 pb-5 border-b border-border">
        {/* Profile Avatar */}
        <div className="relative -mt-16 mb-4 animate-page-in">
          <div className="h-28 w-28 rounded-full border-4 border-background overflow-hidden ring-2 ring-primary/30 shadow-[0_0_20px_oklch(0.78_0.16_70/20%)]">
            <Avatar className="h-full w-full">
              <AvatarImage src={profileUser.avatar_url || ""} alt={profileUser.username} />
              <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold h-full w-full">
                {profileUser.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Profile Info */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-heading font-bold">{profileUser.username}</h1>
            {isOwnProfile && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium animate-glow-pulse">
                <Star className="h-3 w-3" />
                You
              </span>
            )}
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-primary">{userPosts.length}</span>
              <span>Posts</span>
            </div>
            <button
              onClick={() => setShowFriends(!showFriends)}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
            >
              <span className="font-semibold text-primary">{profileUserFriends.length}</span>
              <span>Friends</span>
            </button>
          </div>
          {!isOwnProfile && !isGuest && (
            <div className="flex items-center gap-2 flex-wrap">
              {isFriend ? (
                <Button
                  onClick={handleUnfriend}
                  size="sm"
                  variant="outline"
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  Unfriend
                </Button>
              ) : hasSentRequest ? (
                <Button
                  onClick={handleCancelRequest}
                  size="sm"
                  variant="outline"
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  Cancel Request
                </Button>
              ) : (
                <Button
                  onClick={handleAddFriend}
                  size="sm"
                  className="glow-primary"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Friend
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Friends List or Recent Activities */}
      {showFriends ? (
        <div>
          <div className="px-5 py-3 flex items-center gap-3 border-b border-border/50 glass-strong sticky top-0 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFriends(false)}
              className="h-6 w-6 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-heading font-semibold text-sm">Friends</h3>
            </div>
          </div>
          {profileUserFriends.length === 0 ? (
            <EmptyState icon={UserPlus} title="No friends yet" />
          ) : (
            <>
              <div className="divide-y divide-border/50">
                {profileUserFriends.map((friend: User) => (
                  <div
                    key={friend.id}
                    className="p-4 hover:bg-foreground/[0.03] transition-colors cursor-pointer"
                    onClick={() => {
                      navigate(`/profile/${friend.username}`);
                      setShowFriends(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar size="sm" className="h-10 w-10">
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
                  </div>
                ))}
              </div>
              <LoadMoreButton
                hasNextPage={hasMoreFriends}
                isFetchingNextPage={isLoadingMoreFriends}
                fetchNextPage={fetchMoreFriends}
              />
            </>
          )}
        </div>
      ) : (
        <div>
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-primary" />
              <h3 className="text-lg font-heading font-semibold">Recent Activities</h3>
            </div>
          </div>
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
                    onPostClick={(pid) => navigate(`/post/${pid}`)}
                    onLike={handleLikePost}
                    onPlayPause={() => setPlayingAudioId(playingAudioId === post.id ? null : post.id)}
                    formatTimeAgo={formatTimeAgo}
                    formatDuration={formatDuration}
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
        </div>
      )}
    </>
  );
}

export default Profile;
