import { useCallback, useEffect, useRef } from "react";
import { useConvex, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/stores/authStore";
import { useConvexAuthStore } from "@/hooks/useConvexAuth";
import { useProfileStore } from "@/hooks/useEnsureProfile";
import { usePresenceStore } from "@/stores/presenceStore";

const HEARTBEAT_INTERVAL_MS = 20_000;

export function usePresenceHeartbeat() {
  const convex = useConvex();
  const heartbeat = useMutation(api.presence.heartbeat);
  const disconnect = useMutation(api.presence.disconnect);
  const { isGuest, user } = useAuthStore();
  const { isAuthSet } = useConvexAuthStore();
  const { isProfileReady } = useProfileStore();
  const currentStatus = usePresenceStore((state) => state.currentStatus);
  const setRoomToken = usePresenceStore((state) => state.setRoomToken);

  const shouldRun = !isGuest && isAuthSet && isProfileReady;
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const sessionTokenRef = useRef<string | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const currentStatusRef = useRef(currentStatus);

  useEffect(() => {
    currentStatusRef.current = currentStatus;
  }, [currentStatus]);

  const clearHeartbeatInterval = useCallback(() => {
    if (heartbeatIntervalRef.current !== null) {
      window.clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const stopSession = useCallback(async () => {
    clearHeartbeatInterval();
    if (sessionTokenRef.current) {
      try {
        await disconnect({ sessionToken: sessionTokenRef.current });
      } catch (error) {
        console.error("Failed to disconnect presence session:", error);
      }
      sessionTokenRef.current = null;
      setRoomToken(null);
      window.electron?.setPresenceSessionState?.({
        sessionToken: null,
        convexUrl: convex.url,
      });
    }
    sessionIdRef.current = crypto.randomUUID();
  }, [clearHeartbeatInterval, convex.url, disconnect, setRoomToken]);

  useEffect(() => {
    if (!shouldRun) {
      void stopSession();
      return;
    }

    let cancelled = false;

    const sendHeartbeat = async () => {
      try {
        const result = await heartbeat({
          sessionId: sessionIdRef.current,
          interval: HEARTBEAT_INTERVAL_MS,
          status: currentStatusRef.current,
        });
        if (!cancelled) {
          sessionTokenRef.current = result.sessionToken;
          setRoomToken(result.roomToken);
          window.electron?.setPresenceSessionState?.({
            sessionToken: result.sessionToken,
            convexUrl: convex.url,
          });
        }
      } catch (error) {
        console.error("Presence heartbeat failed:", error);
      }
    };

    const handleUnload = () => {
      if (!sessionTokenRef.current) return;
      const blob = new Blob(
        [
          JSON.stringify({
            path: "presence:disconnect",
            args: { sessionToken: sessionTokenRef.current },
          }),
        ],
        { type: "application/json" }
      );
      navigator.sendBeacon(`${convex.url}/api/mutation`, blob);
    };

    void sendHeartbeat();
    clearHeartbeatInterval();
    heartbeatIntervalRef.current = window.setInterval(() => {
      void sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      cancelled = true;
      window.removeEventListener("beforeunload", handleUnload);
      void stopSession();
    };
  }, [
    clearHeartbeatInterval,
    convex.url,
    heartbeat,
    setRoomToken,
    shouldRun,
    stopSession,
    user?.id,
  ]);
}
