import { useCallback, useRef } from "react";
import { RateLimiter } from "@tanstack/react-pacer";

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

/**
 * Hook to create a rate-limited version of any async function
 * Uses TanStack Pacer's RateLimiter for client-side protection
 */
export function useRateLimitedMutation<TArgs extends unknown[], TResult>(
  mutationFn: (...args: TArgs) => Promise<TResult>,
  type: RateLimitType = "default"
) {
  const config = RATE_LIMITS[type];
  
  const rateLimiterRef = useRef(
    new RateLimiter<TArgs, TResult>(
      async (...args: TArgs) => mutationFn(...args),
      {
        limit: config.limit,
        window: config.window,
        onReject: () => {
          throw new Error(`Rate limit exceeded. Please wait before trying again.`);
        },
      }
    )
  );

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult> => {
      return rateLimiterRef.current.maybeExecute(...args) as Promise<TResult>;
    },
    []
  );

  return {
    execute,
    getRemainingInWindow: () => rateLimiterRef.current.getRemainingInWindow(),
    getMsUntilNextWindow: () => rateLimiterRef.current.getMsUntilNextWindow(),
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

