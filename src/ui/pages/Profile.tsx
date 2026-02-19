import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  UserPlus,
  ArrowLeft,
  Music,
  Heart,
  MessageSquare,
  Share2,
  Users,
  ChevronRight,
  UserMinus,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useUser } from "@/hooks/useUsers";
import { useUserPosts, type FrontendPost } from "@/hooks/usePosts";
import { useFriends, useRequestFriend, useSentFriendRequests, useDeleteFriend } from "@/hooks/useFriends";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { LoadMoreButton } from "@/components/LoadMoreButton";
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
  const { hasPendingRequest } = useSentFriendRequests();
  const [showFriends, setShowFriends] = useState(false);
  
  const isOwnProfile = currentUser?.username === profileUser?.username;
  const isFriend = currentUserFriends.some((friend: User) => friend.id === profileUser?.id);
  const hasSentRequest = profileUser?.id ? hasPendingRequest(profileUser.id) : false;
  
  // Status functionality removed - not available in Convex User type


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

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingState message="Loading profile..." />
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
      <div className="relative h-48 bg-gradient-to-br from-primary/25 via-primary/10 to-background border-b border-border overflow-hidden">
        {/* Atmospheric glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,oklch(0.78_0.16_70/15%)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,oklch(0.78_0.16_70/8%)_0%,transparent_50%)]" />
        {/* Back Button - positioned absolutely */}
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
        <div className="relative -mt-16 mb-4">
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
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground">{userPosts.length}</span>
              <span>Posts</span>
            </div>
            <button
              onClick={() => setShowFriends(!showFriends)}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
            >
              <span className="font-semibold text-foreground">{profileUserFriends.length}</span>
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
          <div className="px-5 py-3 flex items-center gap-3 border-b border-border glass">
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
              <div className="divide-y divide-border">
                {profileUserFriends.map((friend: User) => (
                  <div
                    key={friend.id}
                    className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
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
                        {/* Status not available in Convex User type */}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{friend.username}</div>
                        {/* Status not available in Convex User type */}
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
        <div className="p-5">
          <h3 className="text-lg font-heading font-semibold mb-4">Recent Activities</h3>
          {userPosts.length === 0 ? (
            <EmptyState icon={Music} title="No recent activities" />
          ) : (
            <div className="divide-y divide-border">
              {userPosts.map((post: FrontendPost) => (
                <div
                  key={post.id}
                  className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/post/${post.id}`)}
                >
                  <div className="flex gap-3">
                    <Avatar size="sm" className="h-10 w-10 shrink-0">
                      <AvatarImage src={post.author.avatar || ""} alt={post.author.username} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {post.author.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{post.author.username}</span>
                        <span className="text-xs text-muted-foreground">
                          • {formatTimeAgo(post.timestamp)}
                        </span>
                      </div>
                      {post.content && (
                        <p className="text-sm mb-2 whitespace-pre-wrap">{post.content}</p>
                      )}
                      {post.audioFile && (
                        <div className="mb-2 p-2 bg-muted rounded flex items-center gap-2">
                          <Music className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium truncate">
                            {post.audioFile.title}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatDuration(post.audioFile.duration)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-6 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          <span>{post.likes}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>{post.comments}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Share2 className="h-4 w-4" />
                          <span>{post.shares}</span>
                        </div>
                      </div>
                    </div>
                  </div>
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
