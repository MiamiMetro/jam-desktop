// StatusBar.tsx — Bottom bar showing current room info & post audio mini-player
import { useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Hash, Users, LogOut, Play, Pause, Volume2, VolumeX, Music, X, MessageCircle } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useRoom, useRoomMessages } from "@/hooks/useRooms";
import { usePlayer } from "@/contexts/PlayerContext";
import { usePostAudio } from "@/contexts/PostAudioContext";
import { formatDuration } from "@/lib/postUtils";

export default function StatusBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentJamRoomHandle = useUIStore((s) => s.currentJamRoomHandle);
  const setCurrentJamRoomHandle = useUIStore((s) => s.setCurrentJamRoomHandle);
  const { data: room } = useRoom(currentJamRoomHandle || undefined);
  const player = usePlayer();
  const postAudio = usePostAudio();

  const isOnRoomPage = location.pathname.startsWith("/jam/");

  // Unread chat badge — track last seen count when on room page
  const { data: messages = [] } = useRoomMessages(room?.id);
  const lastSeenCount = useRef(0);

  useEffect(() => {
    if (isOnRoomPage) {
      lastSeenCount.current = messages.length;
    }
  }, [isOnRoomPage, messages.length]);

  const unreadCount = isOnRoomPage ? 0 : Math.max(0, messages.length - lastSeenCount.current);

  const showJamRoom = currentJamRoomHandle && room && !isOnRoomPage;
  const showPostAudio = postAudio.currentTrack && !postAudio.isCurrentTrackVisible;

  // Hide when nothing to show
  if (!showJamRoom && !showPostAudio) return null;

  const handleLeave = () => {
    setCurrentJamRoomHandle(null);
  };

  const handleGoToRoom = () => {
    navigate(`/jam/${currentJamRoomHandle}`);
  };

  const handleHlsPlayPause = () => {
    // Pause post audio when resuming HLS
    if (!player.isPlaying && postAudio.isPlaying) {
      postAudio.pause();
    }
    player.togglePlayPause();
  };

  const handlePostAudioSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    postAudio.seek(percentage);
  };

  const displayDuration = postAudio.duration > 0 ? postAudio.duration : 0;

  return (
    <div className="h-8 shrink-0 border-t border-border/40 surface-elevated flex items-center px-3 gap-3 text-xs select-none relative z-20">
      {/* Jam room section */}
      {showJamRoom && (
        <>
          <button
            onClick={handleGoToRoom}
            className="flex items-center gap-2 min-w-0 cursor-pointer hover:text-foreground transition-colors group"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 animate-pulse" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <Hash className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
            <span className="font-semibold truncate max-w-40 text-muted-foreground group-hover:text-foreground transition-colors">
              {room!.name}
            </span>
            {unreadCount > 0 && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold shrink-0 animate-in fade-in duration-200">
                <MessageCircle className="h-2.5 w-2.5" />
                {unreadCount}
              </span>
            )}
          </button>

          <span className="w-px h-3.5 bg-border/50" />

          <span className="flex items-center gap-1 text-muted-foreground shrink-0">
            <Users className="h-3 w-3" />
            <span className="tabular-nums">{room!.participant_count}</span>
          </span>

          {room!.genre && (
            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium shrink-0">
              {room!.genre}
            </span>
          )}

          {room!.stream_url && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleHlsPlayPause}
                disabled={player.isLoading}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
              >
                {player.isLoading ? (
                  <div className="h-3.5 w-3.5 border-[1.5px] border-primary border-t-transparent rounded-full animate-spin" />
                ) : player.isPlaying ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </button>

              <button
                onClick={() => player.toggleMute()}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {player.volume === 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={player.volume}
                onChange={(e) => player.setVolume(parseFloat(e.target.value))}
                className="w-14 h-1 accent-primary cursor-pointer"
              />
            </div>
          )}

          <span className="w-px h-3.5 bg-border/50" />

          <button
            onClick={handleLeave}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="h-3 w-3" />
            <span className="font-medium">Leave</span>
          </button>
        </>
      )}

      {/* Separator between jam room and post audio */}
      {showJamRoom && showPostAudio && (
        <span className="w-0.5 h-4 bg-foreground/20 rounded-full mx-1" />
      )}

      {/* Post audio mini-player */}
      {showPostAudio && (
        <>
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <Music className="h-3 w-3 text-primary shrink-0" />
            <span className="text-muted-foreground truncate max-w-32">
              <span className="font-medium text-foreground">{postAudio.currentTrack!.author}</span>
              {" — "}
              {postAudio.currentTrack!.title}
            </span>
          </div>

          {/* Play/Pause */}
          <button
            onClick={() => postAudio.togglePlayPause()}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
          >
            {postAudio.isPlaying ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Progress bar */}
          <div
            className="w-24 h-1 bg-muted-foreground/20 rounded-full overflow-hidden cursor-pointer shrink-0"
            onClick={handlePostAudioSeek}
          >
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${postAudio.progress}%` }}
            />
          </div>

          {/* Time */}
          {displayDuration > 0 && (
            <span className="text-muted-foreground tabular-nums shrink-0">
              {formatDuration((postAudio.progress / 100) * displayDuration)}
            </span>
          )}

          {/* Volume */}
          <button
            onClick={() => postAudio.toggleMute()}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
          >
            {postAudio.volume === 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={postAudio.volume}
            onChange={(e) => postAudio.setVolume(parseFloat(e.target.value))}
            className="w-14 h-1 accent-primary cursor-pointer"
          />

          {/* Stop / dismiss */}
          <button
            onClick={() => postAudio.stop()}
            className="text-muted-foreground hover:text-red-400 transition-colors cursor-pointer shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}
