import { query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
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

    // For search queries, we need to filter in-memory. Instead of fetching a single
    // large batch (which can be inefficient), we iteratively fetch smaller batches
    // until we have enough matching results or run out of data.

    let profiles: Doc<"profiles">[] = [];
    let hasMore = false;

    if (!args.search) {
      // Non-search queries: use efficient cursor-based pagination with a single fetch
      const fetchSize = limit + 1;

      if (args.cursor) {
        // Get the cursor profile to find its creation time
        const cursorProfile = await ctx.db.get(args.cursor);
        if (cursorProfile) {
          // Get profiles older than the cursor
          profiles = await ctx.db
            .query("profiles")
            .order("desc")
            .filter((q) => q.lt(q.field("_creationTime"), cursorProfile._creationTime))
            .take(fetchSize);
        } else {
          profiles = [];
        }
      } else {
        // First page - no cursor
        profiles = await ctx.db
          .query("profiles")
          .order("desc")
          .take(fetchSize);
      }

      // Exclude current user if authenticated
      if (currentProfile) {
        profiles = profiles.filter((p) => p._id !== currentProfile._id);
      }

      hasMore = profiles.length > limit;
      profiles = profiles.slice(0, limit);
    } else {
      // Search queries: iteratively fetch smaller batches and filter in-memory
      const batchSize = 50;
      const searchLower = args.search.toLowerCase();

      let lastCreationTime: number | null = null;

      // Initialize lastCreationTime from the cursor if provided
      if (args.cursor) {
        const cursorProfile = await ctx.db.get(args.cursor);
        if (cursorProfile) {
          lastCreationTime = cursorProfile._creationTime;
        } else {
          // Invalid cursor: no results
          lastCreationTime = null;
        }
      }

      const matchingProfiles: Doc<"profiles">[] = [];

      // Fetch batches until we have enough matching results or exhaust the data
      while (matchingProfiles.length <= limit) {
        let q = ctx.db.query("profiles").order("desc");

        if (lastCreationTime !== null) {
          q = q.filter((queryBuilder) =>
            queryBuilder.lt(queryBuilder.field("_creationTime"), lastCreationTime!)
          );
        }

        const batch = await q.take(batchSize);

        if (batch.length === 0) {
          // No more data
          hasMore = false;
          break;
        }

        // Exclude current user if authenticated
        const filteredBatch = currentProfile
          ? batch.filter((p) => p._id !== currentProfile._id)
          : batch;

        // Update lastCreationTime for the next iteration based on the last item
        // that remains after filtering. If all items were filtered out, fall back
        // to advancing based on the raw batch to avoid re-fetching the same data.
        if (filteredBatch.length > 0) {
          lastCreationTime =
            filteredBatch[filteredBatch.length - 1]._creationTime;
        } else {
          lastCreationTime = batch[batch.length - 1]._creationTime;
        }
        // Apply search filter
        for (const p of filteredBatch) {
          if (
            p.username.toLowerCase().includes(searchLower) ||
            (p.displayName?.toLowerCase().includes(searchLower) ?? false)
          ) {
            matchingProfiles.push(p);
            if (matchingProfiles.length > limit) {
              // We have enough for this page plus one to know if there is more
              hasMore = true;
              break;
            }
          }
        }

        // If we already know there are more pages, stop fetching
        if (hasMore) {
          break;
        }

        // If the batch was smaller than batchSize, we've exhausted the data
        if (batch.length < batchSize) {
          hasMore = false;
          break;
        }
      }

      profiles = matchingProfiles.slice(0, limit);
    }

    const dataProfiles = profiles;
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
      nextCursor: hasMore && dataProfiles.length > 0
        ? dataProfiles[dataProfiles.length - 1]._id
        : null,
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

