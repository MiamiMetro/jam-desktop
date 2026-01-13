import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback, AvatarBadge } from "@/components/ui/avatar";
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
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useUser } from "@/hooks/useUsers";
import { useUserPosts, type FrontendPost } from "@/hooks/usePosts";
import { useFriends, useRequestFriend } from "@/hooks/useFriends";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { formatTimeAgo, formatDuration } from "@/lib/postUtils";
import type { User } from "@/lib/api/types";

function Profile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser, isGuest } = useAuthStore();
  const { data: profileUser, isLoading } = useUser(username || "");
  const { data: userPosts = [] } = useUserPosts(profileUser?.username || "");
  const { data: friends = [], fetchNextPage: fetchMoreFriends, hasNextPage: hasMoreFriends, isFetchingNextPage: isLoadingMoreFriends } = useFriends();
  const requestFriendMutation = useRequestFriend();
  const [showFriends, setShowFriends] = useState(false);
  
  const isOwnProfile = currentUser?.username === profileUser?.username;
  const isFriend = friends.some((friend: User) => friend.id === profileUser?.id);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Online":
      case "In Game":
      case "In Queue":
        return "bg-green-500";
      case "Away":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };


  const handleAddFriend = async () => {
    if (isGuest || !profileUser?.id) return;
    try {
      await requestFriendMutation.mutateAsync(profileUser.id);
    } catch (error) {
      console.error('Error sending friend request:', error);
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

      {/* Profile Content */}
      <div className="relative px-4 pb-4 border-b border-border">
        {/* Profile Avatar */}
        <div className="relative -mt-16 mb-4">
          <div className="h-24 w-24 rounded-full border-4 border-background overflow-hidden">
            <Avatar className="h-full w-full">
              <AvatarImage src={profileUser.avatar || ""} alt={profileUser.username} />
              <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold h-full w-full">
                {profileUser.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Profile Info */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold">{profileUser.username}</h1>
          </div>
          {profileUser.statusMessage && (
            <p className="text-muted-foreground mb-3">{profileUser.statusMessage}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <span className="font-semibold">{userPosts.length}</span>
              <span>Posts</span>
            </div>
            <button
              onClick={() => setShowFriends(!showFriends)}
              className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
            >
              <span className="font-semibold">{friends.length}</span>
              <span>Friends</span>
            </button>
          </div>
          {!isOwnProfile && !isGuest && !isFriend && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={handleAddFriend}
                size="sm"
                variant="outline"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Friend
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Friends List or Recent Activities */}
      {showFriends ? (
        <div>
          <div className="px-4 py-3 flex items-center gap-3 border-b border-border bg-muted/30">
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
              <h3 className="font-semibold text-sm">Friends</h3>
            </div>
          </div>
          {friends.length === 0 ? (
            <EmptyState icon={UserPlus} title="No friends yet" />
          ) : (
            <>
              <div className="divide-y divide-border">
                {friends.map((friend: User) => (
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
                        <AvatarImage src={friend.avatar || ""} alt={friend.username} />
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                          {friend.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                        <AvatarBadge className={`${getStatusColor(friend.status || 'Offline')} h-3 w-3 border-2 border-background`} />
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{friend.username}</div>
                        <div className="text-xs text-muted-foreground">{friend.status}</div>
                        {friend.statusMessage && (
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {friend.statusMessage}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
              {hasMoreFriends && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => fetchMoreFriends()}
                    disabled={isLoadingMoreFriends}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isLoadingMoreFriends ? 'Loading more...' : 'Load more friends'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
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
                    <Avatar size="sm" className="h-10 w-10 flex-shrink-0">
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
                          <Music className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
        </div>
      )}
    </>
  );
}

export default Profile;
