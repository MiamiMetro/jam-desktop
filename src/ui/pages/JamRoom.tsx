// JamRoom.tsx — Live jam room with performer/listener split, chat, audio stream
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
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
  AlertTriangle,
  Guitar,
  Mic,
  Piano,
  Drum,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useJam, useUpdateRoomActivity } from "@/hooks/useJams";
import type { RoomParticipant } from "@/hooks/useJams";
import { useAllUsers } from "@/hooks/useUsers";
import { useHLSPlayer } from "@/hooks/useHLSPlayer";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import type { User } from "@/lib/api/types";

const instrumentIcons: Record<string, React.ReactNode> = {
  Guitar: <Guitar className="h-3.5 w-3.5" />,
  Vocals: <Mic className="h-3.5 w-3.5" />,
  Keyboard: <Piano className="h-3.5 w-3.5" />,
  Drums: <Drum className="h-3.5 w-3.5" />,
};

interface JamRoomProps {
  roomId?: string;
}

function JamRoom({ roomId }: JamRoomProps = {}) {
  const paramsId = useParams<{ id: string }>()?.id;
  const roomIdToUse = roomId ?? paramsId;
  const navigate = useNavigate();
  const { user, isGuest } = useAuthStore();
  const { data: room, isLoading } = useJam(roomIdToUse || "");
  const { data: allUsers = [] } = useAllUsers(undefined, !!room && !isLoading);
  const updateActivityMutation = useUpdateRoomActivity();
  const [message, setMessage] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [isPerforming, setIsPerforming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
      updateActivityMutation.mutate(roomIdToUse);
      const interval = setInterval(() => {
        updateActivityMutation.mutate(roomIdToUse);
      }, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [roomIdToUse, isGuest, updateActivityMutation]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Participants — use mock data if available, else fallback to allUsers slice
  const participants: RoomParticipant[] = useMemo(() => {
    if (room?.mockParticipants) return room.mockParticipants;
    return allUsers.slice(0, room?.participants || 3).map((u: User) => ({
      userId: u.id,
      username: u.username,
      avatar: u.avatar_url,
      role: "listener" as const,
    }));
  }, [room?.mockParticipants, allUsers, room?.participants]);

  const performers = participants.filter(p => p.role === "performer");
  const listeners = participants.filter(p => p.role === "listener");
  const isHost = !isGuest && user && room && room.hostId === user.id;

  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isGuest || !roomIdToUse) return;

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      userId: user?.id || "",
      username: user?.username || "Unknown",
      avatar: user?.avatar_url,
      content: message.trim(),
      timestamp: new Date(),
    }]);
    setMessage("");
    updateActivityMutation.mutate(roomIdToUse);
  }, [message, isGuest, roomIdToUse, user, updateActivityMutation]);

  const handleLeaveRoom = useCallback(() => {
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
      if (result.success) {
        setIsPerforming(true);
      } else {
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
    return <div className="p-6"><LoadingState message="Loading room..." /></div>;
  }

  if (!room) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Music}
          title="Room not found"
          action={<Button variant="outline" size="sm" onClick={() => navigate("/jams")}>Back to Jams</Button>}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-background">
      {/* Main Room Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Room Header */}
        <div className="border-b border-border px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-primary/60" />
                <h1 className="text-sm font-heading font-bold truncate">{room.name}</h1>
                {isHost && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Host</span>
                )}
                {isPerforming && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-bold animate-glow-pulse">
                    PERFORMING
                  </span>
                )}
                {room.streamUrl && hlsPlayer.isPlaying && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-500 font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {room.genre && (
                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">{room.genre}</span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {room.participants}/{room.maxParticipants}
                </span>
                <span className="text-border">·</span>
                <span>Host: {room.hostName}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant={clientError ? "destructive" : "default"}
                size="sm"
                onClick={handleJoinClient}
                className={`${!clientError ? "glow-primary" : ""}`}
              >
                <Music className="h-3.5 w-3.5 mr-1.5" />
                Start Jamming
              </Button>
              {isHost && (
                <Button variant="outline" size="sm" className="glass-solid border-border/50" onClick={() => navigate("/jams")}>
                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                  Manage
                </Button>
              )}
              <Button variant="outline" size="sm" className="glass-solid border-border/50 text-muted-foreground hover:text-red-400 hover:border-red-500/30" onClick={handleLeaveRoom}>
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                Leave
              </Button>
            </div>
          </div>
          {clientError && (
            <div className="glass-solid rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs text-destructive mt-2">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{clientError}</span>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex gap-4 p-4 overflow-hidden min-h-0">
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Audio Stream */}
            <div className="mb-4 flex-shrink-0">
              <div className="p-4 glass-strong rounded-xl">
                {room.streamUrl ? (
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-14 w-14 rounded-full glass-solid hover:bg-foreground/[0.06] flex-shrink-0"
                      onClick={() => hlsPlayer.togglePlayPause()}
                      disabled={hlsPlayer.isLoading}
                    >
                      {hlsPlayer.isLoading ? (
                        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : hlsPlayer.isPlaying ? (
                        <Pause className="h-7 w-7" />
                      ) : (
                        <Play className="h-7 w-7" />
                      )}
                    </Button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-heading font-semibold">Live Session</span>
                        {hlsPlayer.isPlaying && (
                          <span className="flex items-end gap-0.5 h-4 text-primary">
                            <span className="eq-bar eq-bar-1" />
                            <span className="eq-bar eq-bar-2" />
                            <span className="eq-bar eq-bar-3" />
                            <span className="eq-bar eq-bar-4" />
                          </span>
                        )}
                      </div>
                      {hlsPlayer.error ? (
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-red-500 flex-1">{hlsPlayer.error}</p>
                          <Button variant="outline" size="sm" onClick={() => { hlsPlayer.retry(); setTimeout(() => hlsPlayer.play(), 200); }} className="h-7 text-xs glass-solid border-border/50" disabled={hlsPlayer.isLoading}>
                            <RefreshCw className="h-3 w-3 mr-1" />Retry
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 flex items-center gap-2 group/progress">
                            <div className="flex-1 h-1.5 group-hover/progress:h-2.5 bg-foreground/[0.08] rounded-full overflow-hidden transition-all duration-200">
                              <div className="h-full bg-primary rounded-full transition-all" style={{ width: hlsPlayer.isPlaying ? "100%" : "0%" }} />
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums flex items-center gap-1">
                              {hlsPlayer.isPlaying && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />}
                              {hlsPlayer.isPlaying ? "LIVE" : hlsPlayer.isReady ? "PAUSED" : "OFFLINE"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => hlsPlayer.toggleMute()}
                              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                              {hlsPlayer.volume === 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                            </button>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={hlsPlayer.volume}
                              onChange={(e) => hlsPlayer.setVolume(parseFloat(e.target.value))}
                              className="w-16 h-1 accent-primary cursor-pointer"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <div className="flex items-end justify-center gap-1 h-8 mb-3 text-primary/15">
                      <span className="w-1 h-3 rounded-full bg-current" />
                      <span className="w-1 h-5 rounded-full bg-current" />
                      <span className="w-1 h-7 rounded-full bg-current" />
                      <span className="w-1 h-4 rounded-full bg-current" />
                      <span className="w-1 h-6 rounded-full bg-current" />
                      <span className="w-1 h-3 rounded-full bg-current" />
                    </div>
                    <p className="text-sm font-medium">Waiting for the jam to start</p>
                    <p className="text-xs mt-1 text-muted-foreground/60">Stream will begin when the host starts performing</p>
                  </div>
                )}
              </div>
            </div>

            {/* Performers Section */}
            {performers.length > 0 && (
              <div className="mb-4 flex-shrink-0">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-1 h-3.5 rounded-full bg-green-500" />
                  Performers ({performers.length})
                </h3>
                <div className="flex gap-3 flex-wrap">
                  {performers.map((p) => (
                    <div
                      key={p.userId}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 hover:border-primary/25 transition-all cursor-pointer"
                      onClick={() => navigate(`/profile/${p.username}`)}
                    >
                      <div className="relative">
                        <Avatar size="default" className="h-12 w-12 ring-2 ring-primary/30">
                          <AvatarImage src={p.avatar || ""} />
                          <AvatarFallback className="bg-muted text-muted-foreground">
                            {p.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 border-2 border-background" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold flex items-center gap-1.5">
                          {p.username}
                          {room.hostId === p.userId && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary">Host</span>
                          )}
                        </div>
                        {p.instrument && (
                          <div className="flex items-center gap-1 text-xs text-primary mt-0.5">
                            {instrumentIcons[p.instrument] || <Music className="h-3 w-3" />}
                            <span>{p.instrument}</span>
                          </div>
                        )}
                      </div>
                      <span className="flex items-end gap-0.5 h-4 text-primary/40 ml-2">
                        <span className="eq-bar eq-bar-1" />
                        <span className="eq-bar eq-bar-2" />
                        <span className="eq-bar eq-bar-3" />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Listeners Section */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex-shrink-0 flex items-center gap-2">
                <span className="w-1 h-3.5 rounded-full bg-muted-foreground/30" />
                Listeners ({listeners.length})
              </h3>
              <div className="space-y-0.5 overflow-y-auto flex-1">
                {listeners.map((p) => (
                  <div
                    key={p.userId}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/profile/${p.username}`)}
                  >
                    <div className="relative">
                      <Avatar size="sm" className="h-7 w-7">
                        <AvatarImage src={p.avatar || ""} />
                        <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                          {p.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-400 border border-background" />
                    </div>
                    <span className="text-sm truncate">{p.username}</span>
                  </div>
                ))}
                {listeners.length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-4">No listeners yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Chat Sidebar */}
          <div className="w-72 lg:w-80 xl:w-96 border-l border-border flex flex-col min-h-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex-shrink-0 flex items-center justify-between">
              <h3 className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Chat</h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                {participants.length} in room
              </span>
            </div>
            {isGuest && (
              <div className="px-4 py-2 text-xs text-muted-foreground/60 border-b border-border/30">
                Listening mode — sign in to chat
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground/60">
                  <p className="text-xs">No messages yet</p>
                  {!isGuest && <p className="text-xs mt-1">Start the conversation</p>}
                </div>
              ) : (
                messages.map((msg, i) => {
                  const prevMsg = messages[i - 1];
                  const showHeader = !prevMsg || prevMsg.userId !== msg.userId ||
                    (msg.timestamp.getTime() - prevMsg.timestamp.getTime()) > 5 * 60 * 1000;

                  return (
                    <div key={msg.id} className={showHeader ? "" : "pl-8"}>
                      {showHeader && (
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar size="sm" className="h-6 w-6 flex-shrink-0">
                            <AvatarImage src={msg.avatar || ""} />
                            <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                              {msg.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-semibold">{msg.username}</span>
                          <span className="text-[10px] text-muted-foreground">{formatTime(msg.timestamp)}</span>
                        </div>
                      )}
                      <p className={`text-sm whitespace-pre-wrap break-words ${showHeader ? "pl-8" : ""}`}>{msg.content}</p>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {!isGuest && (
              <div className="px-4 py-3 border-t border-border flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1 bg-muted/50 border-transparent focus:bg-background focus:border-border"
                  />
                  <Button type="submit" size="icon" disabled={!message.trim()}>
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
