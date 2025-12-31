import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";

export function useHLSPlayer(streamUrl?: string) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const manifestReadyRef = useRef(false);

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
    setIsReady(false);
    manifestReadyRef.current = false;

    const audio = document.createElement("audio");
    audioRef.current = audio;
    audio.preload = "auto";

    // Check if HLS is supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        // Limit buffer to ~15 seconds to save RAM while preventing stalls
        maxBufferLength: 15, // Maximum buffer length in seconds
        maxMaxBufferLength: 15, // Maximum max buffer length
        maxBufferSize: 15 * 1024 * 1024, // 15MB max buffer size
        maxBufferHole: 0.5, // Maximum buffer hole in seconds
        // Keep minimal back buffer
        backBufferLength: 3, // Only keep 3 seconds of back buffer
        // Buffer management to prevent stalls
        maxStarvationDelay: 4, // Max time to wait for buffer before seeking
        maxLoadingDelay: 4, // Max loading delay
        liveSyncDurationCount: 3, // Sync to live edge
        liveMaxLatencyDurationCount: 5, // Max latency from live edge
        // Auto recover from buffer stalls
        abrEwmaDefaultEstimate: 500000, // Default bandwidth estimate
        abrBandWidthFactor: 0.95, // Bandwidth factor
        abrBandWidthUpFactor: 0.7, // Bandwidth up factor
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(audio);

      // Use a ref to track playing state for event handlers
      const playingRef = { current: false };
      (audio as any).__playingRef = playingRef;
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        manifestReadyRef.current = true;
        setIsReady(true);
        setIsLoading(false);
        setError(null);
        // Seek to live edge when manifest is parsed (only if playing)
        if (playingRef.current && audio.buffered.length > 0) {
          const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
          audio.currentTime = bufferedEnd;
        }
      });
      
      // Don't start loading until play is called (but allow manifest to load first)
      // Load manifest to check if stream is available
      hls.on(Hls.Events.MANIFEST_LOADING, () => {
        // Allow manifest to load
      });
      
      // After manifest loads, stop loading segments until play is called
      hls.on(Hls.Events.MANIFEST_LOADED, () => {
        hls.stopLoad();
      });
      
      hls.on(Hls.Events.FRAG_LOADED, () => {
        // Keep seeking to live edge as new fragments load (only when playing)
        if (playingRef.current && audio.buffered.length > 0) {
          const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
          const currentTime = audio.currentTime;
          // If we're more than 2 seconds behind live, jump to live
          if (bufferedEnd - currentTime > 2) {
            audio.currentTime = bufferedEnd;
          }
        }
      });
      
      // Store playing ref for use in callbacks
      (audio as any).__playingRef = playingRef;

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          // Ignore network errors when stopped (cancelled requests)
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !playingRef.current) {
            // This is expected when we stop loading - ignore it
            return;
          }
          console.error("HLS fatal error:", data);
          hls.destroy();
          setError("Failed to load stream");
          setIsLoading(false);
          setIsPlaying(false);
          setIsReady(false);
          manifestReadyRef.current = false;
        } else {
          // Ignore network errors when stopped
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !playingRef.current) {
            return;
          }
          // Handle buffer stall errors - HLS.js will auto-recover, just log it
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR && data.details === 'bufferStalledError') {
            // HLS.js handles this automatically by seeking forward or waiting for buffer
            // This is expected with small buffers, no action needed
            return;
          }
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
        hlsRef.current.stopLoad();
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
    if (!audioRef.current) return;
    
    try {
      setIsLoading(true);
      
      // For HLS streams, always seek to live position when playing
      if (hlsRef.current) {
        // Update playing ref first
        const playingRef = (audioRef.current as any).__playingRef;
        if (playingRef) playingRef.current = true;
        
        // Start loading to get latest live content
        hlsRef.current.startLoad();
        
        // Wait for manifest to be ready and buffer to fill
        const waitAndPlay = () => {
          if (!audioRef.current) return;
          
          // Wait for buffer to have some content
          if (audioRef.current.buffered.length > 0) {
            // Seek to live edge
            const bufferedEnd = audioRef.current.buffered.end(audioRef.current.buffered.length - 1);
            audioRef.current.currentTime = bufferedEnd;
            
            // Try to play
            audioRef.current.play()
              .then(() => {
                setIsPlaying(true);
                setIsLoading(false);
              })
              .catch((err) => {
                console.error("Error playing audio:", err);
                setError("Failed to play stream");
                setIsPlaying(false);
                setIsLoading(false);
                if (playingRef) playingRef.current = false;
              });
          } else {
            // Buffer not ready yet, wait a bit more
            setTimeout(waitAndPlay, 200);
          }
        };
        
        // Start waiting after a short delay to let buffer start filling
        setTimeout(waitAndPlay, 500);
      } else if (audioRef.current) {
        // For native HLS (Safari), seek to live
        if (audioRef.current.buffered.length > 0) {
          const bufferedEnd = audioRef.current.buffered.end(audioRef.current.buffered.length - 1);
          audioRef.current.currentTime = bufferedEnd;
        }
        
        await audioRef.current.play();
        setIsPlaying(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error playing HLS stream:", error);
      setError("Failed to play stream");
      setIsPlaying(false);
      setIsLoading(false);
      const playingRef = (audioRef.current as any).__playingRef;
      if (playingRef) playingRef.current = false;
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      
      // Update playing ref
      const playingRef = (audioRef.current as any).__playingRef;
      if (playingRef) playingRef.current = false;
    }
    // Stop loading the stream when paused to save bandwidth
    if (hlsRef.current) {
      hlsRef.current.stopLoad();
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
    isReady,
    play,
    pause,
    togglePlayPause,
    retry,
  };
}

