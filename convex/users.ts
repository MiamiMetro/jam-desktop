import { query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { getCurrentProfile } from "./helpers";

/**
 * Search users using native Convex pagination.
 * This is the preferred endpoint for Convex-first frontend pagination.
 * Uses index-backed username search and avoids fallback table scans.
 */
export const searchPaginated = query({
  args: {
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const currentProfile = await getCurrentProfile(ctx);
    const trimmedSearch = args.search?.trim();

    const result = trimmedSearch
      ? await ctx.db
          .query("profiles")
          .withSearchIndex("search_profiles", (q) =>
            q.search("username", trimmedSearch)
          )
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("profiles")
          .order("desc")
          .paginate(args.paginationOpts);

    const page = result.page
      .filter((user) => !currentProfile || user._id !== currentProfile._id)
      .map((user) => ({
        id: user._id,
        username: user.username,
        display_name: user.displayName ?? "",
        avatar_url: user.avatarUrl ?? "",
        status: "offline",
        statusMessage: "",
      }));

    return {
      ...result,
      page,
    };
  },
});

/**
 * Get online users
 * Equivalent to GET /users/online
 * Supports cursor-based pagination using Convex .paginate()
 * Note: This is a placeholder - real online status requires presence tracking
 */
export const getOnline = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const currentProfile = await getCurrentProfile(ctx);

    // Use Convex's built-in pagination for efficient querying
    // Note: This is a placeholder - in reality would filter by online status
    const result = await ctx.db
      .query("profiles")
      .order("desc")
      .paginate(args.paginationOpts);

    // Exclude current user if authenticated and map to response format
    const data = result.page
      .filter((p) => !currentProfile || p._id !== currentProfile._id)
      .map((user) => ({
        id: user._id,
        username: user.username,
        display_name: user.displayName ?? "",
        avatar_url: user.avatarUrl ?? "",
        status: "online", // Placeholder - will be implemented with presence
        statusMessage: "",
      }));

    return {
      ...result,
      page: data,
    };
  },
});

