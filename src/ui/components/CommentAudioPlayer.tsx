import { Button } from "@/components/ui/button";
import { Music, Play, Pause } from "lucide-react";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { formatDuration } from "@/lib/postUtils";

interface CommentAudioPlayerProps {
  audioFile: {
    url: string;
    title: string;
    duration: number;
  };
  isActive: boolean;
  onActivate: () => void;
}

export function CommentAudioPlayer({ audioFile, isActive, onActivate }: CommentAudioPlayerProps) {
  // Only enable audio player if URL is valid (not "#" placeholder)
  const audioUrl = audioFile.url && audioFile.url !== "#" ? audioFile.url : undefined;
  const audioPlayer = useAudioPlayer(isActive ? audioUrl : undefined);

  const handleClick = () => {
    if (!isActive) {
      onActivate();
      setTimeout(() => audioPlayer.play(), 0);
    } else {
      audioPlayer.togglePlayPause();
    }
  };

  return (
    <div className="mt-2 p-3 bg-muted rounded-lg">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={handleClick}
        >
          {isActive && audioPlayer.isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Music className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium truncate">
              {audioFile.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="flex-1 h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden cursor-pointer"
              onClick={(e) => {
                if (isActive) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percentage = (x / rect.width) * 100;
                  audioPlayer.seek(percentage);
                }
              }}
            >
              <div 
                className="h-full bg-primary transition-all" 
                style={{ width: isActive ? `${audioPlayer.progress}%` : "0%" }} 
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDuration(audioFile.duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

