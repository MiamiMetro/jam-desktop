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
      // Search queries: use search index for efficient server-side filtering
      const fetchSize = limit + 1;

      // Build cursor filter options
      let cursorTime: number | undefined;
      if (args.cursor) {
        const cursorProfile = await ctx.db.get(args.cursor);
        if (cursorProfile) {
          cursorTime = cursorProfile._creationTime;
        } else {
          // Invalid cursor: return empty
          profiles = [];
          hasMore = false;
        }
      }

      if (!args.cursor || cursorTime !== undefined) {
        // Use search index to find profiles matching the search term.
        // The search index cannot express our cursor condition (creationTime < cursorTime)
        // or "exclude current user" directly, so we intentionally over-fetch and then apply
        // those filters on the application side.
        //
        // When paginating (cursorTime !== undefined) we cap the search fetch size at 100 to
        // balance correctness and performance:
        //   - Larger values reduce the chance that we need an additional round trip to find
        //     enough post-cursor results, but increase index load and network usage.
        //   - Smaller values reduce per-request cost but may require more requests from the
        //     client to page through a large result set.
        // If this endpoint becomes a hotspot, revisit this constant or introduce a more
        // sophisticated paging strategy.
        const searchFetchSize = cursorTime !== undefined ? 100 : fetchSize;

        const searchResults = await ctx.db
          .query("profiles")
          .withSearchIndex("search_profiles", (q) => {
            // Search by username only (filterFields in schema)
            return q.search("username", args.search!);
          })
          .take(searchFetchSize);

        // Apply cursor filter and exclude current user
        let filteredProfiles = searchResults;

        if (cursorTime !== undefined) {
          filteredProfiles = filteredProfiles.filter(
            (p) => p._creationTime < cursorTime
          );
        }

        if (currentProfile) {
          filteredProfiles = filteredProfiles.filter(
            (p) => p._id !== currentProfile._id
          );
        }

        profiles = filteredProfiles.slice(0, fetchSize);

        // Check displayName separately (search index only supports username)
        // If we didn't get enough results from username search, also search displayName
        if (profiles.length < limit) {
          const searchLower = args.search!.toLowerCase();

          // Get additional profiles that match displayName (fallback to old method for displayName)
          const displayNameMatches: Doc<"profiles">[] = [];
          const batchSize = 50;
          let lastCreationTime = cursorTime ?? null;

          // Only fetch if we need more results
          while (displayNameMatches.length + profiles.length <= limit) {
            let q = ctx.db.query("profiles").order("desc");

            if (lastCreationTime !== null) {
              q = q.filter((queryBuilder) =>
                queryBuilder.lt(queryBuilder.field("_creationTime"), lastCreationTime!)
              );
            }

            const batch = await q.take(batchSize);

            if (batch.length === 0) {
              break;
            }

            // Exclude current user and profiles already found by username search
            const filteredBatch = batch.filter((p) =>
              (!currentProfile || p._id !== currentProfile._id) &&
              !profiles.some((existing) => existing._id === p._id)
            );

            // Update lastCreationTime for next iteration
            if (filteredBatch.length > 0) {
              lastCreationTime = filteredBatch[filteredBatch.length - 1]._creationTime;
            } else if (batch.length > 0) {
              lastCreationTime = batch[batch.length - 1]._creationTime;
            }

            // Filter by displayName
            for (const p of filteredBatch) {
              if (p.displayName?.toLowerCase().includes(searchLower)) {
                displayNameMatches.push(p);
                if (displayNameMatches.length + profiles.length > limit) {
                  break;
                }
              }
            }

            if (displayNameMatches.length + profiles.length > limit) {
              break;
            }

            if (batch.length < batchSize) {
              break;
            }
          }

          // Merge username and displayName matches, sort by creation time
          profiles = [...profiles, ...displayNameMatches].sort(
            (a, b) => b._creationTime - a._creationTime
          );
        }

        hasMore = profiles.length > limit;
        profiles = profiles.slice(0, limit);
      }
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

