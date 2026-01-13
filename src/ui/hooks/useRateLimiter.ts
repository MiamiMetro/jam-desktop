import { useCallback, useRef } from "react";

/**
 * Rate limiting configurations for different action types
 */
const RATE_LIMITS = {
  // Posts: max 5 per minute
  createPost: { limit: 5, window: 60000 },
  // Comments: max 10 per minute
  createComment: { limit: 10, window: 60000 },
  // Likes: max 30 per minute (allow rapid liking/unliking)
  toggleLike: { limit: 30, window: 60000 },
  // Friend requests: max 10 per minute
  friendRequest: { limit: 10, window: 60000 },
  // Messages: max 30 per minute
  sendMessage: { limit: 30, window: 60000 },
  // General mutations: max 20 per minute
  default: { limit: 20, window: 60000 },
} as const;

type RateLimitType = keyof typeof RATE_LIMITS;

interface RateLimitState {
  timestamps: number[];
  limit: number;
  window: number;
}

/**
 * Hook to create a rate-limited version of any async function
 * Simple client-side rate limiting using sliding window
 */
export function useRateLimitedMutation<TArgs extends unknown[], TResult>(
  mutationFn: (...args: TArgs) => Promise<TResult>,
  type: RateLimitType = "default"
) {
  const config = RATE_LIMITS[type];
  
  const stateRef = useRef<RateLimitState>({
    timestamps: [],
    limit: config.limit,
    window: config.window,
  });

  const cleanOldTimestamps = useCallback(() => {
    const now = Date.now();
    const { window } = stateRef.current;
    stateRef.current.timestamps = stateRef.current.timestamps.filter(
      (ts) => now - ts < window
    );
  }, []);

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult> => {
      cleanOldTimestamps();
      
      const { timestamps, limit } = stateRef.current;
      
      if (timestamps.length >= limit) {
        throw new Error(`Rate limit exceeded. Please wait before trying again.`);
      }
      
      stateRef.current.timestamps.push(Date.now());
      return mutationFn(...args);
    },
    [mutationFn, cleanOldTimestamps]
  );

  const getRemainingInWindow = useCallback(() => {
    cleanOldTimestamps();
    return stateRef.current.limit - stateRef.current.timestamps.length;
  }, [cleanOldTimestamps]);

  const getMsUntilNextWindow = useCallback(() => {
    cleanOldTimestamps();
    const { timestamps, window } = stateRef.current;
    if (timestamps.length === 0) return 0;
    const oldestTimestamp = Math.min(...timestamps);
    return Math.max(0, window - (Date.now() - oldestTimestamp));
  }, [cleanOldTimestamps]);

  return {
    execute,
    getRemainingInWindow,
    getMsUntilNextWindow,
  };
}

/**
 * Simple throttle hook for UI actions (like button clicks)
 * Prevents rapid repeated clicks
 */
export function useThrottledAction(
  action: () => void,
  delayMs: number = 300
): () => void {
  const lastCallRef = useRef<number>(0);
  const actionRef = useRef(action);
  actionRef.current = action;

  return useCallback(() => {
    const now = Date.now();
    if (now - lastCallRef.current >= delayMs) {
      lastCallRef.current = now;
      actionRef.current();
    }
  }, [delayMs]);
}

