import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  getCurrentProfile,
  requireAuth,
  formatProfile,
  validateTextLength,
  validateUrl,
  sanitizeText,
  MAX_LENGTHS,
} from "./helpers";

/**
 * Check if a username is available
 * Used during registration to validate username before creating auth account
 * Rate limited: 10 requests per minute per IP
 */
export const checkUsernameAvailability = mutation({
  args: {
    username: v.string(),
    clientId: v.optional(v.string()), // Optional client identifier (IP, session ID, etc.)
  },
  handler: async (ctx, { username, clientId }) => {

    // Sanitize input
    const sanitized = sanitizeText(username);

    if (!sanitized) {
      return { available: false, error: "Username is required" };
    }

    // Validate length
    try {
      validateTextLength(sanitized, MAX_LENGTHS.USERNAME, "Username");
    } catch (error: any) {
      return { available: false, error: error.message };
    }

    // Check if username exists
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", sanitized))
      .first();

    if (existing) {
      return { available: false, error: "Username already taken" };
    }

    return { available: true, remaining: rateCheck.remaining };
  },
});

/**
 * Get the current user's profile
 * Equivalent to GET /profiles/me and GET /auth/me
 */
export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const profile = await getCurrentProfile(ctx);
    if (!profile) {
      return null;
    }
    return formatProfile(profile);
  },
});

/**
 * Update the current user's profile
 * Equivalent to PATCH /profiles/me
 */
export const updateMe = mutation({
  args: {
    username: v.optional(v.string()),
    display_name: v.optional(v.string()),
    avatar_url: v.optional(v.string()),
    bio: v.optional(v.string()),
    dm_privacy: v.optional(v.union(v.literal("friends"), v.literal("everyone"))),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);

    // Sanitize and validate inputs
    const username = sanitizeText(args.username);
    const displayName = sanitizeText(args.display_name);
    const avatarUrl = args.avatar_url;
    const bio = sanitizeText(args.bio);

    validateTextLength(username, MAX_LENGTHS.USERNAME, "Username");
    validateTextLength(displayName, MAX_LENGTHS.DISPLAY_NAME, "Display name");
    validateTextLength(bio, MAX_LENGTHS.BIO, "Bio");
    validateUrl(avatarUrl);

    // If username is being changed, check uniqueness
    if (username && username !== profile.username) {
      const existing = await ctx.db
        .query("profiles")
        .withIndex("by_username", (q) => q.eq("username", username))
        .first();

      if (existing) {
        throw new Error("Username already taken");
      }
    }

    // Build update object
    const updates: Partial<{
      username: string;
      displayName: string;
      avatarUrl: string;
      bio: string;
      dmPrivacy: "friends" | "everyone";
    }> = {};

    if (username !== undefined) updates.username = username;
    if (displayName !== undefined) updates.displayName = displayName;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (bio !== undefined) updates.bio = bio;
    if (args.dm_privacy !== undefined) updates.dmPrivacy = args.dm_privacy;

    await ctx.db.patch(profile._id, updates);

    // Return updated profile
    const updated = await ctx.db.get(profile._id);
    if (!updated) {
      throw new Error("Failed to update profile");
    }
    return formatProfile(updated);
  },
});

/**
 * Get a profile by username (public)
 * Equivalent to GET /profiles/:username
 */
export const getByUsername = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (!profile) {
      return null;
    }

    return formatProfile(profile);
  },
});

/**
 * Create a new profile for an authenticated user
 * Called after Better Auth registration
 * Rate limited: 3 requests per minute per user
 */
export const createProfile = mutation({
  args: {
    username: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Rate limit profile creation to prevent abuse
    const rateCheck = await checkRateLimit(ctx, identity.subject, "create_profile");
    if (!rateCheck.allowed) {
      const resetIn = rateCheck.resetAt ? Math.ceil((rateCheck.resetAt - Date.now()) / 1000) : 60;
      throw new Error(`Too many profile creation attempts. Please try again in ${resetIn} seconds.`);
    }

    // Increment rate limit counter
    await incrementRateLimit(ctx, identity.subject, "create_profile");

    // Sanitize and validate inputs
    const username = sanitizeText(args.username);
    const displayName = sanitizeText(args.displayName);
    const avatarUrl = args.avatarUrl;

    if (!username) {
      throw new Error("Username is required");
    }

    validateTextLength(username, MAX_LENGTHS.USERNAME, "Username");
    validateTextLength(displayName, MAX_LENGTHS.DISPLAY_NAME, "Display name");
    validateUrl(avatarUrl);

    // Check if profile already exists for this auth identity
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_auth_identity", (q) =>
        q.eq("authIssuer", identity.issuer).eq("authSubject", identity.subject)
      )
      .first();

    if (existing) {
      throw new Error("Profile already exists for this user");
    }

    // Check username uniqueness (CRITICAL: Server-side validation cannot be bypassed)
    const usernameExists = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();

    if (usernameExists) {
      throw new Error("Username already taken");
    }

    // Create the profile
    const profileId = await ctx.db.insert("profiles", {
      authIssuer: identity.issuer,
      authSubject: identity.subject,
      username: username,
      displayName: displayName ?? username,
      avatarUrl: avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      bio: "",
      dmPrivacy: "friends",
    });

    const profile = await ctx.db.get(profileId);
    if (!profile) {
      throw new Error("Failed to create profile");
    }

    return formatProfile(profile);
  },
});

