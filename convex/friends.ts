import { query, mutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { getCurrentProfile, requireAuth } from "./helpers";
import { checkRateLimit } from "./rateLimiter";

/**
 * Send a friend request
 * Equivalent to POST /friends/:userId/request
 */
export const sendRequest = mutation({
  args: {
    friendId: v.id("profiles"),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    
    // Rate limit: 10 friend requests per minute
    await checkRateLimit(ctx, "friendRequest", profile._id);

    // Cannot send request to self
    if (profile._id === args.friendId) {
      throw new Error("You cannot send friend request to yourself");
    }

    // Check if friend exists
    const friend = await ctx.db.get(args.friendId);
    if (!friend) {
      throw new Error("User not found");
    }

    // Check if friendship already exists (in either direction)
    const existing1 = await ctx.db
      .query("friends")
      .withIndex("by_user_and_friend", (q) =>
        q.eq("userId", profile._id).eq("friendId", args.friendId)
      )
      .first();

    const existing2 = await ctx.db
      .query("friends")
      .withIndex("by_user_and_friend", (q) =>
        q.eq("userId", args.friendId).eq("friendId", profile._id)
      )
      .first();

    if (existing1) {
      if (existing1.status === "accepted") {
        throw new Error("Users are already friends");
      }
      throw new Error("Friend request already sent");
    }

    if (existing2) {
      if (existing2.status === "accepted") {
        throw new Error("Users are already friends");
      }
      // The other user sent a request, accept it instead
      await ctx.db.patch(existing2._id, { status: "accepted" });
      return { message: "Friend request accepted", status: "accepted" };
    }

    // Create friend request
    await ctx.db.insert("friends", {
      userId: profile._id,
      friendId: args.friendId,
      status: "pending",
    });

    return { message: "Friend request sent", status: "pending" };
  },
});

/**
 * Accept a friend request
 * Equivalent to POST /friends/:userId/accept
 */
export const acceptRequest = mutation({
  args: {
    userId: v.id("profiles"),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    
    // Rate limit: 10 friend actions per minute
    await checkRateLimit(ctx, "friendRequest", profile._id);

    // Find pending request where args.userId is the requester
    const request = await ctx.db
      .query("friends")
      .withIndex("by_user_and_friend", (q) =>
        q.eq("userId", args.userId).eq("friendId", profile._id)
      )
      .first();

    if (!request) {
      throw new Error("Friend request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Friend request is not pending");
    }

    // Update to accepted
    await ctx.db.patch(request._id, { status: "accepted" });

    return { message: "Friend request accepted", status: "accepted" };
  },
});

/**
 * Remove a friend or cancel a friend request
 * Equivalent to DELETE /friends/:userId
 */
export const remove = mutation({
  args: {
    userId: v.id("profiles"),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    
    // Rate limit: 10 friend actions per minute
    await checkRateLimit(ctx, "friendRequest", profile._id);

    // Find friendship in either direction
    const friendship1 = await ctx.db
      .query("friends")
      .withIndex("by_user_and_friend", (q) =>
        q.eq("userId", profile._id).eq("friendId", args.userId)
      )
      .first();

    const friendship2 = await ctx.db
      .query("friends")
      .withIndex("by_user_and_friend", (q) =>
        q.eq("userId", args.userId).eq("friendId", profile._id)
      )
      .first();

    if (!friendship1 && !friendship2) {
      throw new Error("Friendship not found");
    }

    if (friendship1) {
      await ctx.db.delete(friendship1._id);
    }
    if (friendship2) {
      await ctx.db.delete(friendship2._id);
    }

    return { message: "Friend removed successfully" };
  },
});

/**
 * Get list of all friends (accepted only)
 * Equivalent to GET /friends
 * Supports cursor-based pagination and search
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("friends")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    if (!profile) {
      return { data: [], hasMore: false, nextCursor: null };
    }
    const limit = args.limit ?? 50;

    // For non-search queries, use efficient single-batch pagination.
    // For search queries, iteratively fetch pages to ensure we have enough matches.
    const nonSearchFetchSize = limit + 1;

    let friendships1: Doc<"friends">[] = [];
    let friendships2: Doc<"friends">[] = [];

    if (args.search) {
      // Iteratively fetch from both directions when searching, since additional
      // filtering may reduce the number of matching results.
      const pageSize = 100;
      // Upper bound to avoid unbounded scans; can be tuned if needed.
      const maxToFetch = limit * 3 + 1;

      // Helper to fetch accepted friendships for a given index/field combination.
      const fetchAcceptedFriendships = async (
        indexName: "by_user" | "by_friend",
        fieldName: "userId" | "friendId"
      ): Promise<Doc<"friends">[]> => {
        let results: Doc<"friends">[] = [];
        let cursor: string | null = null;
        let done = false;
        while (!done && results.length < maxToFetch) {
          const page = await ctx.db
            .query("friends")
            .withIndex(indexName, (q) => q.eq(fieldName, profile._id))
            .filter((q) => q.eq(q.field("status"), "accepted"))
            .order("desc")
            .paginate({ cursor, numItems: pageSize });
          results = results.concat(page.page);
          done = page.isDone;
          cursor = page.continueCursor;
        }
        return results;
      };

      // Fetch friendships where profile is userId and where profile is friendId in parallel.
      [friendships1, friendships2] = await Promise.all([
        fetchAcceptedFriendships("by_user", "userId"),
        fetchAcceptedFriendships("by_friend", "friendId"),
      ]);
    } else {
      // Get friendships where user is userId (limited by nonSearchFetchSize)
      friendships1 = await ctx.db
        .query("friends")
        .withIndex("by_user", (q) => q.eq("userId", profile._id))
        .filter((q) => q.eq(q.field("status"), "accepted"))
        .order("desc")
        .take(nonSearchFetchSize);

      // Get friendships where user is friendId (limited by nonSearchFetchSize)
      friendships2 = await ctx.db
        .query("friends")
        .withIndex("by_friend", (q) => q.eq("friendId", profile._id))
        .filter((q) => q.eq(q.field("status"), "accepted"))
        .order("desc")
        .take(nonSearchFetchSize);
    }
    // Combine and sort by creation time (descending - newest first)
    let allFriendships = [...friendships1, ...friendships2].sort(
      (a, b) => b._creationTime - a._creationTime
    );

    // Apply cursor if provided
    if (args.cursor) {
      const cursorFriendship = await ctx.db.get(args.cursor);
      if (cursorFriendship) {
        // Filter friendships older than cursor
        allFriendships = allFriendships.filter(
          (f) => f._creationTime < cursorFriendship._creationTime
        );
      }
    }

    // Take page size + 1 to check if there are more results
    const paginatedFriendships = allFriendships.slice(0, limit + 1);
    const hasMore = paginatedFriendships.length > limit;
    const dataFriendships = paginatedFriendships.slice(0, limit);

    const friends = await Promise.all(
      dataFriendships.map(async (friendship) => {
        const friendId =
          friendship.userId === profile._id
            ? friendship.friendId
            : friendship.userId;
        const friend = await ctx.db.get(friendId);
        if (!friend) return null;

        return {
          id: friend._id,
          username: friend.username,
          display_name: friend.displayName ?? "",
          avatar_url: friend.avatarUrl ?? "",
          friends_since: new Date(friendship._creationTime).toISOString(),
          _friendshipId: friendship._id, // For cursor
        };
      })
    );

    let validFriends = friends.filter((f): f is NonNullable<typeof f> => f !== null);

    // Apply search filter if provided
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      validFriends = validFriends.filter(
        (f) =>
          f.username.toLowerCase().includes(searchLower) ||
          f.display_name.toLowerCase().includes(searchLower)
      );
    }

    return {
      data: validFriends.map(({ _friendshipId, ...rest }) => rest),
      hasMore,
      nextCursor: hasMore && dataFriendships.length > 0
        ? dataFriendships[dataFriendships.length - 1]._id
        : null,
    };
  },
});

/**
 * Get pending friend requests (requests sent to me)
 * Equivalent to GET /friends/requests
 * Supports cursor-based pagination
 */
export const getRequests = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("friends")),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    if (!profile) {
      return { data: [], hasMore: false, nextCursor: null };
    }
    const limit = args.limit ?? 20;

    // Get pending requests where current user is the friendId (recipient)
    let requests: Doc<"friends">[] = [];

    if (args.cursor) {
      const cursorRequest = await ctx.db.get(args.cursor);
      if (cursorRequest) {
        requests = await ctx.db
          .query("friends")
          .withIndex("by_friend", (q) => q.eq("friendId", profile._id))
          .filter((q) => q.eq(q.field("status"), "pending"))
          .order("desc")
          .filter((q) => q.lt(q.field("_creationTime"), cursorRequest._creationTime))
          .take(limit + 1);
      }
    } else {
      requests = await ctx.db
        .query("friends")
        .withIndex("by_friend", (q) => q.eq("friendId", profile._id))
        .filter((q) => q.eq(q.field("status"), "pending"))
        .order("desc")
        .take(limit + 1);
    }

    const hasMore = requests.length > limit;
    const data = requests.slice(0, limit);

    const formattedRequests = await Promise.all(
      data.map(async (request) => {
        const user = await ctx.db.get(request.userId);
        if (!user) return null;

        return {
          id: user._id,
          username: user.username,
          display_name: user.displayName ?? "",
          avatar_url: user.avatarUrl ?? "",
          requested_at: new Date(request._creationTime).toISOString(),
        };
      })
    );

    return {
      data: formattedRequests.filter(Boolean),
      hasMore,
      nextCursor: hasMore && data.length > 0 ? data[data.length - 1]._id : null,
    };
  },
});

/**
 * Get pending friend requests sent by me
 * Equivalent to GET /friends/sent-requests
 * Returns a simple list of user IDs that have pending requests from the current user
 * Uses Convex .paginate() for efficient cursor-based pagination
 */
export const getSentRequests = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    if (!profile) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    // Get pending requests where current user is the userId (sender)
    const result = await ctx.db
      .query("friends")
      .withIndex("by_user", (q) => q.eq("userId", profile._id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .order("desc")
      .paginate(args.paginationOpts);

    // Return friend IDs for easy lookup
    return {
      ...result,
      page: result.page.map((request) => request.friendId),
    };
  },
});

