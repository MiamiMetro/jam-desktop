import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// ============================================
// Input Validation Constants & Utilities
// ============================================

/** Maximum lengths for user-generated content */
export const MAX_LENGTHS = {
  POST_TEXT: 5000,
  COMMENT_TEXT: 2000,
  MESSAGE_TEXT: 300,
  USERNAME: 15, // Like Twitter/X
  DISPLAY_NAME: 50,
  BIO: 500,
  URL: 2048,
} as const;

/** Minimum lengths for user-generated content */
export const MIN_LENGTHS = {
  USERNAME: 3,
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
 * Validate username:
 * - Length: 3-15 characters (same as Twitter/X)
 * - Allowed: letters (a-z, A-Z), numbers (0-9), underscores (_)
 * - Must start with a letter or number (not underscore)
 * - Case insensitive (stored as lowercase for consistency)
 *
 * This prevents:
 * - URL slug issues (safe for jam.com/username)
 * - Impersonation with Unicode lookalikes
 * - XSS attacks with special characters
 * - Confusion with spaces or special symbols
 */
export function validateUsername(username: string | undefined): void {
  if (!username) {
    throw new Error("USERNAME_REQUIRED: Username is required");
  }

  const trimmed = username.trim();

  if (trimmed.length < MIN_LENGTHS.USERNAME) {
    throw new Error(`USERNAME_TOO_SHORT: Username must be at least ${MIN_LENGTHS.USERNAME} characters`);
  }

  if (trimmed.length > MAX_LENGTHS.USERNAME) {
    throw new Error(`USERNAME_TOO_LONG: Username exceeds maximum length of ${MAX_LENGTHS.USERNAME} characters`);
  }

  // Only allow letters, numbers, and underscores (like Twitter)
  // Must start with letter or number (not underscore)
  const usernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_]*$/;

  if (!usernameRegex.test(trimmed)) {
    throw new Error(
      "USERNAME_INVALID_CHARS: Username can only contain letters, numbers, and underscores, and must start with a letter or number"
    );
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
 * Get the current user's profile from their auth identity in the auth token
 * Returns null if not authenticated or profile doesn't exist
 */
export async function getCurrentProfile(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const authIssuer = identity.issuer;
  const authSubject = identity.subject;

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_auth_identity", (q) =>
      q.eq("authIssuer", authIssuer).eq("authSubject", authSubject)
    )
    .first();

  return profile;
}

/**
 * Get the current user's profile, throwing an error if not authenticated
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("NOT_AUTHENTICATED: You must be signed in");
  }
  const profile = await getCurrentProfile(ctx);
  if (!profile) {
    throw new Error("PROFILE_REQUIRED: You must create a profile before performing this action");
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
 * OPTIMIZED: Only queries one direction thanks to bidirectional records!
 */
export async function areFriends(
  ctx: QueryCtx | MutationCtx,
  userId1: Id<"profiles">,
  userId2: Id<"profiles">
): Promise<boolean> {
  // With bidirectional records, we only need to check one direction
  const friendship = await ctx.db
    .query("friends")
    .withIndex("by_user_and_friend", (q) =>
      q.eq("userId", userId1).eq("friendId", userId2)
    )
    .first();

  return friendship?.status === "accepted";
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

