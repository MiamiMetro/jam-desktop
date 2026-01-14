import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import {
  getViewer,
  requireViewerWithProfile,
  validateTextLength,
  sanitizeText,
  incrementCommentCount,
  incrementCommentLikeCount,
  incrementReplyCount,
  MAX_LENGTHS,
} from "./helpers";
import { checkRateLimit } from "./rateLimiter";

/**
 * Format a comment for API response
 */
async function formatComment(
  ctx: any,
  comment: Doc<"comments">,
  currentAccountId?: Id<"accounts">
) {
  // Get author profile
  const authorProfile = await ctx.db
    .query("profiles")
    .withIndex("by_accountId", (q: any) => q.eq("accountId", comment.authorId))
    .first();

  // Check if current user liked this comment
  let isLiked = false;
  if (currentAccountId) {
    const like = await ctx.db
      .query("commentLikes")
      .withIndex("by_comment_account", (q: any) =>
        q.eq("commentId", comment._id).eq("accountId", currentAccountId)
      )
      .first();
    isLiked = !!like;
  }

  return {
    id: comment._id,
    post_id: comment.postId,
    author_id: comment.authorId,
    parent_id: comment.parentId ?? null,
    content: comment.content,
    created_at: new Date(comment.createdAt).toISOString(),
    author: authorProfile
      ? {
          id: authorProfile._id,
          account_id: authorProfile.accountId,
          username: authorProfile.username,
          display_name: authorProfile.displayName ?? "",
          avatar_url: authorProfile.avatarUrl ?? "",
        }
      : null,
    likes_count: comment.likeCount,
    replies_count: comment.replyCount,
    is_liked: isLiked,
    is_deleted: !!comment.deletedAt,
  };
}

/**
 * Create a top-level comment on a post
 */
export const create = mutation({
  args: {
    postId: v.id("posts"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { account, profile } = await requireViewerWithProfile(ctx);
    
    // Rate limit: 10 comments per minute
    await checkRateLimit(ctx, "createComment", profile._id);

    // Verify post exists and isn't deleted
    const post = await ctx.db.get(args.postId);
    if (!post || post.deletedAt) {
      throw new Error("Post not found");
    }

    // Sanitize and validate inputs
    const content = sanitizeText(args.content);
    if (!content) {
      throw new Error("Comment content is required");
    }
    validateTextLength(content, MAX_LENGTHS.COMMENT_TEXT, "Comment");

    const commentId = await ctx.db.insert("comments", {
      postId: args.postId,
      authorId: account._id,
      parentId: undefined,
      content,
      createdAt: Date.now(),
      likeCount: 0,
      replyCount: 0,
    });

    // Increment comment count on post
    await incrementCommentCount(ctx, args.postId, 1);

    const comment = await ctx.db.get(commentId);
    if (!comment) {
      throw new Error("Failed to create comment");
    }

    return await formatComment(ctx, comment, account._id);
  },
});

/**
 * Reply to an existing comment (threaded)
 */
export const reply = mutation({
  args: {
    parentId: v.id("comments"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { account, profile } = await requireViewerWithProfile(ctx);
    
    // Rate limit: 10 replies per minute
    await checkRateLimit(ctx, "replyToComment", profile._id);

    // Verify parent comment exists and isn't deleted
    const parent = await ctx.db.get(args.parentId);
    if (!parent || parent.deletedAt) {
      throw new Error("Parent comment not found");
    }

    // Sanitize and validate inputs
    const content = sanitizeText(args.content);
    if (!content) {
      throw new Error("Reply content is required");
    }
    validateTextLength(content, MAX_LENGTHS.COMMENT_TEXT, "Reply");

    const commentId = await ctx.db.insert("comments", {
      postId: parent.postId,
      authorId: account._id,
      parentId: args.parentId,
      content,
      createdAt: Date.now(),
      likeCount: 0,
      replyCount: 0,
    });

    // Increment reply count on parent comment
    await incrementReplyCount(ctx, args.parentId, 1);

    // Also increment overall comment count on post
    await incrementCommentCount(ctx, parent.postId, 1);

    const comment = await ctx.db.get(commentId);
    if (!comment) {
      throw new Error("Failed to create reply");
    }

    return await formatComment(ctx, comment, account._id);
  },
});

/**
 * Get all top-level comments for a post
 * Supports cursor-based pagination
 */
export const getByPost = query({
  args: {
    postId: v.id("posts"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()), // createdAt timestamp
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const viewer = await getViewer(ctx);

    const post = await ctx.db.get(args.postId);
    if (!post || post.deletedAt) {
      return { data: [], hasMore: false, nextCursor: null };
    }

    // Get top-level comments (no parentId)
    let comments: Doc<"comments">[] = [];

    if (args.cursor) {
      comments = await ctx.db
        .query("comments")
        .withIndex("by_post_createdAt", (q) => q.eq("postId", args.postId))
        .order("asc")
        .filter((q) => 
          q.and(
            q.gt(q.field("createdAt"), args.cursor!),
            q.eq(q.field("parentId"), undefined),
            q.eq(q.field("deletedAt"), undefined)
          )
        )
        .take(limit + 1);
    } else {
      comments = await ctx.db
        .query("comments")
        .withIndex("by_post_createdAt", (q) => q.eq("postId", args.postId))
        .order("asc")
        .filter((q) => 
          q.and(
            q.eq(q.field("parentId"), undefined),
            q.eq(q.field("deletedAt"), undefined)
          )
        )
        .take(limit + 1);
    }

    const hasMore = comments.length > limit;
    const data = comments.slice(0, limit);

    const formattedComments = await Promise.all(
      data.map((comment) => formatComment(ctx, comment, viewer?.account._id))
    );

    return {
      data: formattedComments,
      hasMore,
      nextCursor: hasMore && data.length > 0 ? data[data.length - 1].createdAt : null,
    };
  },
});

/**
 * Get replies to a specific comment
 */
export const getReplies = query({
  args: {
    parentId: v.id("comments"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()), // createdAt timestamp
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const viewer = await getViewer(ctx);

    const parent = await ctx.db.get(args.parentId);
    if (!parent || parent.deletedAt) {
      return { data: [], hasMore: false, nextCursor: null };
    }

    let replies: Doc<"comments">[] = [];

    if (args.cursor) {
      replies = await ctx.db
        .query("comments")
        .withIndex("by_parent_createdAt", (q) => q.eq("parentId", args.parentId))
        .order("asc")
        .filter((q) => 
          q.and(
            q.gt(q.field("createdAt"), args.cursor!),
            q.eq(q.field("deletedAt"), undefined)
          )
        )
        .take(limit + 1);
    } else {
      replies = await ctx.db
        .query("comments")
        .withIndex("by_parent_createdAt", (q) => q.eq("parentId", args.parentId))
        .order("asc")
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .take(limit + 1);
    }

    const hasMore = replies.length > limit;
    const data = replies.slice(0, limit);

    const formattedReplies = await Promise.all(
      data.map((comment) => formatComment(ctx, comment, viewer?.account._id))
    );

    return {
      data: formattedReplies,
      hasMore,
      nextCursor: hasMore && data.length > 0 ? data[data.length - 1].createdAt : null,
    };
  },
});

/**
 * Get a single comment by ID
 */
export const getById = query({
  args: {
    commentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment || comment.deletedAt) {
      return null;
    }

    const viewer = await getViewer(ctx);
    return await formatComment(ctx, comment, viewer?.account._id);
  },
});

/**
 * Toggle like on a comment
 */
export const toggleLike = mutation({
  args: {
    commentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const { account, profile } = await requireViewerWithProfile(ctx);
    
    // Rate limit: 30 likes per minute
    await checkRateLimit(ctx, "toggleLike", profile._id);

    const comment = await ctx.db.get(args.commentId);
    if (!comment || comment.deletedAt) {
      throw new Error("Comment not found");
    }

    // Check if already liked
    const existingLike = await ctx.db
      .query("commentLikes")
      .withIndex("by_comment_account", (q) =>
        q.eq("commentId", args.commentId).eq("accountId", account._id)
      )
      .first();

    if (existingLike) {
      // Unlike
      await ctx.db.delete(existingLike._id);
      await incrementCommentLikeCount(ctx, args.commentId, -1);
    } else {
      // Like
      await ctx.db.insert("commentLikes", {
        commentId: args.commentId,
        accountId: account._id,
        createdAt: Date.now(),
      });
      await incrementCommentLikeCount(ctx, args.commentId, 1);
    }

    const updatedComment = await ctx.db.get(args.commentId);
    return await formatComment(ctx, updatedComment!, account._id);
  },
});

/**
 * Soft delete a comment (only owner can delete)
 */
export const remove = mutation({
  args: {
    commentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const { account, profile } = await requireViewerWithProfile(ctx);
    
    // Rate limit: 10 deletes per minute
    await checkRateLimit(ctx, "deleteAction", profile._id);

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.authorId !== account._id) {
      throw new Error("You can only delete your own comments");
    }

    if (comment.deletedAt) {
      throw new Error("Comment is already deleted");
    }

    // Soft delete the comment
    await ctx.db.patch(args.commentId, {
      deletedAt: Date.now(),
      deletedBy: account._id,
    });

    // Decrement counts
    await incrementCommentCount(ctx, comment.postId, -1);
    if (comment.parentId) {
      await incrementReplyCount(ctx, comment.parentId, -1);
    }

    return { message: "Comment deleted successfully" };
  },
});

/**
 * Get comment count for a post
 */
export const getCountByPost = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      return 0;
    }
    return post.commentCount;
  },
});
