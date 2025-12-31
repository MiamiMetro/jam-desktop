import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback, AvatarBadge } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  UserPlus,
  MessageCircle,
  ArrowLeft,
  Music,
  Heart,
  MessageSquare,
  Share2,
  Users,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useUser, useAllUsers } from "@/hooks/useUsers";
import { usePosts } from "@/hooks/usePosts";
import { formatDuration } from "@/lib/postUtils";

function Profile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser, isGuest } = useAuthStore();
  const { data: profileUser, isLoading } = useUser(id || "");
  const { data: allPosts = [] } = usePosts();
  const { data: allUsers = [] } = useAllUsers();
  const [showFriends, setShowFriends] = useState(false);
  
  const isOwnProfile = currentUser?.id === id;
  
  // Filter posts by this user
  const userPosts = allPosts.filter(post => post.author.username === profileUser?.username);
  
  // Get friends (using conversations as proxy - people they've messaged with)
  // In a real app, this would be a proper friends list
  const friends = allUsers.filter(u => {
    if (u.id === id) return false; // Don't include self
    // Mock: show first 5 users as "friends" for demo
    return allUsers.indexOf(u) < 5;
  });
  
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

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return "now";
  };

  const handleAddFriend = () => {
    if (isGuest) return;
    // TODO: Implement add friend functionality
    console.log("Add friend:", id);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Banner */}
      <div className="relative h-32 bg-gradient-to-r from-primary/30 via-primary/20 to-primary/10">
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
      <div className="flex-1 overflow-y-auto">
        {/* Avatar and Basic Info */}
        <div className="relative px-4 pb-4 border-b border-border">
          {/* Avatar positioned over banner */}
          <div className="relative -mt-12 mb-4">
            <Avatar size="lg" className="h-20 w-20 border-4 border-background">
              <AvatarImage src={profileUser.avatar || ""} alt={profileUser.username} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {profileUser.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
              {profileUser.status && (
                <AvatarBadge className={`${getStatusColor(profileUser.status)} h-4 w-4 border-2 border-background`} />
              )}
            </Avatar>
          </div>

          {/* User Info with Avatar on Left */}
          <div className="mb-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-3">
                <Avatar size="default" className="h-12 w-12">
                  <AvatarImage src={profileUser.avatar || ""} alt={profileUser.username} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {profileUser.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                  {profileUser.status && (
                    <AvatarBadge className={`${getStatusColor(profileUser.status)} h-3 w-3 border-2 border-background`} />
                  )}
                </Avatar>
                <h1 className="text-2xl font-bold">{profileUser.username}</h1>
              </div>
              {!isOwnProfile && !isGuest && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleAddFriend}
                    size="sm"
                    variant="outline"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Friend
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      // Navigate to DM or open message
                      navigate(`/profile/${id}`);
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </div>
              )}
            </div>
            {profileUser.statusMessage && (
              <div className="text-sm text-muted-foreground mb-2">
                {profileUser.statusMessage}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-1">
              <span className="font-semibold">{userPosts.length}</span>
              <span className="text-muted-foreground">Posts</span>
            </div>
            <button
              onClick={() => setShowFriends(!showFriends)}
              className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
            >
              <span className="font-semibold">{friends.length}</span>
              <span className="text-muted-foreground">Friends</span>
            </button>
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
              <div className="p-8 text-center text-muted-foreground">
                <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No friends yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => {
                      navigate(`/profile/${friend.id}`);
                      setShowFriends(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar size="sm" className="h-10 w-10">
                        <AvatarImage src={friend.avatar || ""} alt={friend.username} />
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                          {friend.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                        <AvatarBadge className={`${getStatusColor(friend.status)} h-3 w-3 border-2 border-background`} />
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
            )}
          </div>
        ) : (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
            {userPosts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No recent activities</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {userPosts.map((post) => (
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
      </div>
    </div>
  );
}

export default Profile;
