import { useState, useRef, useEffect, useCallback } from "react";

export function useAudioPlayer(audioUrl?: string) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => {
    const raw = localStorage.getItem("jam-audio-volume");
    const parsed = raw ? parseFloat(raw) : 0.8;
    if (!isFinite(parsed)) return 0.8;
    return Math.min(1, Math.max(0, parsed));
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousVolumeRef = useRef(volume > 0 ? volume : 0.8);

  useEffect(() => {
    if (!audioUrl || audioUrl === "#") {
      audioRef.current = null;
      return;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    // Set preload to ensure audio can play
    audio.preload = "auto";

    const updateProgress = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const updateDuration = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };
    
    const handleError = (e: ErrorEvent) => {
      console.error("Audio playback error:", e);
      setIsPlaying(false);
    };
    
    const handleCanPlay = () => {
      // Audio is ready to play
      updateDuration();
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("error", handleError);

    // Try to load metadata
    try {
      audio.load();
    } catch (err) {
      console.error("Error loading audio:", err);
    }

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("error", handleError);
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    localStorage.setItem("jam-audio-volume", String(volume));
    if (volume > 0) {
      previousVolumeRef.current = volume;
    }
  }, [volume]);

  const play = useCallback(async () => {
    if (audioRef.current) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error("Error playing audio:", error);
        setIsPlaying(false);
      }
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((percentage: number) => {
    if (audioRef.current && duration) {
      audioRef.current.currentTime = (percentage / 100) * duration;
      setProgress(percentage);
    }
  }, [duration]);

  const setVolume = useCallback((value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    setVolumeState(clamped);
  }, []);

  const toggleMute = useCallback(() => {
    if (volume === 0) {
      setVolume(previousVolumeRef.current > 0 ? previousVolumeRef.current : 0.8);
    } else {
      previousVolumeRef.current = volume;
      setVolume(0);
    }
  }, [setVolume, volume]);

  return {
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
  };
}
