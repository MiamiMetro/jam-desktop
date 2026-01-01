import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft,
  Music,
  Users,
  Send,
  Hash,
  Play,
  Pause,
  LogOut,
  Settings,
  RefreshCw,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useJam, useUpdateRoomActivity } from "@/hooks/useJams";
import { useAllUsers } from "@/hooks/useUsers";
import { useHLSPlayer } from "@/hooks/useHLSPlayer";

interface JamRoomProps {
  roomId?: string;
}

function JamRoom({ roomId }: JamRoomProps = {}) {
  const paramsId = useParams<{ id: string }>()?.id;
  const roomIdToUse = roomId ?? paramsId;
  const navigate = useNavigate();
  const { user, isGuest } = useAuthStore();
  const { data: room, isLoading } = useJam(roomIdToUse || "");
  // Only fetch users when room is loaded (for participants and message users)
  const { data: allUsers = [] } = useAllUsers(undefined, !!room && !isLoading);
  const updateActivityMutation = useUpdateRoomActivity();
  const [message, setMessage] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  
  // HLS stream player
  const hlsPlayer = useHLSPlayer(room?.streamUrl);
  const [messages, setMessages] = useState<Array<{
    id: string;
    userId: string;
    username: string;
    avatar?: string;
    content: string;
    timestamp: Date;
  }>>([]);
  
  // Track activity when user enters room
  useEffect(() => {
    if (roomIdToUse && !isGuest) {
      // Update activity on mount
      updateActivityMutation.mutate(roomIdToUse);
      
      // Update activity every 5 minutes while in room
      const interval = setInterval(() => {
        updateActivityMutation.mutate(roomIdToUse);
      }, 5 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [roomIdToUse, isGuest, updateActivityMutation]);
  
  
  // Mock participants (using first few users as participants) - memoized
  const participants = useMemo(
    () => allUsers.slice(0, room?.participants || 3),
    [allUsers, room?.participants]
  );
  
  // Check if current user is the host
  const isHost = !isGuest && user && room && room.hostId === user.id;

  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isGuest || !roomIdToUse) return; // Guests can't send messages
    
    const newMessage = {
      id: Date.now().toString(),
      userId: user?.id || "",
      username: user?.username || "Unknown",
      avatar: user?.avatar,
      content: message.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    setMessage("");
    
    // Update room activity when message is sent
    updateActivityMutation.mutate(roomIdToUse);
  }, [message, isGuest, roomIdToUse, user, updateActivityMutation]);
  
  const handleLeaveRoom = useCallback(() => {
    // Clear persisted room ID
    localStorage.removeItem("currentJamRoomId");
    navigate("/jams");
  }, [navigate]);

  const handleJoinClient = useCallback(async () => {
    try {
      setClientError(null);
      if (!window.electron) {
        setClientError("Electron API not available");
        return;
      }

      const result = await window.electron.spawnClient(['--room=abc123', '--token=jwt']);
      if (!result.success) {
        setClientError(result.error || "Failed to launch client");
      }
    } catch (error) {
      setClientError(error instanceof Error ? error.message : "Unknown error occurred");
    }
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Loading room...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Room not found</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/jams")}
            className="mt-4"
          >
            Back to Jams
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Main Room Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Room Header */}
        <div className="bg-gradient-to-r from-primary/20 to-primary/10 border-b border-border p-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={() => navigate(-1)}
              title="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <h1 className="text-xl font-bold truncate">{room.name}</h1>
                {room.isPrivate && (
                  <span className="text-xs text-muted-foreground">🔒</span>
                )}
                {isHost && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-medium">
                    Your Room
                  </span>
                )}
              </div>
              {room.description && (
                <p className="text-sm text-muted-foreground mb-2">{room.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {room.genre && (
                  <div className="flex items-center gap-1">
                    <Music className="h-3 w-3" />
                    <span>{room.genre}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{room.participants}/{room.maxParticipants} participants</span>
                </div>
                <div>
                  Host: {room.hostName}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant={clientError ? "destructive" : "default"}
                  size="sm"
                  onClick={handleJoinClient}
                  className="flex items-center gap-2"
                  title={clientError ? "Client not available" : "Join with client"}
                >
                  Jam
                </Button>
                {isHost && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/jams")}
                    className="flex items-center gap-2"
                    title="Manage room settings"
                  >
                    <Settings className="h-4 w-4" />
                    Manage
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLeaveRoom}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Leave
                </Button>
              </div>
              <div className="h-4 text-xs text-destructive">
                {clientError && clientError}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex gap-4 p-4 overflow-hidden min-h-0">
          {/* Audio Track Section */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="mb-4 flex-shrink-0">
              <h3 className="text-sm font-semibold mb-3">Live Audio Stream</h3>
              <div className="p-4 bg-muted rounded-lg">
                {room.streamUrl ? (
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-12 w-12 rounded-full"
                      onClick={() => hlsPlayer.togglePlayPause()}
                      disabled={hlsPlayer.isLoading}
                    >
                      {hlsPlayer.isLoading ? (
                        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : hlsPlayer.isPlaying ? (
                        <Pause className="h-6 w-6" />
                      ) : (
                        <Play className="h-6 w-6" />
                      )}
                    </Button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Music className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium truncate">
                          Live Jam Session
                        </span>
                        {hlsPlayer.isPlaying && (
                          <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                        )}
                      </div>
                      {hlsPlayer.error ? (
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-red-500 flex-1">{hlsPlayer.error}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              hlsPlayer.retry();
                              setTimeout(() => {
                                hlsPlayer.play();
                              }, 200);
                            }}
                            className="h-7 text-xs"
                            disabled={hlsPlayer.isLoading}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted-foreground/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all"
                              style={{ width: hlsPlayer.isPlaying ? "100%" : "0%" }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {hlsPlayer.isPlaying ? "LIVE" : hlsPlayer.isReady ? "PAUSED" : "OFFLINE"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">No stream available</p>
                    <p className="text-xs mt-1">Stream will start when the host begins jamming</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Participants Section */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <h3 className="text-sm font-semibold mb-3 flex-shrink-0">Participants</h3>
              <div className="space-y-2 overflow-y-auto flex-1">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar size="sm" className="h-8 w-8">
                      <AvatarImage src={participant.avatar || ""} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {participant.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{participant.username}</div>
                      <div className="text-xs text-muted-foreground">{participant.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Sidebar */}
          <div className="w-80 border-l border-border flex flex-col bg-background min-h-0 overflow-hidden">
            <div className="p-3 border-b border-border flex-shrink-0">
              <h3 className="text-sm font-semibold">Chat</h3>
              {isGuest && (
                <p className="text-xs text-muted-foreground mt-1">Listening mode - chat disabled</p>
              )}
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-xs">No messages yet</p>
                  {!isGuest && (
                    <p className="text-xs mt-1">Start the conversation!</p>
                  )}
                </div>
              ) : (
                messages.map((msg) => {
                  const messageUser = allUsers.find(u => u.id === msg.userId);
                  return (
                    <div key={msg.id} className="flex gap-2">
                      <Avatar size="sm" className="h-6 w-6 flex-shrink-0">
                        <AvatarImage src={msg.avatar || messageUser?.avatar || ""} />
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                          {msg.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold">{msg.username}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Input */}
            {!isGuest && (
              <div className="p-3 border-t border-border flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!message.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(JamRoom);

