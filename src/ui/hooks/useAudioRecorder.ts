import { useState, useRef, useCallback } from "react";

export interface RecordedAudio {
  blob: Blob;
  url: string;
  duration: number;
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<RecordedAudio | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Try to find a supported MIME type
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        mimeType = "audio/ogg;codecs=opus";
      }
      
      const options: MediaRecorderOptions = { mimeType };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blobType = mediaRecorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Create audio element to get duration
        const audio = new Audio(audioUrl);
        
        const handleLoadedMetadata = () => {
          if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
            setRecordedAudio({
              blob: audioBlob,
              url: audioUrl,
              duration: Math.round(audio.duration),
            });
          } else {
            // Fallback to recording time
            const fallbackDuration = Math.round((Date.now() - startTimeRef.current) / 1000);
            setRecordedAudio({
              blob: audioBlob,
              url: audioUrl,
              duration: fallbackDuration,
            });
          }
          audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
          audio.removeEventListener("error", handleError);
          audio.removeEventListener("canplay", handleCanPlay);
        };
        
        const handleError = (e: ErrorEvent) => {
          console.error("Error loading recorded audio metadata:", e);
          // Use recording time as fallback duration
          const fallbackDuration = Math.round((Date.now() - startTimeRef.current) / 1000);
          setRecordedAudio({
            blob: audioBlob,
            url: audioUrl,
            duration: fallbackDuration,
          });
          audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
          audio.removeEventListener("error", handleError);
          audio.removeEventListener("canplay", handleCanPlay);
        };
        
        const handleCanPlay = () => {
          // Audio is ready, try to get duration
          if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
            setRecordedAudio({
              blob: audioBlob,
              url: audioUrl,
              duration: Math.round(audio.duration),
            });
            audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
            audio.removeEventListener("error", handleError);
            audio.removeEventListener("canplay", handleCanPlay);
          }
        };
        
        audio.addEventListener("loadedmetadata", handleLoadedMetadata);
        audio.addEventListener("error", handleError);
        audio.addEventListener("canplay", handleCanPlay);
        
        // Try to load to trigger metadata
        try {
          const loadResult = audio.load();
          if (loadResult && typeof loadResult.catch === 'function') {
            loadResult.catch((err: Error) => {
              console.error("Error loading audio:", err);
            });
          }
        } catch (err) {
          console.error("Error loading audio:", err);
        }
        
        // Timeout fallback
        setTimeout(() => {
          const fallbackDuration = Math.round((Date.now() - startTimeRef.current) / 1000);
          setRecordedAudio((prev) => {
            if (!prev) {
              return {
                blob: audioBlob,
                url: audioUrl,
                duration: fallbackDuration,
              };
            }
            return prev;
          });
        }, 1000);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      startTimeRef.current = Date.now();
      
      // Update timer every 100ms
      timerRef.current = window.setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Failed to access microphone. Please check permissions.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const deleteRecording = useCallback(() => {
    if (recordedAudio) {
      URL.revokeObjectURL(recordedAudio.url);
      setRecordedAudio(null);
    }
    setRecordingTime(0);
    
    // Clean up any ongoing recording
    if (isRecording) {
      stopRecording();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [recordedAudio, isRecording, stopRecording]);

  const getAudioFile = useCallback((): File | null => {
    if (!recordedAudio) return null;
    
    // Convert blob to File
    const file = new File([recordedAudio.blob], `recording-${Date.now()}.webm`, {
      type: "audio/webm",
    });
    
    return file;
  }, [recordedAudio]);

  return {
    isRecording,
    recordedAudio,
    recordingTime,
    startRecording,
    stopRecording,
    deleteRecording,
    getAudioFile,
  };
}

