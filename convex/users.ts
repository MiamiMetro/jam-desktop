import { query } from "./_generated/server";
import { v } from "convex/values";
import { getViewer, getRelationship } from "./helpers";

/**
 * Search users by username or display name
 * Supports cursor-based pagination
 */
export const search = query({
  args: {
    limit: v.optional(v.number()),
    search: v.optional(v.string()),
    cursor: v.optional(v.id("profiles")),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const viewer = await getViewer(ctx);

    // Get all profiles
    let profiles = await ctx.db.query("profiles").order("desc").collect();

    // Exclude current user if authenticated
    if (viewer?.account) {
      profiles = profiles.filter((p) => p.accountId !== viewer.account._id);
    }

    // Apply search filter if provided
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      profiles = profiles.filter(
        (p) =>
          p.username.toLowerCase().includes(searchLower) ||
          (p.displayName?.toLowerCase().includes(searchLower) ?? false)
      );
    }

    // Apply cursor pagination
    let startIndex = 0;
    if (args.cursor) {
      const cursorIndex = profiles.findIndex((p) => p._id === args.cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const paginatedProfiles = profiles.slice(startIndex, startIndex + limit + 1);
    const hasMore = paginatedProfiles.length > limit;
    const dataProfiles = paginatedProfiles.slice(0, limit);

    const data = dataProfiles.map((profile) => ({
      id: profile._id,
      account_id: profile.accountId,
      username: profile.username,
      display_name: profile.displayName ?? "",
      avatar_url: profile.avatarUrl ?? "",
      bio: profile.bio ?? "",
      friend_count: profile.friendCount,
      post_count: profile.postCount,
    }));

    return {
      data,
      hasMore,
      total: profiles.length,
      nextCursor: hasMore && dataProfiles.length > 0 
        ? dataProfiles[dataProfiles.length - 1]._id 
        : null,
    };
  },
});

/**
 * Get user profile with relationship info
 */
export const getProfile = query({
  args: {
    accountId: v.optional(v.id("accounts")),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let profile;

    if (args.accountId) {
      profile = await ctx.db
        .query("profiles")
        .withIndex("by_accountId", (q) => q.eq("accountId", args.accountId!))
        .first();
    } else if (args.username) {
      profile = await ctx.db
        .query("profiles")
        .withIndex("by_usernameLower", (q) => q.eq("usernameLower", args.username!.toLowerCase()))
        .first();
    } else {
      throw new Error("Must provide either accountId or username");
    }

    if (!profile) {
      return null;
    }

    const viewer = await getViewer(ctx);
    let relationship = null;

    if (viewer?.account && viewer.account._id !== profile.accountId) {
      relationship = await getRelationship(ctx, viewer.account._id, profile.accountId);
    }

    return {
      id: profile._id,
      account_id: profile.accountId,
      username: profile.username,
      display_name: profile.displayName ?? "",
      avatar_url: profile.avatarUrl ?? "",
      bio: profile.bio ?? "",
      is_private: profile.isPrivate ?? false,
      friend_count: profile.friendCount,
      post_count: profile.postCount,
      created_at: new Date(profile._creationTime).toISOString(),
      relationship: relationship
        ? {
            is_friend: relationship.isFriend,
            has_pending_request: relationship.hasPendingRequest,
            has_received_request: relationship.hasReceivedRequest,
            is_blocked: relationship.isBlockedEitherWay,
          }
        : null,
      is_self: viewer?.account._id === profile.accountId,
    };
  },
});

/**
 * Get online users (placeholder - would need presence system)
 */
export const getOnline = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("profiles")),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const viewer = await getViewer(ctx);

    // Placeholder: In reality, this would filter by online status from a presence system
    let profiles = await ctx.db.query("profiles").order("desc").collect();

    // Exclude current user if authenticated
    if (viewer?.account) {
      profiles = profiles.filter((p) => p.accountId !== viewer.account._id);
    }

    // Apply cursor pagination
    let startIndex = 0;
    if (args.cursor) {
      const cursorIndex = profiles.findIndex((p) => p._id === args.cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const paginatedProfiles = profiles.slice(startIndex, startIndex + limit + 1);
    const hasMore = paginatedProfiles.length > limit;
    const dataProfiles = paginatedProfiles.slice(0, limit);

    const data = dataProfiles.map((profile) => ({
      id: profile._id,
      account_id: profile.accountId,
      username: profile.username,
      display_name: profile.displayName ?? "",
      avatar_url: profile.avatarUrl ?? "",
      status: "online", // Placeholder
    }));

    return {
      data,
      hasMore,
      total: profiles.length,
      nextCursor: hasMore && dataProfiles.length > 0 
        ? dataProfiles[dataProfiles.length - 1]._id 
        : null,
    };
  },
});
