import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { 
  getViewer,
  requireViewer,
  requireViewerWithProfile,
  createAccountIfNeeded,
  formatProfile,
  validateTextLength,
  validateUrl,
  sanitizeText,
  MAX_LENGTHS,
} from "./helpers";

/**
 * Get the current user's profile
 * Equivalent to GET /profiles/me and GET /auth/me
 */
export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer || !viewer.profile) {
      return null;
    }
    return formatProfile(viewer.profile);
  },
});

/**
 * Get the current user's account info (for onboarding check)
 */
export const getMyAccount = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return null;
    }
    return {
      accountId: viewer.account._id,
      hasProfile: !!viewer.profile,
      profile: viewer.profile ? formatProfile(viewer.profile) : null,
    };
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
    const { profile } = await requireViewerWithProfile(ctx);

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
    if (username && username.toLowerCase() !== profile.usernameLower) {
      const existing = await ctx.db
        .query("profiles")
        .withIndex("by_usernameLower", (q) => q.eq("usernameLower", username.toLowerCase()))
        .first();

      if (existing) {
        throw new Error("Username already taken");
      }
    }

    // Build update object
    const updates: Partial<{
      username: string;
      usernameLower: string;
      displayName: string;
      avatarUrl: string;
      bio: string;
      dmPrivacy: "friends" | "everyone";
    }> = {};

    if (username !== undefined) {
      updates.username = username;
      updates.usernameLower = username.toLowerCase();
    }
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
      .withIndex("by_usernameLower", (q) => q.eq("usernameLower", args.username.toLowerCase()))
      .first();

    if (!profile) {
      return null;
    }

    return formatProfile(profile);
  },
});

/**
 * Ensure account exists (called on first login)
 * Creates account and authAccounts if not exists
 * Returns account info for frontend to determine if onboarding is needed
 */
export const ensureAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const account = await createAccountIfNeeded(ctx);
    
    // Check if profile exists
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_accountId", (q) => q.eq("accountId", account._id))
      .first();

    return {
      accountId: account._id,
      hasProfile: !!profile,
      profile: profile ? formatProfile(profile) : null,
    };
  },
});

/**
 * Create a profile for the current account (during onboarding)
 */
export const createProfile = mutation({
  args: {
    username: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { account } = await requireViewer(ctx);

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

    // Check if profile already exists for this account
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_accountId", (q) => q.eq("accountId", account._id))
      .first();

    if (existing) {
      throw new Error("Profile already exists for this account");
    }

    // Check username uniqueness
    const usernameExists = await ctx.db
      .query("profiles")
      .withIndex("by_usernameLower", (q) => q.eq("usernameLower", username.toLowerCase()))
      .first();

    if (usernameExists) {
      throw new Error("Username already taken");
    }

    // Create the profile
    const profileId = await ctx.db.insert("profiles", {
      accountId: account._id,
      username: username,
      usernameLower: username.toLowerCase(),
      displayName: displayName ?? username,
      avatarUrl: avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      bio: "",
      dmPrivacy: "friends",
      isOnboarded: true,
      friendCount: 0,
      postCount: 0,
    });

    const profile = await ctx.db.get(profileId);
    if (!profile) {
      throw new Error("Failed to create profile");
    }

    return formatProfile(profile);
  },
});

/**
 * Check if a username is available
 */
export const checkUsername = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const username = args.username.trim();
    
    if (!username) {
      return { available: false, reason: "Username is required" };
    }

    if (username.length > MAX_LENGTHS.USERNAME) {
      return { available: false, reason: `Username must be ${MAX_LENGTHS.USERNAME} characters or less` };
    }

    // Check for valid characters (alphanumeric, underscores, periods)
    if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
      return { available: false, reason: "Username can only contain letters, numbers, underscores, and periods" };
    }

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_usernameLower", (q) => q.eq("usernameLower", username.toLowerCase()))
      .first();

    if (existing) {
      return { available: false, reason: "Username already taken" };
    }

    return { available: true, reason: null };
  },
});
