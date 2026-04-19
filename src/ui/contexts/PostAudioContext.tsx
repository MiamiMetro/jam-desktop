// PostAudioContext.tsx — Global singleton audio player for posts & comments
// Ensures only one audio plays at a time and survives virtual scroll unmounts.
import { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";
import { usePlayer } from "@/contexts/PlayerContext";

export interface PostAudioTrack {
  id: string;
  url: string;
  title: string;
  author: string;
  sourceType: "post" | "comment" | "my-track";
}

interface PostAudioContextValue {
  currentTrack: PostAudioTrack | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  playbackError: string | null;
  play: (track: PostAudioTrack) => void;
  pause: () => void;
  togglePlayPause: () => void;
  seek: (percentage: number) => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
  stop: () => void;
  registerPlayer: (trackId: string) => void;
  unregisterPlayer: (trackId: string) => void;
  isCurrentTrackVisible: boolean;
}

const PostAudioContext = createContext<PostAudioContextValue | null>(null);

function getStoredVolume(): number {
  const raw = localStorage.getItem("jam-audio-volume");
  const parsed = raw ? parseFloat(raw) : 0.8;
  if (!isFinite(parsed)) return 0.8;
  return Math.min(1, Math.max(0, parsed));
}

function getAudioErrorMessage(error: unknown, audio: HTMLAudioElement): string {
  if (audio.error) {
    switch (audio.error.code) {
      case 1:
        return "Playback was interrupted.";
      case 2:
        return "Couldn't load this audio file.";
      case 3:
        return "This audio file couldn't be decoded.";
      case 4:
        return "This audio format or URL isn't playable.";
      default:
        return "Couldn't play this audio file.";
    }
  }

  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Playback was blocked. Try pressing play again.";
  }

  return "Couldn't play this audio file.";
}

export function PostAudioProvider({ children }: { children: React.ReactNode }) {
  const hlsPlayer = usePlayer();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<PostAudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(getStoredVolume);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const previousVolumeRef = useRef(volume > 0 ? volume : 0.8);
  const currentTrackRef = useRef<PostAudioTrack | null>(null);

  // Mounted player visibility tracking
  const [mountedPlayers, setMountedPlayers] = useState<Set<string>>(() => new Set());

  const getOrCreateAudio = useCallback(() => {
    if (audioRef.current == null) {
      const audio = new Audio();
      audio.preload = "auto";
      audio.volume = getStoredVolume();
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  // Wire up Audio element event listeners (once, on mount)
  useEffect(() => {
    const audio = getOrCreateAudio();

    const onTimeUpdate = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const onLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setPlaybackError(null);
      setCurrentTrack(null);
      currentTrackRef.current = null;
    };

    const onError = () => {
      console.error("Post audio playback error", audio.error);
      setPlaybackError(getAudioErrorMessage(null, audio));
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("canplay", onLoadedMetadata);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("canplay", onLoadedMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.pause();
      audio.src = "";
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    };
  }, [getOrCreateAudio]);

  const startPlayback = useCallback(async (trackId: string | null) => {
    const audio = getOrCreateAudio();

    try {
      await audio.play();
      if (!trackId || currentTrackRef.current?.id === trackId) {
        setPlaybackError(null);
      }
    } catch (error) {
      if (!trackId || currentTrackRef.current?.id === trackId) {
        console.error("Error playing audio:", error);
        setPlaybackError(getAudioErrorMessage(error, audio));
        setIsPlaying(false);
      }
    }
  }, [getOrCreateAudio]);

  const play = useCallback((track: PostAudioTrack) => {
    const audio = getOrCreateAudio();
    const url = track.url.trim();
    if (!url) {
      setPlaybackError("This track does not have a playable audio URL.");
      return;
    }

    // Pause HLS if it's playing (mutual exclusion)
    if (hlsPlayer.isPlaying) {
      hlsPlayer.pause();
    }

    const isSameTrack = currentTrackRef.current?.id === track.id;

    if (isSameTrack) {
      // Resume same track
      setPlaybackError(null);
      void startPlayback(track.id);
    } else {
      // Switch to new track
      setProgress(0);
      setDuration(0);
      setPlaybackError(null);
      setCurrentTrack(track);
      currentTrackRef.current = track;
      audio.src = url;
      audio.load();
      void startPlayback(track.id);
    }
  }, [getOrCreateAudio, hlsPlayer, startPlayback]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else if (currentTrackRef.current) {
      // Resume — also pause HLS
      if (hlsPlayer.isPlaying) {
        hlsPlayer.pause();
      }
      setPlaybackError(null);
      void startPlayback(currentTrackRef.current.id);
    }
  }, [isPlaying, pause, hlsPlayer, startPlayback]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setPlaybackError(null);
    setCurrentTrack(null);
    currentTrackRef.current = null;
  }, []);

  const seek = useCallback((percentage: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.duration && isFinite(audio.duration)) {
      audio.currentTime = (percentage / 100) * audio.duration;
      setProgress(percentage);
    }
  }, []);

  const setVolume = useCallback((value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    localStorage.setItem("jam-audio-volume", String(clamped));
    if (clamped > 0) {
      previousVolumeRef.current = clamped;
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (volume === 0) {
      setVolume(previousVolumeRef.current > 0 ? previousVolumeRef.current : 0.8);
    } else {
      previousVolumeRef.current = volume;
      setVolume(0);
    }
  }, [setVolume, volume]);

  const registerPlayer = useCallback((trackId: string) => {
    setMountedPlayers((prev) => {
      const next = new Set(prev);
      next.add(trackId);
      return next;
    });
  }, []);

  const unregisterPlayer = useCallback((trackId: string) => {
    setMountedPlayers((prev) => {
      const next = new Set(prev);
      next.delete(trackId);
      return next;
    });
  }, []);

  const isCurrentTrackVisible = currentTrack ? mountedPlayers.has(currentTrack.id) : false;

  return (
    <PostAudioContext.Provider
      value={{
        currentTrack,
        isPlaying,
        progress,
        duration,
        volume,
        playbackError,
        play,
        pause,
        togglePlayPause,
        seek,
        setVolume,
        toggleMute,
        stop,
        registerPlayer,
        unregisterPlayer,
        isCurrentTrackVisible,
      }}
    >
      {children}
    </PostAudioContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePostAudio() {
  const ctx = useContext(PostAudioContext);
  if (!ctx) throw new Error("usePostAudio must be used within PostAudioProvider");
  return ctx;
}
