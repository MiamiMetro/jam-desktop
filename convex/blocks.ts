import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { 
  requireViewerWithProfile, 
  executeBlockSideEffects,
} from "./helpers";

/**
 * Block a user
 * Also removes friendship and cancels pending requests
 */
export const block = mutation({
  args: {
    targetAccountId: v.id("accounts"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { account } = await requireViewerWithProfile(ctx);

    // Cannot block self
    if (account._id === args.targetAccountId) {
      throw new Error("You cannot block yourself");
    }

    // Check if target account exists
    const targetAccount = await ctx.db.get(args.targetAccountId);
    if (!targetAccount || targetAccount.status !== "active") {
      throw new Error("User not found");
    }

    // Check if already blocked
    const existingBlock = await ctx.db
      .query("blocks")
      .withIndex("by_blocker_blocked", (q) =>
        q.eq("blockerId", account._id).eq("blockedId", args.targetAccountId)
      )
      .first();

    if (existingBlock) {
      throw new Error("User already blocked");
    }

    // Create block
    const blockId = await ctx.db.insert("blocks", {
      blockerId: account._id,
      blockedId: args.targetAccountId,
      createdAt: Date.now(),
      reason: args.reason,
    });

    // Execute side-effects (remove friendship, cancel requests)
    await executeBlockSideEffects(ctx, account._id, args.targetAccountId);

    const block = await ctx.db.get(blockId);

    return {
      id: block!._id,
      blocker_id: block!.blockerId,
      blocked_id: block!.blockedId,
      created_at: new Date(block!.createdAt).toISOString(),
    };
  },
});

/**
 * Unblock a user
 */
export const unblock = mutation({
  args: {
    targetAccountId: v.id("accounts"),
  },
  handler: async (ctx, args) => {
    const { account } = await requireViewerWithProfile(ctx);

    // Find the block
    const block = await ctx.db
      .query("blocks")
      .withIndex("by_blocker_blocked", (q) =>
        q.eq("blockerId", account._id).eq("blockedId", args.targetAccountId)
      )
      .first();

    if (!block) {
      throw new Error("Block not found");
    }

    await ctx.db.delete(block._id);

    return { message: "User unblocked successfully" };
  },
});

/**
 * Get list of blocked users
 * Supports cursor-based pagination
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()), // createdAt timestamp
  },
  handler: async (ctx, args) => {
    const { account } = await requireViewerWithProfile(ctx);
    const limit = args.limit ?? 50;

    // Get blocks where current user is the blocker
    let blocks: Doc<"blocks">[] = [];
    
    if (args.cursor) {
      blocks = await ctx.db
        .query("blocks")
        .withIndex("by_blocker", (q) => q.eq("blockerId", account._id))
        .order("desc")
        .filter((q) => q.lt(q.field("createdAt"), args.cursor!))
        .take(limit + 1);
    } else {
      blocks = await ctx.db
        .query("blocks")
        .withIndex("by_blocker", (q) => q.eq("blockerId", account._id))
        .order("desc")
        .take(limit + 1);
    }

    const hasMore = blocks.length > limit;
    const data = blocks.slice(0, limit);

    const formattedBlocks = await Promise.all(
      data.map(async (block) => {
        const blockedProfile = await ctx.db
          .query("profiles")
          .withIndex("by_accountId", (q) => q.eq("accountId", block.blockedId))
          .first();

        if (!blockedProfile) return null;

        return {
          account_id: block.blockedId,
          id: blockedProfile._id,
          username: blockedProfile.username,
          display_name: blockedProfile.displayName ?? "",
          avatar_url: blockedProfile.avatarUrl ?? "",
          blocked_at: new Date(block.createdAt).toISOString(),
          _createdAt: block.createdAt,
        };
      })
    );

    const validBlocks = formattedBlocks.filter((b): b is NonNullable<typeof b> => b !== null);

    // Get total count
    const allBlocks = await ctx.db
      .query("blocks")
      .withIndex("by_blocker", (q) => q.eq("blockerId", account._id))
      .collect();

    return {
      data: validBlocks.map(({ _createdAt, ...rest }) => rest),
      hasMore,
      total: allBlocks.length,
      nextCursor: hasMore && data.length > 0 ? data[data.length - 1].createdAt : null,
    };
  },
});

/**
 * Check if a user is blocked (by me or has blocked me)
 */
export const checkBlocked = query({
  args: {
    targetAccountId: v.id("accounts"),
  },
  handler: async (ctx, args) => {
    const { account } = await requireViewerWithProfile(ctx);

    // Check if I blocked them
    const blockedByMe = await ctx.db
      .query("blocks")
      .withIndex("by_blocker_blocked", (q) =>
        q.eq("blockerId", account._id).eq("blockedId", args.targetAccountId)
      )
      .first();

    // Check if they blocked me
    const blockedByThem = await ctx.db
      .query("blocks")
      .withIndex("by_blocker_blocked", (q) =>
        q.eq("blockerId", args.targetAccountId).eq("blockedId", account._id)
      )
      .first();

    return {
      blockedByMe: !!blockedByMe,
      blockedByThem: !!blockedByThem,
      isBlocked: !!blockedByMe || !!blockedByThem,
    };
  },
});
