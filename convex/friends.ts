import { query, mutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
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
 * Creates bidirectional friendship records
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

    // Update original request to accepted
    await ctx.db.patch(request._id, { status: "accepted" });

    // Create mirror record for bidirectional lookup
    // This allows O(1) friend checks without querying both directions
    const existingMirror = await ctx.db
      .query("friends")
      .withIndex("by_user_and_friend", (q) =>
        q.eq("userId", profile._id).eq("friendId", args.userId)
      )
      .first();

    if (!existingMirror) {
      await ctx.db.insert("friends", {
        userId: profile._id,
        friendId: args.userId,
        status: "accepted",
      });
    }
    return { message: "Friend request accepted", status: "accepted" };
  },
});

/**
 * Remove a friend or cancel a friend request
 * Equivalent to DELETE /friends/:userId
 * For accepted friendships, deletes both bidirectional records
 */
export const remove = mutation({
  args: {
    userId: v.id("profiles"),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);

    // Rate limit: 10 friend actions per minute
    await checkRateLimit(ctx, "friendRequest", profile._id);

    // Find friendship in both directions
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

    // Delete both records (for accepted friendships, both exist)
    // For pending requests, only one exists
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
 * Get friends list for current user or a specific user
 * Equivalent to GET /friends
 * Supports cursor-based pagination and search
 */
export const list = query({
  args: {
    userId: v.optional(v.id("profiles")),
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("friends")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Determine which user's friends to fetch
    let targetUserId: string;
    if (args.userId) {
      // Fetch specified user's friends (public view)
      targetUserId = args.userId;
    } else {
      // Fetch current user's friends
      const profile = await getCurrentProfile(ctx);
      if (!profile) {
        return { data: [], hasMore: false, nextCursor: null };
      }
      targetUserId = profile._id;
    }
    
    const limit = args.limit ?? 50;

    // Apply cursor at query level for efficiency
    let cursorTime: number | undefined;
    let cursorFriendshipId: string | undefined;
    if (args.cursor) {
      const cursorFriendship = await ctx.db.get(args.cursor);
      if (!cursorFriendship) {
        // Invalid cursor: return empty results
        return { data: [], hasMore: false, nextCursor: null };
      }
      cursorTime = cursorFriendship._creationTime;
      cursorFriendshipId = args.cursor;
    }

    if (args.search) {
      // For search: fetch until we have enough matches after filtering
      const pageSize = 100;
      const targetCount = limit + 1; // Need one extra to determine hasMore
      const matchedFriends: Array<{ friendship: Doc<"friends">, profile: Doc<"profiles"> }> = [];

      let paginationCursor: string | null = null;
      let done = false;
      let skippedCursor = false;

      while (!done && matchedFriends.length < targetCount) {
        // Use compound index for efficient filtering by user + status
        const query = ctx.db
          .query("friends")
          .withIndex("by_user_and_status", (q) =>
            q.eq("userId", targetUserId as Id<"profiles">).eq("status", "accepted")
          )
          .order("desc");

        const page = await query.paginate({ cursor: paginationCursor, numItems: pageSize });
        
        // Filter out results before the cursor point
        let pageFriendships = page.page;
        if (cursorTime !== undefined && !skippedCursor) {
          const filtered: typeof pageFriendships = [];
          
          for (const f of pageFriendships) {
            if (skippedCursor) {
              // Already passed cursor in this page, include all remaining items
              filtered.push(f);
            } else if (f._creationTime < cursorTime) {
              // Passed the cursor point (older item in desc order)
              skippedCursor = true;
              filtered.push(f);
            } else if (f._creationTime === cursorTime) {
              if (f._id === cursorFriendshipId) {
                // This is the cursor item itself - skip it but mark as passed
                skippedCursor = true;
              } else {
                // Same time, different ID - include it
                filtered.push(f);
              }
            }
            // else: newer than cursor, skip it
          }
          
          pageFriendships = filtered;
        }
        
        // Fetch profiles for this page and filter by search immediately
        const searchLower = args.search!.toLowerCase();
        for (const friendship of pageFriendships) {
          if (matchedFriends.length >= targetCount) break;
          
          const friend = await ctx.db.get(friendship.friendId);
          if (!friend) continue;
          
          // Check if this friend matches the search query
          const matchesSearch = 
            friend.username.toLowerCase().includes(searchLower) ||
            (friend.displayName ?? "").toLowerCase().includes(searchLower);
            
          if (matchesSearch) {
            matchedFriends.push({ friendship, profile: friend });
          }
        }
        
        done = page.isDone;
        paginationCursor = page.continueCursor;
      }
      
      // Build the response from matched friends
      const hasMore = matchedFriends.length > limit;
      const resultFriends = matchedFriends.slice(0, limit);
      
      return {
        data: resultFriends.map(({ friendship, profile }) => ({
          id: profile._id,
          username: profile.username,
          display_name: profile.displayName ?? "",
          avatar_url: profile.avatarUrl ?? "",
          friends_since: new Date(friendship._creationTime).toISOString(),
        })),
        hasMore,
        nextCursor: hasMore && resultFriends.length > 0
          ? resultFriends[resultFriends.length - 1].friendship._id
          : null,
      };
    } else {
      // Non-search: efficient single-batch query
      const fetchSize = limit + 1;

      // Use compound index for efficient filtering by user + status
      let query = ctx.db
        .query("friends")
        .withIndex("by_user_and_status", (q) =>
          q.eq("userId", targetUserId as Id<"profiles">).eq("status", "accepted")
        )
        .order("desc");

      // Apply cursor filter if provided
      if (cursorTime !== undefined) {
        query = query.filter((q) => q.lt(q.field("_creationTime"), cursorTime));
      }

      const friendships = await query.take(fetchSize);
      
      // Fetch friend profiles
      const friends = await Promise.all(
        friendships.map(async (friendship) => {
          const friend = await ctx.db.get(friendship.friendId);
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

      const validFriends = friends.filter((f): f is NonNullable<typeof f> => f !== null);

      // Check if there are more results
      const hasMore = validFriends.length > limit;
      const dataFriends = validFriends.slice(0, limit);

      return {
        data: dataFriends.map((friend) => ({
          id: friend.id,
          username: friend.username,
          display_name: friend.display_name,
          avatar_url: friend.avatar_url,
          friends_since: friend.friends_since,
        })),
        hasMore,
        nextCursor: hasMore && dataFriends.length > 0
          ? dataFriends[dataFriends.length - 1]._friendshipId
          : null,
      };
    }
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
 * Get sent friend requests with full user data
 * Returns pending requests where the current user is the sender (userId)
 * Returns full profile data of the recipients (friendId)
 */
export const getSentRequestsWithData = query({
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

    // Get pending requests where current user is the userId (sender)
    let requests: Doc<"friends">[] = [];

    if (args.cursor) {
      const cursorRequest = await ctx.db.get(args.cursor);
      if (cursorRequest) {
        requests = await ctx.db
          .query("friends")
          .withIndex("by_user", (q) => q.eq("userId", profile._id))
          .filter((q) => q.eq(q.field("status"), "pending"))
          .order("desc")
          .filter((q) => q.lt(q.field("_creationTime"), cursorRequest._creationTime))
          .take(limit + 1);
      }
    } else {
      requests = await ctx.db
        .query("friends")
        .withIndex("by_user", (q) => q.eq("userId", profile._id))
        .filter((q) => q.eq(q.field("status"), "pending"))
        .order("desc")
        .take(limit + 1);
    }

    const hasMore = requests.length > limit;
    const data = requests.slice(0, limit);

    const formattedRequests = await Promise.all(
      data.map(async (request) => {
        const user = await ctx.db.get(request.friendId);
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

