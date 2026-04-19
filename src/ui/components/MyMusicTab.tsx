import { useEffect, useRef, useState } from "react";
import {
  Disc3,
  Upload,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Trash2,
  Music,
  FileAudio,
  Clock,
  HardDrive,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useMyTracks, useMyTrackCount, useAddTrack, useDeleteTrack, type MyTrack } from "@/hooks/useMyTracks";
import { useR2Upload } from "@/hooks/useR2Upload";
import { usePostAudio } from "@/contexts/PostAudioContext";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { LoadMoreButton } from "@/components/LoadMoreButton";

const MAX_TRACKS = 30;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function TrackRow({
  track,
  onDelete,
  isDeleting,
}: {
  track: MyTrack;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const audioCtx = usePostAudio();
  const trackId = `mytrack-${track.id}`;
  const isActive = audioCtx.currentTrack?.id === trackId;
  const isPlaying = isActive && audioCtx.isPlaying;
  const { registerPlayer, unregisterPlayer } = audioCtx;

  useEffect(() => {
    registerPlayer(trackId);
    return () => unregisterPlayer(trackId);
  }, [registerPlayer, unregisterPlayer, trackId]);

  const handlePlay = () => {
    const audioUrl = track.audio_url?.trim();
    if (!audioUrl) return;
    if (!isActive) {
      audioCtx.play({
        id: trackId,
        url: audioUrl,
        title: track.title,
        author: track.owner?.username || "You",
        sourceType: "my-track",
      });
    } else {
      audioCtx.togglePlayPause();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    audioCtx.seek((x / rect.width) * 100);
  };

  return (
    <div
      className={`flex items-center gap-3 px-5 py-3 transition-colors group ${
        isActive
          ? "bg-primary/5"
          : "hover:bg-foreground/[0.03]"
      }`}
    >
      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={handlePlay}
        disabled={!track.audio_url}
        className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
          isActive
            ? "bg-primary text-primary-foreground shadow-glow-primary"
            : "bg-muted/50 text-muted-foreground hover:bg-primary/15 hover:text-primary"
        } ${!track.audio_url ? "opacity-40 cursor-not-allowed" : ""}`}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </button>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <h3 className={`text-sm font-medium truncate ${isActive ? "text-primary" : "text-foreground"}`}>
          {track.title}
        </h3>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(track.duration)}
          </span>
          <span className="flex items-center gap-1">
            <HardDrive className="h-3 w-3" />
            {formatFileSize(track.file_size)}
          </span>
        </div>
        {isActive && audioCtx.playbackError && (
          <p className="text-[11px] text-destructive mt-1 truncate">
            {audioCtx.playbackError}
          </p>
        )}
      </div>

      {/* Active track controls */}
      {isActive && (
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="w-24 h-1 bg-muted-foreground/20 rounded-full overflow-hidden cursor-pointer"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-primary transition-all duration-200"
              style={{ width: `${audioCtx.progress}%` }}
            />
          </div>
          <button
            type="button"
            onClick={audioCtx.toggleMute}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          >
            {audioCtx.volume === 0 ? (
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
            value={audioCtx.volume}
            onChange={(e) => audioCtx.setVolume(parseFloat(e.target.value))}
            aria-label="Track volume"
            className="w-16 h-1 accent-primary cursor-pointer"
          />
        </div>
      )}

      {/* Delete Button */}
      <button
        type="button"
        onClick={() => onDelete(track.id)}
        disabled={isDeleting}
        className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer disabled:opacity-40"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function UploadView({
  trackCount,
  onUploadComplete,
}: {
  trackCount: number;
  onUploadComplete: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { uploadFile, isUploading } = useR2Upload();
  const addTrack = useAddTrack();

  const remaining = MAX_TRACKS - trackCount;

  const handleFileSelect = (file: File) => {
    setError(null);

    // Validate file type
    if (!file.type.startsWith("audio/")) {
      setError("Only audio files (MP3, WAV, OGG, etc.) are supported.");
      return;
    }

    // Validate file size (25MB)
    if (file.size > 25 * 1024 * 1024) {
      setError("File size must be under 25MB.");
      return;
    }

    setSelectedFile(file);

    // Auto-fill title from filename if empty
    if (!title) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setTitle(nameWithoutExt.substring(0, 100));
    }

    // Get audio duration
    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    audio.addEventListener("loadedmetadata", () => {
      setDuration(Math.round(audio.duration));
      URL.revokeObjectURL(audio.src);
    });
    audio.addEventListener("error", () => {
      // Can't determine duration, set to 0
      setDuration(0);
      URL.revokeObjectURL(audio.src);
    });
  };

  const handleSubmit = async () => {
    if (!selectedFile || !title.trim()) return;
    if (remaining <= 0) {
      setError(`You've reached the maximum of ${MAX_TRACKS} tracks.`);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Upload to R2
      const result = await uploadFile("audio", selectedFile);

      // Save track to database
      await addTrack.mutateAsync({
        title: title.trim(),
        audioUrl: result.url,
        duration,
        fileSize: selectedFile.size,
        contentType: selectedFile.type,
      });

      // Reset form
      setSelectedFile(null);
      setTitle("");
      setDuration(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploadComplete();
    } catch (error: unknown) {
      const msg = getErrorMessage(error, "Upload failed. Please try again.");
      // Extract user-friendly message
      const match = msg.match(/^[A-Z_]+:\s*(.*)$/);
      setError(match?.[1] ?? msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setTitle("");
    setDuration(0);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isBusy = isUploading || addTrack.isPending || isSubmitting;

  return (
    <div className="px-5 py-6">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-primary">{trackCount}</span>
            <span className="mx-1">/</span>
            <span>{MAX_TRACKS}</span>
            <span className="ml-1">tracks used</span>
          </div>
          {remaining <= 5 && remaining > 0 && (
            <span className="text-xs text-amber-500 font-medium">
              {remaining} remaining
            </span>
          )}
          {remaining <= 0 && (
            <span className="text-xs text-destructive font-medium">
              Library full
            </span>
          )}
        </div>

        {/* Capacity bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              remaining <= 0
                ? "bg-destructive"
                : remaining <= 5
                ? "bg-amber-500"
                : "bg-primary"
            }`}
            style={{ width: `${(trackCount / MAX_TRACKS) * 100}%` }}
          />
        </div>

        {/* File Drop Zone */}
        <div
          onClick={() => !isBusy && remaining > 0 && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            selectedFile
              ? "border-primary/40 bg-primary/5"
              : remaining <= 0
              ? "border-muted/50 bg-muted/20 opacity-50 cursor-not-allowed"
              : "border-border hover:border-primary/30 hover:bg-primary/[0.02] cursor-pointer"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            disabled={isBusy || remaining <= 0}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />

          {selectedFile ? (
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto">
                <FileAudio className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium truncate max-w-xs mx-auto">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatFileSize(selectedFile.size)}
                  {duration > 0 && ` • ${formatDuration(duration)}`}
                </p>
              </div>
              {!isBusy && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Choose different file
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Click to select an audio file
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  MP3, WAV, OGG, FLAC • Max 25MB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Title Input */}
        {selectedFile && (
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">
              Track Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              disabled={isBusy}
              placeholder="Enter a title for your track"
              className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-transparent text-sm placeholder:text-muted-foreground/50 focus:bg-background focus:border-border focus:outline-none transition-colors disabled:opacity-50"
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {title.length}/100
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Upload Button */}
        {selectedFile && (
          <button
            onClick={handleSubmit}
            disabled={isBusy || !title.trim() || remaining <= 0}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isBusy ? (
              <>
                <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                {isUploading ? "Uploading..." : "Saving..."}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload Track
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function MyMusicTab() {
  const { isGuest } = useAuthStore();
  const [activeView, setActiveView] = useState<"library" | "upload">("library");

  const {
    data: tracks = [],
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useMyTracks();

  const trackCount = useMyTrackCount();
  const deleteTrack = useDeleteTrack();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (trackId: string) => {
    if (deletingId) return;
    setDeletingId(trackId);
    try {
      await deleteTrack.mutateAsync(trackId);
    } catch (err) {
      console.error("Failed to delete track:", err);
    } finally {
      setDeletingId(null);
    }
  };

  if (isGuest) {
    return (
      <div className="flex flex-col h-full">
        <div className="page-header caption-safe px-5 py-3 border-b border-border flex items-center gap-2 shrink-0">
          <Disc3 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-heading font-semibold text-muted-foreground">My Music</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={Music}
            title="Sign in to access your music library"
            description="Upload and manage your personal track collection."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="page-header caption-safe px-5 py-3 border-b border-border flex items-center gap-2 shrink-0">
        <Disc3 className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-heading font-semibold text-muted-foreground">My Music</h2>
      </div>

      {/* Tabs */}
      <div className="px-5 pt-3 shrink-0">
        <div className="flex items-center gap-1 mb-3">
          <button
            onClick={() => setActiveView("library")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
              activeView === "library"
                ? "bg-primary/12 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            My Library
            {tracks.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                {trackCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveView("upload")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
              activeView === "upload"
                ? "bg-primary/12 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            Upload
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeView === "library" ? (
          isLoading ? (
            <LoadingState message="Loading your tracks..." />
          ) : tracks.length === 0 ? (
            <EmptyState
              icon={Music}
              title="No tracks yet"
              description="Upload your first track to start building your library!"
            />
          ) : (
            <>
              <div className="divide-y divide-border/50">
                {tracks.map((track) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    onDelete={handleDelete}
                    isDeleting={deletingId === track.id}
                  />
                ))}
              </div>
              <div className="p-4">
                <LoadMoreButton
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  fetchNextPage={fetchNextPage}
                />
              </div>
            </>
          )
        ) : (
          <UploadView
            trackCount={trackCount}
            onUploadComplete={() => setActiveView("library")}
          />
        )}
      </div>
    </div>
  );
}

export default MyMusicTab;
