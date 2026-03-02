// AudioPlayer.tsx — Unified audio player for posts and comments
// Connects to the global PostAudioContext singleton instead of owning its own Audio element.
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Music, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { usePostAudio } from "@/contexts/PostAudioContext";
import { formatDuration } from "@/lib/postUtils";

interface AudioPlayerProps {
  postId: string;
  audioFile: {
    url: string;
    title: string;
    duration: number;
  };
  authorName: string;
  isGuest?: boolean;
  variant?: "post" | "comment";
}

export function AudioPlayer({
  postId,
  audioFile,
  authorName,
  isGuest = false,
  variant = "post",
}: AudioPlayerProps) {
  const ctx = usePostAudio();
  const isActive = ctx.currentTrack?.id === postId;
  const isThisPlaying = isActive && ctx.isPlaying;

  // Register/unregister for visibility tracking
  useEffect(() => {
    ctx.registerPlayer(postId);
    return () => ctx.unregisterPlayer(postId);
  }, [postId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = () => {
    if (isGuest) return;
    if (!isActive) {
      ctx.play({
        id: postId,
        url: audioFile.url,
        title: audioFile.title,
        author: authorName,
        sourceType: variant,
      });
    } else {
      ctx.togglePlayPause();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isGuest) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    if (!isActive) {
      ctx.play({
        id: postId,
        url: audioFile.url,
        title: audioFile.title,
        author: authorName,
        sourceType: variant,
      });
    }
    ctx.seek(percentage);
  };

  const displayProgress = isActive ? ctx.progress : 0;
  const displayDuration = isActive && ctx.duration > 0 ? ctx.duration : audioFile.duration;

  return (
    <div className={`p-3 rounded-lg glass-strong ${variant === "post" ? "mb-3" : "mt-2"}`}>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={handleClick}
          disabled={isGuest}
        >
          {isThisPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Music className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium truncate">
              {audioFile.title}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex-1 h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden cursor-pointer"
              onClick={handleSeek}
            >
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${displayProgress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {displayProgress > 0
                ? `${formatDuration((displayProgress / 100) * displayDuration)} / ${formatDuration(displayDuration)}`
                : formatDuration(displayDuration)}
            </span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={ctx.toggleMute}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                disabled={isGuest}
              >
                {ctx.volume === 0 ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={ctx.volume}
                onChange={(e) => ctx.setVolume(parseFloat(e.target.value))}
                className="w-16 h-1 accent-primary cursor-pointer"
                disabled={isGuest}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
