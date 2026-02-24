// AudioPlayer.tsx — Unified audio player for posts and comments
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Music, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { formatDuration } from "@/lib/postUtils";

interface AudioPlayerProps {
  audioFile: {
    url: string;
    title: string;
    duration: number;
  };
  isActive: boolean;
  onActivate: () => void;
  isGuest?: boolean;
  variant?: "post" | "comment";
}

export function AudioPlayer({
  audioFile,
  isActive,
  onActivate,
  isGuest = false,
  variant = "post",
}: AudioPlayerProps) {
  // Only enable audio player if URL is valid (not "#" placeholder)
  const audioUrl = audioFile.url && audioFile.url !== "#" ? audioFile.url : undefined;
  const audioPlayer = useAudioPlayer(audioUrl);

  useEffect(() => {
    if (!isActive && audioPlayer.isPlaying) {
      audioPlayer.pause();
    }
  }, [isActive, audioPlayer.isPlaying, audioPlayer.pause]);

  const handleClick = () => {
    if (isGuest) return;
    if (!isActive) {
      onActivate();
      void audioPlayer.play();
    } else {
      audioPlayer.togglePlayPause();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isGuest) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    if (!isActive) {
      onActivate();
    }
    audioPlayer.seek(percentage);
  };

  const displayDuration =
    audioPlayer.duration > 0 ? audioPlayer.duration : audioFile.duration;

  return (
    <div className={`p-3 rounded-xl glass-strong ${variant === "post" ? "mb-3" : "mt-2"}`}>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={handleClick}
          disabled={isGuest}
        >
          {isActive && audioPlayer.isPlaying ? (
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
                style={{ width: `${audioPlayer.progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDuration(displayDuration)}
            </span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={audioPlayer.toggleMute}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                disabled={isGuest}
              >
                {audioPlayer.volume === 0 ? (
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
                value={audioPlayer.volume}
                onChange={(e) => audioPlayer.setVolume(parseFloat(e.target.value))}
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
