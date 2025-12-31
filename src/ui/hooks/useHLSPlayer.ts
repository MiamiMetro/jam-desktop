import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";

export function useHLSPlayer(streamUrl?: string) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    if (!streamUrl) {
      // Cleanup if no stream URL
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      setError(null);
      setIsLoading(false);
      setIsPlaying(false);
      return;
    }

    // Reset error state when stream URL changes or retry is triggered
    setError(null);
    setIsLoading(false);
    setIsPlaying(false);

    const audio = document.createElement("audio");
    audioRef.current = audio;
    audio.preload = "auto";

    // Check if HLS is supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(audio);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setError(null);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error("HLS fatal error:", data);
          hls.destroy();
          setError("Failed to load stream");
          setIsLoading(false);
          setIsPlaying(false);
        } else {
          console.warn("HLS non-fatal error:", data);
        }
      });
    } else if (audio.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS support (Safari)
      audio.src = streamUrl;
      audio.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        setError(null);
      });
      audio.addEventListener("error", () => {
        setError("Failed to load stream");
        setIsLoading(false);
      });
    } else {
      setError("HLS is not supported in this browser");
      setIsLoading(false);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, [streamUrl, retryKey]);

  const play = useCallback(async () => {
    if (audioRef.current) {
      try {
        setIsLoading(true);
        await audioRef.current.play();
        setIsPlaying(true);
        setIsLoading(false);
      } catch (error) {
        console.error("Error playing HLS stream:", error);
        setError("Failed to play stream");
        setIsPlaying(false);
        setIsLoading(false);
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

  const retry = useCallback(() => {
    setError(null);
    setIsLoading(false);
    setIsPlaying(false);
    // Trigger re-initialization by incrementing retry key
    setRetryKey(prev => prev + 1);
  }, []);

  return {
    isPlaying,
    isLoading,
    error,
    play,
    pause,
    togglePlayPause,
    retry,
  };
}

