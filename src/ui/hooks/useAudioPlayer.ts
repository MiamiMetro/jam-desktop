import { useState, useRef, useEffect, useCallback } from "react";

export function useAudioPlayer(audioUrl?: string) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  return {
    isPlaying,
    progress,
    duration,
    play,
    pause,
    togglePlayPause,
    seek,
  };
}

