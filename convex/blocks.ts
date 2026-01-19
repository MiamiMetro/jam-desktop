import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { requireAuth } from "./helpers";

/**
 * Block a user
 * Equivalent to POST /blocks/:userId
 */
export const block = mutation({
  args: {
    userId: v.id("profiles"),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);

    // Cannot block self
    if (profile._id === args.userId) {
      throw new Error("You cannot block yourself");
    }

    // Check if user exists
    const userToBlock = await ctx.db.get(args.userId);
    if (!userToBlock) {
      throw new Error("User not found");
    }

    // Check if already blocked
    const existingBlock = await ctx.db
      .query("blocks")
      .withIndex("by_blocker_and_blocked", (q) =>
        q.eq("blockerId", profile._id).eq("blockedId", args.userId)
      )
      .first();

    if (existingBlock) {
      throw new Error("User already blocked");
    }

    // Create block
    const blockId = await ctx.db.insert("blocks", {
      blockerId: profile._id,
      blockedId: args.userId,
    });

    const block = await ctx.db.get(blockId);

    return {
      id: block!._id,
      blocker_id: block!.blockerId,
      blocked_id: block!.blockedId,
      created_at: new Date(block!._creationTime).toISOString(),
    };
  },
});

/**
 * Unblock a user
 * Equivalent to DELETE /blocks/:userId
 */
export const unblock = mutation({
  args: {
    userId: v.id("profiles"),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);

    // Find the block
    const block = await ctx.db
      .query("blocks")
      .withIndex("by_blocker_and_blocked", (q) =>
        q.eq("blockerId", profile._id).eq("blockedId", args.userId)
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
 * Equivalent to GET /blocks
 * Supports cursor-based pagination
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("blocks")),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    const limit = args.limit ?? 50;

    // Get blocks where current user is the blocker
    let blocks: Doc<"blocks">[] = [];
    
    if (args.cursor) {
      const cursorBlock = await ctx.db.get(args.cursor);
      if (cursorBlock) {
        blocks = await ctx.db
          .query("blocks")
          .withIndex("by_blocker", (q) => q.eq("blockerId", profile._id))
          .order("desc")
          .filter((q) => q.lt(q.field("_creationTime"), cursorBlock._creationTime))
          .take(limit + 1);
      }
    } else {
      blocks = await ctx.db
        .query("blocks")
        .withIndex("by_blocker", (q) => q.eq("blockerId", profile._id))
        .order("desc")
        .take(limit + 1);
    }

    const hasMore = blocks.length > limit;
    const data = blocks.slice(0, limit);

    const formattedBlocks = await Promise.all(
      data.map(async (block) => {
        const blocked = await ctx.db.get(block.blockedId);
        if (!blocked) return null;

        return {
          id: blocked._id,
          username: blocked.username,
          display_name: blocked.displayName ?? "",
          avatar_url: blocked.avatarUrl ?? "",
          blocked_at: new Date(block._creationTime).toISOString(),
        };
      })
    );

    return {
      data: formattedBlocks.filter(Boolean),
      hasMore,
      nextCursor: hasMore && data.length > 0 ? data[data.length - 1]._id : null,
    };
  },
});

