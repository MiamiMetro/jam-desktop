import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { 
  requireViewerWithProfile,
  getCanonicalPair,
  isBlocked,
  incrementFriendCount,
} from "./helpers";
import { checkRateLimit } from "./rateLimiter";

/**
 * Send a friend request
 * Uses canonical ordering (userA < userB) to prevent duplicates
 */
export const sendRequest = mutation({
  args: {
    targetAccountId: v.id("accounts"),
  },
  handler: async (ctx, args) => {
    const { account, profile } = await requireViewerWithProfile(ctx);
    
    // Rate limit: 10 friend requests per minute
    await checkRateLimit(ctx, "friendRequest", profile._id);

    // Cannot send request to self
    if (account._id === args.targetAccountId) {
      throw new Error("You cannot send friend request to yourself");
    }

    // Check if target account exists and has a profile
    const targetAccount = await ctx.db.get(args.targetAccountId);
    if (!targetAccount || targetAccount.status !== "active") {
      throw new Error("User not found");
    }

    const targetProfile = await ctx.db
      .query("profiles")
      .withIndex("by_accountId", (q) => q.eq("accountId", args.targetAccountId))
      .first();
    if (!targetProfile) {
      throw new Error("User not found");
    }

    // Check if blocked
    const blocked = await isBlocked(ctx, account._id, args.targetAccountId);
    if (blocked) {
      throw new Error("Cannot send friend request to this user");
    }

    const { userA, userB } = getCanonicalPair(account._id, args.targetAccountId);

    // Check if already friends
    const existingFriend = await ctx.db
      .query("friends")
      .withIndex("by_userA_userB", (q) => q.eq("userA", userA).eq("userB", userB))
      .first();

    if (existingFriend) {
      throw new Error("Users are already friends");
    }

    // Check for existing request
    const existingRequest = await ctx.db
      .query("friendRequests")
      .withIndex("by_userA_userB", (q) => q.eq("userA", userA).eq("userB", userB))
      .first();

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        if (existingRequest.requesterId === account._id) {
          throw new Error("Friend request already sent");
        } else {
          // The other user already sent us a request - auto-accept it
          await ctx.db.patch(existingRequest._id, {
            status: "accepted",
            resolvedAt: Date.now(),
            resolvedBy: account._id,
          });

          // Create the friendship
          await ctx.db.insert("friends", {
            userA,
            userB,
            createdAt: Date.now(),
          });

          // Increment friend counts
          await incrementFriendCount(ctx, account._id);
          await incrementFriendCount(ctx, args.targetAccountId);

          return { message: "Friend request accepted", status: "accepted" };
        }
      } else if (existingRequest.status === "rejected") {
        // Allow re-request after rejection
        await ctx.db.patch(existingRequest._id, {
          status: "pending",
          requesterId: account._id,
          createdAt: Date.now(),
          resolvedAt: undefined,
          resolvedBy: undefined,
        });
        return { message: "Friend request sent", status: "pending" };
      } else {
        throw new Error("Cannot send friend request at this time");
      }
    }

    // Create new friend request
    await ctx.db.insert("friendRequests", {
      userA,
      userB,
      requesterId: account._id,
      status: "pending",
      createdAt: Date.now(),
    });

    return { message: "Friend request sent", status: "pending" };
  },
});

/**
 * Accept a friend request
 */
export const acceptRequest = mutation({
  args: {
    requesterAccountId: v.id("accounts"),
  },
  handler: async (ctx, args) => {
    const { account, profile } = await requireViewerWithProfile(ctx);
    
    // Rate limit: 10 friend actions per minute
    await checkRateLimit(ctx, "friendRequest", profile._id);

    const { userA, userB } = getCanonicalPair(account._id, args.requesterAccountId);

    // Find pending request where args.requesterAccountId is the requester
    const request = await ctx.db
      .query("friendRequests")
      .withIndex("by_userA_userB", (q) => q.eq("userA", userA).eq("userB", userB))
      .first();

    if (!request) {
      throw new Error("Friend request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Friend request is not pending");
    }

    if (request.requesterId !== args.requesterAccountId) {
      throw new Error("Friend request not found");
    }

    // Update request to accepted
    await ctx.db.patch(request._id, {
      status: "accepted",
      resolvedAt: Date.now(),
      resolvedBy: account._id,
    });

    // Create the friendship
    await ctx.db.insert("friends", {
      userA,
      userB,
      createdAt: Date.now(),
    });

    // Increment friend counts
    await incrementFriendCount(ctx, account._id);
    await incrementFriendCount(ctx, args.requesterAccountId);

    return { message: "Friend request accepted", status: "accepted" };
  },
});

/**
 * Reject a friend request
 */
export const rejectRequest = mutation({
  args: {
    requesterAccountId: v.id("accounts"),
  },
  handler: async (ctx, args) => {
    const { account, profile } = await requireViewerWithProfile(ctx);
    
    // Rate limit: 10 friend actions per minute
    await checkRateLimit(ctx, "friendRequest", profile._id);

    const { userA, userB } = getCanonicalPair(account._id, args.requesterAccountId);

    const request = await ctx.db
      .query("friendRequests")
      .withIndex("by_userA_userB", (q) => q.eq("userA", userA).eq("userB", userB))
      .first();

    if (!request || request.status !== "pending" || request.requesterId !== args.requesterAccountId) {
      throw new Error("Friend request not found");
    }

    await ctx.db.patch(request._id, {
      status: "rejected",
      resolvedAt: Date.now(),
      resolvedBy: account._id,
    });

    return { message: "Friend request rejected" };
  },
});

/**
 * Cancel a friend request you sent
 */
export const cancelRequest = mutation({
  args: {
    targetAccountId: v.id("accounts"),
  },
  handler: async (ctx, args) => {
    const { account } = await requireViewerWithProfile(ctx);
    
    const { userA, userB } = getCanonicalPair(account._id, args.targetAccountId);

    const request = await ctx.db
      .query("friendRequests")
      .withIndex("by_userA_userB", (q) => q.eq("userA", userA).eq("userB", userB))
      .first();

    if (!request || request.status !== "pending" || request.requesterId !== account._id) {
      throw new Error("Friend request not found");
    }

    await ctx.db.patch(request._id, {
      status: "cancelled",
      resolvedAt: Date.now(),
      resolvedBy: account._id,
    });

    return { message: "Friend request cancelled" };
  },
});

/**
 * Remove a friend
 */
export const remove = mutation({
  args: {
    friendAccountId: v.id("accounts"),
  },
  handler: async (ctx, args) => {
    const { account, profile } = await requireViewerWithProfile(ctx);
    
    // Rate limit: 10 friend actions per minute
    await checkRateLimit(ctx, "friendRequest", profile._id);

    const { userA, userB } = getCanonicalPair(account._id, args.friendAccountId);

    const friendship = await ctx.db
      .query("friends")
      .withIndex("by_userA_userB", (q) => q.eq("userA", userA).eq("userB", userB))
      .first();

    if (!friendship) {
      throw new Error("Friendship not found");
    }

    await ctx.db.delete(friendship._id);

    // Decrement friend counts
    await incrementFriendCount(ctx, account._id, -1);
    await incrementFriendCount(ctx, args.friendAccountId, -1);

    return { message: "Friend removed successfully" };
  },
});

/**
 * Get list of all friends (accepted only)
 * Supports cursor-based pagination and search
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()), // createdAt timestamp
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { account } = await requireViewerWithProfile(ctx);
    const limit = args.limit ?? 50;

    // Get friendships where user is userA
    const friendshipsA = await ctx.db
      .query("friends")
      .withIndex("by_userA", (q) => q.eq("userA", account._id))
      .collect();

    // Get friendships where user is userB
    const friendshipsB = await ctx.db
      .query("friends")
      .withIndex("by_userB", (q) => q.eq("userB", account._id))
      .collect();

    const allFriendships = [...friendshipsA, ...friendshipsB].sort(
      (a, b) => b.createdAt - a.createdAt
    );

    // Enrich with profile data
    const enrichedFriends = await Promise.all(
      allFriendships.map(async (friendship) => {
        const friendAccountId = friendship.userA === account._id 
          ? friendship.userB 
          : friendship.userA;
        
        const friendProfile = await ctx.db
          .query("profiles")
          .withIndex("by_accountId", (q) => q.eq("accountId", friendAccountId))
          .first();

        if (!friendProfile) return null;

        return {
          account_id: friendAccountId,
          id: friendProfile._id,
          username: friendProfile.username,
          display_name: friendProfile.displayName ?? "",
          avatar_url: friendProfile.avatarUrl ?? "",
          friends_since: new Date(friendship.createdAt).toISOString(),
          _createdAt: friendship.createdAt,
        };
      })
    );

    let validFriends = enrichedFriends.filter((f): f is NonNullable<typeof f> => f !== null);

    // Apply search filter if provided
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      validFriends = validFriends.filter(
        (f) =>
          f.username.toLowerCase().includes(searchLower) ||
          f.display_name.toLowerCase().includes(searchLower)
      );
    }

    // Apply cursor pagination
    let startIndex = 0;
    if (args.cursor) {
      startIndex = validFriends.findIndex((f) => f._createdAt < args.cursor!) ;
      if (startIndex === -1) startIndex = validFriends.length;
    }

    const paginatedFriends = validFriends.slice(startIndex, startIndex + limit + 1);
    const hasMore = paginatedFriends.length > limit;
    const dataFriends = paginatedFriends.slice(0, limit);

    return {
      data: dataFriends.map(({ _createdAt, ...rest }) => rest),
      hasMore,
      total: validFriends.length,
      nextCursor: hasMore && dataFriends.length > 0 
        ? dataFriends[dataFriends.length - 1]._createdAt 
        : null,
    };
  },
});

/**
 * Get pending friend requests (requests sent to me)
 * Supports cursor-based pagination
 */
export const getRequests = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()), // createdAt timestamp
  },
  handler: async (ctx, args) => {
    const { account } = await requireViewerWithProfile(ctx);
    const limit = args.limit ?? 20;

    // Get requests where current user is NOT the requester (i.e., they're receiving)
    // Need to check both userA and userB positions
    const requestsA = await ctx.db
      .query("friendRequests")
      .withIndex("by_userA", (q) => q.eq("userA", account._id))
      .collect();

    const requestsB = await ctx.db
      .query("friendRequests")
      .withIndex("by_userB", (q) => q.eq("userB", account._id))
      .collect();

    // Filter to only pending requests where current user is NOT the requester
    const pendingRequests = [...requestsA, ...requestsB]
      .filter((r) => r.status === "pending" && r.requesterId !== account._id)
      .sort((a, b) => b.createdAt - a.createdAt);

    // Enrich with requester profile
    const enrichedRequests = await Promise.all(
      pendingRequests.map(async (request) => {
        const requesterProfile = await ctx.db
          .query("profiles")
          .withIndex("by_accountId", (q) => q.eq("accountId", request.requesterId))
          .first();

        if (!requesterProfile) return null;

        return {
          account_id: request.requesterId,
          id: requesterProfile._id,
          username: requesterProfile.username,
          display_name: requesterProfile.displayName ?? "",
          avatar_url: requesterProfile.avatarUrl ?? "",
          requested_at: new Date(request.createdAt).toISOString(),
          _createdAt: request.createdAt,
        };
      })
    );

    const validRequests = enrichedRequests.filter((r): r is NonNullable<typeof r> => r !== null);

    // Apply cursor pagination
    let startIndex = 0;
    if (args.cursor) {
      startIndex = validRequests.findIndex((r) => r._createdAt < args.cursor!);
      if (startIndex === -1) startIndex = validRequests.length;
    }

    const paginatedRequests = validRequests.slice(startIndex, startIndex + limit + 1);
    const hasMore = paginatedRequests.length > limit;
    const dataRequests = paginatedRequests.slice(0, limit);

    return {
      data: dataRequests.map(({ _createdAt, ...rest }) => rest),
      hasMore,
      total: validRequests.length,
      nextCursor: hasMore && dataRequests.length > 0 
        ? dataRequests[dataRequests.length - 1]._createdAt 
        : null,
    };
  },
});

/**
 * Get friend requests I've sent
 */
export const getSentRequests = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { account } = await requireViewerWithProfile(ctx);
    const limit = args.limit ?? 20;

    // Get requests where current user IS the requester
    const requests = await ctx.db
      .query("friendRequests")
      .withIndex("by_requesterId_status", (q) => 
        q.eq("requesterId", account._id).eq("status", "pending")
      )
      .take(limit);

    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const targetAccountId = request.userA === account._id 
          ? request.userB 
          : request.userA;

        const targetProfile = await ctx.db
          .query("profiles")
          .withIndex("by_accountId", (q) => q.eq("accountId", targetAccountId))
          .first();

        if (!targetProfile) return null;

        return {
          account_id: targetAccountId,
          id: targetProfile._id,
          username: targetProfile.username,
          display_name: targetProfile.displayName ?? "",
          avatar_url: targetProfile.avatarUrl ?? "",
          sent_at: new Date(request.createdAt).toISOString(),
        };
      })
    );

    return {
      data: enrichedRequests.filter(Boolean),
    };
  },
});
