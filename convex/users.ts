import { query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentProfile } from "./helpers";

/**
 * Search/get all users
 * Equivalent to GET /users
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
    const currentProfile = await getCurrentProfile(ctx);

    // Get all profiles
    let profiles = await ctx.db.query("profiles").order("desc").collect();

    // Exclude current user if authenticated
    if (currentProfile) {
      profiles = profiles.filter((p) => p._id !== currentProfile._id);
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

    const data = dataProfiles.map((user) => ({
      id: user._id,
      username: user.username,
      display_name: user.displayName ?? "",
      avatar_url: user.avatarUrl ?? "",
      status: "offline", // TODO: Implement online status tracking
      statusMessage: "",
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
 * Get online users
 * Equivalent to GET /users/online
 * Supports cursor-based pagination
 * Note: This is a placeholder - real online status requires presence tracking
 */
export const getOnline = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("profiles")),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const currentProfile = await getCurrentProfile(ctx);

    // Get all profiles (placeholder - in reality would filter by online status)
    let profiles = await ctx.db.query("profiles").order("desc").collect();

    // Exclude current user if authenticated
    if (currentProfile) {
      profiles = profiles.filter((p) => p._id !== currentProfile._id);
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

    const data = dataProfiles.map((user) => ({
      id: user._id,
      username: user.username,
      display_name: user.displayName ?? "",
      avatar_url: user.avatarUrl ?? "",
      status: "online", // Placeholder - will be implemented with presence
      statusMessage: "",
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

