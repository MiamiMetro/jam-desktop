import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage, AvatarBadge } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  UserPlus, 
  Search, 
  Settings, 
  MessageCircle, 
  MoreVertical,
  Sun,
  Moon,
  Monitor,
  Plus,
  Music,
  Users,
  Hash,
  Heart,
  Share2,
  Upload,
  Play,
  Pause
} from "lucide-react";

// Mock friend data
const mockFriends = [
  { id: 1, username: "XeFOs", status: "Online", statusMessage: "Olala.", avatar: null },
  { id: 2, username: "Akuma chun", status: "In Game", statusMessage: "Jamming", avatar: null },
  { id: 3, username: "AnataBakka", status: "In Queue", statusMessage: "Waiting for jam", avatar: null },
  { id: 4, username: "TDTN Kira", status: "In Game", statusMessage: "Playing", avatar: null },
  { id: 5, username: "zebuto", status: "In Game", statusMessage: "Jamming", avatar: null },
  { id: 6, username: "DesertStark", status: "Away", statusMessage: "Mobile", avatar: null },
  { id: 7, username: "LEBOVIM", status: "Away", statusMessage: "Mobile", avatar: null },
  { id: 8, username: "MadsNado", status: "Away", statusMessage: "Mobile", avatar: null },
  { id: 9, username: "ThatGuyDan", status: "Away", statusMessage: "Mobile", avatar: null },
  { id: 10, username: "OhmyDOG", status: "Away", statusMessage: "Away", avatar: null },
];

const onlineFriends = mockFriends.filter(f => f.status === "Online" || f.status === "In Game" || f.status === "In Queue");
const totalFriends = mockFriends.length;

// Room type
type Room = {
  id: string;
  name: string;
  description?: string;
  genre?: string;
  participants: number;
  maxParticipants: number;
  isPrivate: boolean;
  hostAvatar?: string;
  hostName: string;
};

// Post type
type Post = {
  id: string;
  author: {
    username: string;
    avatar?: string;
    isFriend: boolean;
  };
  content?: string;
  audioFile?: {
    url: string;
    title: string;
    duration: number; // in seconds
  };
  timestamp: Date;
  likes: number;
  isLiked: boolean;
  shares: number;
  comments: number;
  feedType: "friends" | "global";
};

// Mock rooms data
const initialRooms: Room[] = [
  {
    id: "1",
    name: "Chill Vibes",
    description: "Relaxing beats for the evening",
    genre: "Lo-Fi",
    participants: 3,
    maxParticipants: 8,
    isPrivate: false,
    hostName: "Tylobic",
  },
  {
    id: "2",
    name: "Rock Jam Session",
    description: "Let's rock out!",
    genre: "Rock",
    participants: 5,
    maxParticipants: 6,
    isPrivate: false,
    hostName: "XeFOs",
  },
  {
    id: "3",
    name: "Electronic Dreams",
    description: "EDM and electronic music",
    genre: "Electronic",
    participants: 2,
    maxParticipants: 10,
    isPrivate: false,
    hostName: "Akuma chun",
  },
  {
    id: "4",
    name: "Jazz Lounge",
    description: "Smooth jazz and improvisation",
    genre: "Jazz",
    participants: 4,
    maxParticipants: 8,
    isPrivate: false,
    hostName: "zebuto",
  },
  {
    id: "5",
    name: "Hip Hop Cypher",
    description: "Freestyle and beats",
    genre: "Hip Hop",
    participants: 6,
    maxParticipants: 12,
    isPrivate: false,
    hostName: "TDTN Kira",
  },
  {
    id: "6",
    name: "Acoustic Sessions",
    description: "Intimate acoustic performances",
    genre: "Acoustic",
    participants: 2,
    maxParticipants: 6,
    isPrivate: true,
    hostName: "AnataBakka",
  },
  {
    id: "7",
    name: "Metal Mayhem",
    description: "Heavy riffs and powerful drums",
    genre: "Metal",
    participants: 7,
    maxParticipants: 10,
    isPrivate: false,
    hostName: "DesertStark",
  },
  {
    id: "8",
    name: "Indie Vibes",
    description: "Alternative and indie rock",
    genre: "Indie",
    participants: 3,
    maxParticipants: 8,
    isPrivate: false,
    hostName: "LEBOVIM",
  },
  {
    id: "9",
    name: "Classical Harmony",
    description: "Orchestral and classical compositions",
    genre: "Classical",
    participants: 1,
    maxParticipants: 5,
    isPrivate: false,
    hostName: "MadsNado",
  },
  {
    id: "10",
    name: "R&B Soul",
    description: "Smooth R&B and soulful melodies",
    genre: "R&B",
    participants: 4,
    maxParticipants: 8,
    isPrivate: false,
    hostName: "ThatGuyDan",
  },
  {
    id: "11",
    name: "Reggae Roots",
    description: "Island vibes and reggae beats",
    genre: "Reggae",
    participants: 5,
    maxParticipants: 10,
    isPrivate: false,
    hostName: "OhmyDOG",
  },
  {
    id: "12",
    name: "Country Roads",
    description: "Country and folk music",
    genre: "Country",
    participants: 2,
    maxParticipants: 6,
    isPrivate: false,
    hostName: "XeFOs",
  },
  {
    id: "13",
    name: "Techno Underground",
    description: "Deep techno and underground sounds",
    genre: "Techno",
    participants: 8,
    maxParticipants: 15,
    isPrivate: false,
    hostName: "Akuma chun",
  },
  {
    id: "14",
    name: "Blues Brothers",
    description: "Classic blues and soul",
    genre: "Blues",
    participants: 3,
    maxParticipants: 7,
    isPrivate: false,
    hostName: "Tylobic",
  },
  {
    id: "15",
    name: "Pop Hits",
    description: "Latest pop hits and covers",
    genre: "Pop",
    participants: 6,
    maxParticipants: 12,
    isPrivate: false,
    hostName: "zebuto",
  },
];

// Mock posts data
const initialPosts: Post[] = [
  {
    id: "1",
    author: {
      username: "XeFOs",
      isFriend: true,
    },
    content: "Just finished this new track! What do you think?",
    audioFile: {
      url: "#",
      title: "New Track - XeFOs",
      duration: 180,
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
    likes: 24,
    isLiked: false,
    shares: 5,
    comments: 8,
    feedType: "friends",
  },
  {
    id: "2",
    author: {
      username: "Akuma chun",
      isFriend: true,
    },
    content: "Late night jam session vibes 🎵",
    audioFile: {
      url: "#",
      title: "Late Night Jam",
      duration: 240,
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
    likes: 18,
    isLiked: true,
    shares: 3,
    comments: 4,
    feedType: "friends",
  },
  {
    id: "3",
    author: {
      username: "MusicProducer123",
      isFriend: false,
    },
    content: "Check out this experimental beat I've been working on!",
    audioFile: {
      url: "#",
      title: "Experimental Beat",
      duration: 195,
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    likes: 156,
    isLiked: false,
    shares: 42,
    comments: 23,
    feedType: "global",
  },
  {
    id: "4",
    author: {
      username: "TDTN Kira",
      isFriend: true,
    },
    content: "New collaboration with @zebuto dropping soon!",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
    likes: 32,
    isLiked: false,
    shares: 12,
    comments: 15,
    feedType: "friends",
  },
  {
    id: "5",
    author: {
      username: "GlobalBeats",
      isFriend: false,
    },
    content: "Weekly mix is live! Featuring the best tracks from this week.",
    audioFile: {
      url: "#",
      title: "Weekly Mix - Week 12",
      duration: 3600,
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    likes: 892,
    isLiked: true,
    shares: 234,
    comments: 89,
    feedType: "global",
  },
];

function ExamplePage() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    // Check localStorage or default to system
    const stored = localStorage.getItem("theme") as "light" | "dark" | "system" | null;
    return stored || "system";
  });

  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: "",
    description: "",
    genre: "",
    maxParticipants: 8,
    isPrivate: false,
  });
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [feedType, setFeedType] = useState<"rooms" | "forYou" | "friends">("forYou");
  const [newPost, setNewPost] = useState({
    content: "",
    audioFile: null as File | null,
  });
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      if (theme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        root.classList.toggle("dark", systemTheme === "dark");
      } else {
        root.classList.toggle("dark", theme === "dark");
      }
    };

    applyTheme();

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const getCurrentTheme = () => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme;
  };

  const toggleTheme = () => {
    const currentTheme = getCurrentTheme();
    handleThemeChange(currentTheme === "dark" ? "light" : "dark");
  };

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

  const handleCreateRoom = () => {
    if (!newRoom.name.trim()) return;

    const room: Room = {
      id: Date.now().toString(),
      name: newRoom.name,
      description: newRoom.description || undefined,
      genre: newRoom.genre || undefined,
      participants: 1,
      maxParticipants: newRoom.maxParticipants,
      isPrivate: newRoom.isPrivate,
      hostName: "Tylobic",
    };

    setRooms([room, ...rooms]);
    setNewRoom({
      name: "",
      description: "",
      genre: "",
      maxParticipants: 8,
      isPrivate: false,
    });
    setIsCreateRoomOpen(false);
  };

  const handleCreatePost = () => {
    if (!newPost.content.trim() && !newPost.audioFile) return;

    const post: Post = {
      id: Date.now().toString(),
      author: {
        username: "Tylobic",
        isFriend: true,
      },
      content: newPost.content || undefined,
      audioFile: newPost.audioFile ? {
        url: URL.createObjectURL(newPost.audioFile),
        title: newPost.audioFile.name,
        duration: 0, // Would need to calculate from actual file
      } : undefined,
      timestamp: new Date(),
      likes: 0,
      isLiked: false,
      shares: 0,
      comments: 0,
      feedType: "friends",
    };

    setPosts([post, ...posts]);
    setNewPost({
      content: "",
      audioFile: null,
    });
  };

  const handleLikePost = (postId: string) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
        : post
    ));
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date().getTime();
    const seconds = Math.floor((now - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredPosts = feedType === "forYou" 
    ? posts 
    : feedType === "friends"
    ? posts.filter(post => post.feedType === "friends")
    : [];

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Main Section - Feed */}
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        {/* Feed Header */}
        <div className="border-b border-border px-4 py-3 bg-background sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setFeedType("rooms")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  feedType === "rooms"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Music className="h-4 w-4" />
                Jams
              </button>
              <button
                onClick={() => setFeedType("forYou")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  feedType === "forYou"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Feed
              </button>
              <button
                onClick={() => setFeedType("friends")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  feedType === "friends"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Following
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

        {/* Feed Content */}
        <div className="flex-1 overflow-y-auto">
          {feedType === "rooms" ? (
            /* Rooms View */
            <div className="p-4">
              {/* Jams Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Jams</h2>
                <AlertDialog open={isCreateRoomOpen} onOpenChange={setIsCreateRoomOpen}>
                  <AlertDialogTrigger render={
                    <Button variant="default" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Jam
                    </Button>
                  } />
                  <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Create New Jam</AlertDialogTitle>
                      <AlertDialogDescription>
                        Start a new jamming session. Invite friends to join and make music together.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="room-name">Room Name</Label>
                        <Input
                          id="room-name"
                          placeholder="e.g., Chill Vibes"
                          value={newRoom.name}
                          onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="room-description">Description (Optional)</Label>
                        <Textarea
                          id="room-description"
                          placeholder="What's this room about?"
                          value={newRoom.description}
                          onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="room-genre">Genre (Optional)</Label>
                        <Input
                          id="room-genre"
                          placeholder="e.g., Lo-Fi, Rock, Electronic"
                          value={newRoom.genre}
                          onChange={(e) => setNewRoom({ ...newRoom, genre: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="room-max">Max Participants</Label>
                        <Input
                          id="room-max"
                          type="number"
                          min="2"
                          max="20"
                          value={newRoom.maxParticipants}
                          onChange={(e) => setNewRoom({ ...newRoom, maxParticipants: parseInt(e.target.value) || 8 })}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="room-private"
                          checked={newRoom.isPrivate}
                          onChange={(e) => setNewRoom({ ...newRoom, isPrivate: e.target.checked })}
                          className="rounded border-input"
                        />
                        <Label htmlFor="room-private" className="cursor-pointer">
                          Private Room
                        </Label>
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCreateRoom} disabled={!newRoom.name.trim()}>
                        Create Room
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Jams Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.length === 0 ? (
                  <div className="col-span-full p-8 text-center text-muted-foreground">
                    <Music className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No jams yet</p>
                    <p className="text-xs mt-1">Create a jam to start jamming!</p>
                  </div>
                ) : (
                  rooms.map((room) => (
                    <div
                      key={room.id}
                      className="p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <h3 className="text-sm font-semibold truncate">
                              {room.name}
                            </h3>
                            {room.isPrivate && (
                              <span className="text-xs text-muted-foreground">🔒</span>
                            )}
                          </div>
                          {room.description && (
                            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                              {room.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                            {room.genre && (
                              <div className="flex items-center gap-1">
                                <Music className="h-3 w-3" />
                                <span>{room.genre}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>
                                {room.participants}/{room.maxParticipants}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Host: {room.hostName}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Compose Post Area */}
              <div className="border-b border-border p-4 bg-background">
            <div className="flex gap-3">
              <Avatar size="default" className="flex-shrink-0">
                <AvatarImage src="" alt="You" />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  TY
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Textarea
                  placeholder="What's on your mind? Share a message or upload audio..."
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  className="min-h-[100px] resize-none border-border"
                  rows={4}
                />
                {newPost.audioFile && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Music className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm flex-1 truncate">{newPost.audioFile.name}</span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="h-6 w-6"
                      onClick={() => setNewPost({ ...newPost, audioFile: null })}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label htmlFor="audio-upload" className="cursor-pointer">
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Audio
                      </Button>
                      <input
                        id="audio-upload"
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setNewPost({ ...newPost, audioFile: file });
                          }
                        }}
                      />
                    </label>
                  </div>
                  <Button
                    onClick={handleCreatePost}
                    disabled={!newPost.content.trim() && !newPost.audioFile}
                    size="sm"
                  >
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Posts Feed */}
          <div className="divide-y divide-border">
            {filteredPosts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No posts yet</p>
                <p className="text-xs mt-1">Be the first to share something!</p>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <div key={post.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex gap-3">
                    <Avatar size="default" className="flex-shrink-0">
                      <AvatarImage src={post.author.avatar || ""} alt={post.author.username} />
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {post.author.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{post.author.username}</span>
                        {post.author.isFriend && (
                          <span className="text-xs text-muted-foreground">• Friend</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          • {formatTimeAgo(post.timestamp)}
                        </span>
                      </div>
                      {post.content && (
                        <p className="text-sm mb-3 whitespace-pre-wrap">{post.content}</p>
                      )}
                      {post.audioFile && (
                        <div className="mb-3 p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-full"
                              onClick={() => {
                                setPlayingAudioId(playingAudioId === post.id ? null : post.id);
                              }}
                            >
                              {playingAudioId === post.id ? (
                                <Pause className="h-5 w-5" />
                              ) : (
                                <Play className="h-5 w-5" />
                              )}
                            </Button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Music className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm font-medium truncate">
                                  {post.audioFile.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary transition-all"
                                    style={{ width: playingAudioId === post.id ? "45%" : "0%" }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatDuration(post.audioFile.duration)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-6 mt-3">
                        <button
                          onClick={() => handleLikePost(post.id)}
                          className={`flex items-center gap-2 text-sm transition-colors ${
                            post.isLiked
                              ? "text-red-500 hover:text-red-600"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Heart className={`h-4 w-4 ${post.isLiked ? "fill-current" : ""}`} />
                          <span>{post.likes}</span>
                        </button>
                        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                          <MessageCircle className="h-4 w-4" />
                          <span>{post.comments}</span>
                        </button>
                        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                          <Share2 className="h-4 w-4" />
                          <span>{post.shares}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
            </>
          )}
        </div>
      </div>

      {/* Right Sidebar - Profile & Friends */}
      <div className="w-64 bg-sidebar border-l border-sidebar-border flex flex-col">
        {/* Profile Section */}
        <div className="p-3 border-b border-sidebar-border bg-sidebar">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar size="lg" className="relative ring-2 ring-primary">
                <AvatarImage src="" alt="Profile" />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  TY
                </AvatarFallback>
                <AvatarBadge className={getStatusColor("Online")} />
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate text-sidebar-foreground">Tylobic</div>
              <div className="text-xs text-muted-foreground">Online</div>
              <div className="text-xs text-muted-foreground">Level 40</div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button variant="ghost" size="icon-xs" className="h-6 w-6">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              } />
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Social Section */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Social Header */}
          <div className="px-3 py-2 border-b border-sidebar-border">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground">
                Social
              </h3>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-xs" className="h-6 w-6" title="Add Friend">
                  <UserPlus className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon-xs" className="h-6 w-6" title="Search">
                  <Search className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon-xs" className="h-6 w-6" title="Settings">
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Friends List */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-3 py-2">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                GENERAL ({onlineFriends.length}/{totalFriends})
              </div>
              <div className="space-y-1">
                {mockFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/50 cursor-pointer group transition-colors"
                  >
                    <Avatar size="sm" className="relative">
                      <AvatarImage src={friend.avatar || ""} alt={friend.username} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {friend.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                      <AvatarBadge className={getStatusColor(friend.status)} />
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{friend.username}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {friend.statusMessage || friend.status}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MessageCircle className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-sidebar-border p-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-xs" className="h-6 w-6">
                  <MessageCircle className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">v1.0.0</div>
              <DropdownMenu>
                <DropdownMenuTrigger render={
                  <Button variant="ghost" size="icon-xs" className="h-6 w-6">
                    <Settings className="h-3 w-3" />
                  </Button>
                } />
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Appearance</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => handleThemeChange("light")}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Light
                    </div>
                    {theme === "light" && <span className="text-xs">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleThemeChange("dark")}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Dark
                    </div>
                    {theme === "dark" && <span className="text-xs">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleThemeChange("system")}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      System
                    </div>
                    {theme === "system" && <span className="text-xs">✓</span>}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExamplePage;
