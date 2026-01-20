import { query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
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
      // Search queries: iterative fetch with controlled batching
      // This approach reduces over-fetching while ensuring stable pagination
      const targetCount = limit + 1; // Need one extra to determine hasMore
      const batchSize = 50; // Smaller batches reduce waste from filtering

      // Build cursor filter
      let cursorTime: number | undefined;
      let cursorId: Id<"profiles"> | undefined;
      if (args.cursor) {
        const cursorProfile = await ctx.db.get(args.cursor);
        if (cursorProfile) {
          cursorTime = cursorProfile._creationTime;
          cursorId = cursorProfile._id;
        } else {
          // Invalid cursor: return empty
          profiles = [];
          hasMore = false;
        }
      }

      if (!args.cursor || cursorTime !== undefined) {
        const searchLower = args.search!.toLowerCase();
        const matchedProfiles: Doc<"profiles">[] = [];
        let searchExhausted = false;
        let currentBatchStart = 0;

        // Iteratively fetch search results in batches until we have enough matches
        while (matchedProfiles.length < targetCount && !searchExhausted) {
          // Fetch next batch from search index
          const searchBatch = await ctx.db
            .query("profiles")
            .withSearchIndex("search_profiles", (q) => {
              return q.search("username", args.search!);
            })
            .take(batchSize + currentBatchStart);

          // Extract only the new results (skip already processed)
          const newResults = searchBatch.slice(currentBatchStart);

          if (newResults.length === 0) {
            searchExhausted = true;
            break;
          }

          // Filter this batch by cursor and current user
          for (const profile of newResults) {
            // Skip if before cursor (for pagination)
            if (cursorTime !== undefined) {
              if (profile._creationTime > cursorTime) continue;
              if (profile._creationTime === cursorTime && profile._id >= cursorId!) continue;
            }

            // Skip current user
            if (currentProfile && profile._id === currentProfile._id) continue;

            // Username matches (from search index)
            matchedProfiles.push(profile);

            if (matchedProfiles.length >= targetCount) break;
          }

          currentBatchStart += batchSize;

          // Stop if we've fetched a lot and still don't have enough
          // (prevents excessive fetching on sparse matches)
          if (currentBatchStart >= 200) {
            searchExhausted = true;
          }
        }

        profiles = matchedProfiles;

        // Fallback: search displayName if we don't have enough results
        // This scans profiles in batches to find displayName matches
        if (matchedProfiles.length < targetCount) {
          const displayNameMatches: Doc<"profiles">[] = [];
          const displayBatchSize = 50;
          let lastCreationTime = cursorTime;
          let scanExhausted = false;

          while (matchedProfiles.length + displayNameMatches.length < targetCount && !scanExhausted) {
            let q = ctx.db.query("profiles").order("desc");

            if (lastCreationTime !== undefined) {
              q = q.filter((qb) => qb.lt(qb.field("_creationTime"), lastCreationTime!));
            }

            const batch = await q.take(displayBatchSize);

            if (batch.length === 0) {
              scanExhausted = true;
              break;
            }

            // Filter and check displayName
            for (const profile of batch) {
              // Skip if already matched by username
              if (matchedProfiles.some((p) => p._id === profile._id)) continue;

              // Skip current user
              if (currentProfile && profile._id === currentProfile._id) continue;

              // Check displayName match
              if (profile.displayName?.toLowerCase().includes(searchLower)) {
                displayNameMatches.push(profile);
                if (matchedProfiles.length + displayNameMatches.length >= targetCount) {
                  break;
                }
              }
            }

            lastCreationTime = batch[batch.length - 1]._creationTime;

            if (batch.length < displayBatchSize) {
              scanExhausted = true;
            }

            // Cap at 200 total scanned to prevent excessive work
            if (displayNameMatches.length + matchedProfiles.length >= targetCount) {
              break;
            }
          }

          // Merge and sort by creation time (desc)
          profiles = [...matchedProfiles, ...displayNameMatches].sort(
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

