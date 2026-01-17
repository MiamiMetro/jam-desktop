import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// ============================================
// Input Validation Constants & Utilities
// ============================================

/** Maximum lengths for user-generated content */
export const MAX_LENGTHS = {
  POST_TEXT: 5000,
  COMMENT_TEXT: 2000,
  MESSAGE_TEXT: 2000,
  USERNAME: 30,
  DISPLAY_NAME: 50,
  BIO: 500,
  URL: 2048,
} as const;

/**
 * Validate text length and throw if exceeded
 */
export function validateTextLength(
  text: string | undefined,
  maxLength: number,
  fieldName: string
): void {
  if (text && text.length > maxLength) {
    throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters`);
  }
}

/**
 * Validate URL format (basic check)
 */
export function validateUrl(url: string | undefined): void {
  if (!url) return;
  if (url.length > MAX_LENGTHS.URL) {
    throw new Error(`URL exceeds maximum length of ${MAX_LENGTHS.URL} characters`);
  }
  // Basic URL format check
  try {
    new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }
}

/**
 * Sanitize text by trimming whitespace
 */
export function sanitizeText(text: string | undefined): string | undefined {
  return text?.trim();
}

// ============================================
// Authentication Helpers
// ============================================

/**
 * Get the current user's profile from their auth user ID in the auth token
 * Returns null if not authenticated or profile doesn't exist
 */
export async function getCurrentProfile(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  // The subject (sub) claim contains the auth user ID
  const authUserId = identity.subject;

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUserId))
    .first();

  return profile;
}

/**
 * Get the current user's profile, throwing an error if not authenticated
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const profile = await getCurrentProfile(ctx);
  if (!profile) {
    throw new Error("Not authenticated");
  }
  return profile;
}

/**
 * Check if there's a block between two users (in either direction)
 */
export async function isBlocked(
  ctx: QueryCtx | MutationCtx,
  userId1: Id<"profiles">,
  userId2: Id<"profiles">
): Promise<boolean> {
  // Check if user1 blocked user2
  const block1 = await ctx.db
    .query("blocks")
    .withIndex("by_blocker_and_blocked", (q) =>
      q.eq("blockerId", userId1).eq("blockedId", userId2)
    )
    .first();

  if (block1) return true;

  // Check if user2 blocked user1
  const block2 = await ctx.db
    .query("blocks")
    .withIndex("by_blocker_and_blocked", (q) =>
      q.eq("blockerId", userId2).eq("blockedId", userId1)
    )
    .first();

  return !!block2;
}

/**
 * Check if two users are friends (accepted status)
 */
export async function areFriends(
  ctx: QueryCtx | MutationCtx,
  userId1: Id<"profiles">,
  userId2: Id<"profiles">
): Promise<boolean> {
  // Check friendship in both directions
  const friendship1 = await ctx.db
    .query("friends")
    .withIndex("by_user_and_friend", (q) =>
      q.eq("userId", userId1).eq("friendId", userId2)
    )
    .first();

  if (friendship1?.status === "accepted") return true;

  const friendship2 = await ctx.db
    .query("friends")
    .withIndex("by_user_and_friend", (q) =>
      q.eq("userId", userId2).eq("friendId", userId1)
    )
    .first();

  return friendship2?.status === "accepted";
}

/**
 * Format profile for API response
 */
export function formatProfile(profile: {
  _id: Id<"profiles">;
  _creationTime: number;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}) {
  return {
    id: profile._id,
    username: profile.username,
    display_name: profile.displayName ?? "",
    avatar_url: profile.avatarUrl ?? "",
    bio: profile.bio ?? "",
    created_at: new Date(profile._creationTime).toISOString(),
  };
}

