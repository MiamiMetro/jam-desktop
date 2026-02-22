import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";

/**
 * Server-side rate limiter for Convex mutations
 * This provides security against abuse that client-side rate limiting cannot.
 * 
 * Rate limits are enforced per-user (by profile ID) or per-IP for unauthenticated requests.
 */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Posts: 5 per minute with burst of 2
  createPost: { 
    kind: "token bucket", 
    rate: 5, 
    period: MINUTE, 
    capacity: 2 
  },
  
  // Comments: 10 per minute with burst of 3
  createComment: { 
    kind: "token bucket", 
    rate: 10, 
    period: MINUTE, 
    capacity: 3 
  },
  
  // Replies: 10 per minute with burst of 3
  replyToComment: { 
    kind: "token bucket", 
    rate: 10, 
    period: MINUTE, 
    capacity: 3 
  },
  
  // Likes: 30 per minute with burst of 10 (allow rapid liking)
  toggleLike: { 
    kind: "token bucket", 
    rate: 30, 
    period: MINUTE, 
    capacity: 10 
  },
  
  // Friend requests: 10 per minute with burst of 3
  friendRequest: { 
    kind: "token bucket", 
    rate: 10, 
    period: MINUTE, 
    capacity: 3 
  },
  
  // Messages: 30 per minute with burst of 5
  sendMessage: { 
    kind: "token bucket", 
    rate: 30, 
    period: MINUTE, 
    capacity: 5 
  },
  
  // Profile updates: 5 per minute
  updateProfile: { 
    kind: "token bucket", 
    rate: 5, 
    period: MINUTE, 
    capacity: 2 
  },
  
  // Delete operations: 10 per minute
  deleteAction: { 
    kind: "token bucket", 
    rate: 10, 
    period: MINUTE, 
    capacity: 3 
  },
  
  // Block/unblock: 10 per minute
  blockAction: { 
    kind: "token bucket", 
    rate: 10, 
    period: MINUTE, 
    capacity: 3 
  },
  
  // Profile creation: 3 per minute (strict - should only need 1)
  createProfile: {
    kind: "token bucket",
    rate: 3,
    period: MINUTE,
    capacity: 1
  },

  // General fallback: 20 per minute
  general: {
    kind: "token bucket",
    rate: 20,
    period: MINUTE,
    capacity: 5
  },
});

/**
 * Rate limit types for type-safe usage
 */
export type RateLimitName =
  | "createPost"
  | "createComment"
  | "replyToComment"
  | "toggleLike"
  | "friendRequest"
  | "sendMessage"
  | "updateProfile"
  | "deleteAction"
  | "blockAction"
  | "createProfile"
  | "general";

/**
 * Helper to check rate limit and throw a user-friendly error
 */
export async function checkRateLimit(
  ctx: MutationCtx,
  name: RateLimitName,
  key: string
): Promise<void> {
  const result = await rateLimiter.limit(ctx, name, { key });
  
  if (!result.ok) {
    const waitSeconds = result.retryAfter 
      ? Math.ceil(result.retryAfter / 1000)
      : 60;
    
    throw new Error(
      `Rate limit exceeded. Please wait ${waitSeconds} seconds before trying again.`
    );
  }
}

