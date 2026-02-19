import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Music,
  Upload,
  Mic,
  Trash2,
  Play,
  Pause,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { formatDuration } from "@/lib/postUtils";

interface ComposePostProps {
  placeholder?: string;
  onSubmit: (content: string, audioFile: File | null) => void;
  onGuestAction?: () => void;
  submitButtonText?: string;
  textareaRows?: number;
  textareaMinHeight?: string;
  maxLength?: number;
  wrapperClassName?: string;
  inputId?: string;
  isSubmitting?: boolean;
}

const MAX_POST_LENGTH = 1000;

export function ComposePost({ 
  placeholder = "What's on your mind? Share a message or upload audio...",
  onSubmit,
  onGuestAction,
  submitButtonText = "Post",
  textareaRows = 4,
  textareaMinHeight = "100px",
  maxLength = MAX_POST_LENGTH,
  wrapperClassName = "border-b border-border p-5 bg-background",
  inputId = "audio-upload",
  isSubmitting = false,
}: ComposePostProps) {
  const navigate = useNavigate();
  const { isGuest, user } = useAuthStore();
  const [newPost, setNewPost] = useState({
    content: "",
    audioFile: null as File | null,
  });
  const {
    isRecording,
    recordedAudio,
    recordingTime,
    startRecording,
    stopRecording,
    deleteRecording,
    getAudioFile,
  } = useAudioRecorder();
  
  // Audio player for recorded audio preview
  const recordedAudioPlayer = useAudioPlayer(recordedAudio?.url);

  const handleCreatePost = () => {
    if (isGuest) {
      onGuestAction?.();
      return;
    }
    
    // Get recorded audio if available, otherwise use uploaded file
    const audioFile = recordedAudio ? getAudioFile() : newPost.audioFile;
    
    if (!newPost.content.trim() && !audioFile) return;
    
    onSubmit(newPost.content, audioFile);
    
    // Reset state
    setNewPost({
      content: "",
      audioFile: null,
    });
    if (recordedAudio) {
      deleteRecording();
    }
  };

  const handleUploadAudio = (file: File) => {
    // If recording exists, delete it first
    if (recordedAudio) {
      deleteRecording();
    }
    setNewPost({ ...newPost, audioFile: file });
  };

  const handleDeleteUploadedAudio = () => {
    setNewPost({ ...newPost, audioFile: null });
  };

  const handleStartRecording = () => {
    // If uploaded audio exists, remove it first
    if (newPost.audioFile) {
      setNewPost({ ...newPost, audioFile: null });
    }
    startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleDeleteRecording = () => {
    deleteRecording();
  };


  if (isGuest) return null;

  return (
    <div className={wrapperClassName}>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => user && navigate(`/profile/${user.username}`)}
          className="flex-shrink-0 p-0 m-0 border-0 bg-transparent cursor-pointer hover:opacity-80 transition-opacity self-start"
          aria-label="Go to profile"
        >
          <Avatar size="default" className="pointer-events-none">
            <AvatarImage src={user?.avatar_url || ""} alt={user?.username || "You"} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user?.username?.substring(0, 2).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 space-y-3 min-w-0">
          <Textarea
            placeholder={placeholder}
            value={newPost.content}
            onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
            className="resize-none border-border w-full overflow-wrap-anywhere"
            style={{ minHeight: textareaMinHeight }}
            rows={textareaRows}
            maxLength={maxLength}
            wrap="soft"
          />
          {/* Recorded Audio Preview */}
          {recordedAudio && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() => recordedAudioPlayer.togglePlayPause()}
              >
                {recordedAudioPlayer.isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Music className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium truncate">Voice Recording</span>
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="flex-1 h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden cursor-pointer"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const percentage = (x / rect.width) * 100;
                      recordedAudioPlayer.seek(percentage);
                    }}
                  >
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ width: `${recordedAudioPlayer.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDuration(recordedAudio.duration)}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                className="h-6 w-6"
                onClick={handleDeleteRecording}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Uploaded Audio Preview */}
          {newPost.audioFile && !recordedAudio && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Music className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm flex-1 truncate">{newPost.audioFile.name}</span>
              <Button
                variant="ghost"
                size="icon-xs"
                className="h-6 w-6"
                onClick={handleDeleteUploadedAudio}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Only show buttons when no audio is selected */}
              {!newPost.audioFile && !recordedAudio && (
                <>
                  {/* Upload Audio Button */}
                  <label htmlFor={inputId} className="cursor-pointer">
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      disabled={isRecording}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Audio
                    </Button>
                    <input
                      id={inputId}
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUploadAudio(file);
                        }
                      }}
                    />
                  </label>
                  
                  {/* Microphone Button */}
                  <Button
                    variant={isRecording ? "default" : "ghost"}
                    size="sm"
                    type="button"
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    className={isRecording ? "bg-red-500 hover:bg-red-600 text-white" : "text-muted-foreground hover:text-foreground"}
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    {isRecording ? "Stop" : "Record"}
                    {isRecording && (
                      <span className="ml-2 text-xs">
                        {formatDuration(recordingTime)}
                      </span>
                    )}
                  </Button>
                </>
              )}
            </div>
            <Button
              onClick={handleCreatePost}
              disabled={(!newPost.content.trim() && !newPost.audioFile && !recordedAudio) || isRecording || isSubmitting}
              size="sm"
            >
              {isSubmitting ? "Posting..." : submitButtonText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

