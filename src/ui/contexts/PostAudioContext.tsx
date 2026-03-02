// PostAudioContext.tsx — Global singleton audio player for posts & comments
// Ensures only one audio plays at a time and survives virtual scroll unmounts.
import { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";
import { usePlayer } from "@/contexts/PlayerContext";

export interface PostAudioTrack {
  id: string;
  url: string;
  title: string;
  author: string;
  sourceType: "post" | "comment";
}

interface PostAudioContextValue {
  currentTrack: PostAudioTrack | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
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

export function PostAudioProvider({ children }: { children: React.ReactNode }) {
  const hlsPlayer = usePlayer();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<PostAudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(getStoredVolume);
  const previousVolumeRef = useRef(volume > 0 ? volume : 0.8);
  const currentTrackRef = useRef<PostAudioTrack | null>(null);

  // Mounted player visibility tracking
  const [mountedPlayers, setMountedPlayers] = useState<Set<string>>(() => new Set());

  // Lazily create the singleton Audio element
  if (!audioRef.current) {
    audioRef.current = new Audio();
    audioRef.current.preload = "auto";
    audioRef.current.volume = getStoredVolume();
  }

  // Wire up Audio element event listeners (once, on mount)
  useEffect(() => {
    const audio = audioRef.current!;

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
      setCurrentTrack(null);
      currentTrackRef.current = null;
    };

    const onError = () => {
      console.error("Post audio playback error");
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
    };
  }, []);

  const play = useCallback((track: PostAudioTrack) => {
    const audio = audioRef.current!;

    // Pause HLS if it's playing (mutual exclusion)
    if (hlsPlayer.isPlaying) {
      hlsPlayer.pause();
    }

    const isSameTrack = currentTrackRef.current?.id === track.id;

    if (isSameTrack) {
      // Resume same track
      void audio.play();
    } else {
      // Switch to new track
      setProgress(0);
      setDuration(0);
      setCurrentTrack(track);
      currentTrackRef.current = track;
      audio.src = track.url;
      audio.load();
      void audio.play();
    }
  }, [hlsPlayer]);

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
      void audioRef.current?.play();
    }
  }, [isPlaying, pause, hlsPlayer]);

  const stop = useCallback(() => {
    const audio = audioRef.current!;
    audio.pause();
    audio.src = "";
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setCurrentTrack(null);
    currentTrackRef.current = null;
  }, []);

  const seek = useCallback((percentage: number) => {
    const audio = audioRef.current!;
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

export function usePostAudio() {
  const ctx = useContext(PostAudioContext);
  if (!ctx) throw new Error("usePostAudio must be used within PostAudioProvider");
  return ctx;
}
