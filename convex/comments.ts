import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import {
  getCurrentProfile,
  requireAuth,
  validateTextLength,
  validateUrl,
  sanitizeText,
  MAX_LENGTHS,
} from "./helpers";
import { checkRateLimit } from "./rateLimiter";

/**
 * Generate the next path segment for a comment.
 * Paths are 4-digit zero-padded numbers (0001, 0002, etc.)
 */
function generateNextSegment(existingCount: number): string {
  return String(existingCount + 1).padStart(4, "0");
}

/**
 * Format a comment for API response
 */
async function formatComment(
  ctx: any,
  comment: Doc<"comments">,
  currentUserId?: Id<"profiles">
) {
  const author = await ctx.db.get(comment.authorId);

  // Use denormalized counts for O(1) performance
  const likesCount = comment.likesCount ?? 0;
  const repliesCount = comment.repliesCount ?? 0;

  // Check if current user liked this comment
  let isLiked = false;
  if (currentUserId) {
    const like = await ctx.db
      .query("comment_likes")
      .withIndex("by_comment_and_user", (q: any) =>
        q.eq("commentId", comment._id).eq("userId", currentUserId)
      )
      .first();
    isLiked = !!like;
  }

  return {
    id: comment._id,
    post_id: comment.postId,
    author_id: comment.authorId,
    parent_id: comment.parentId ?? null,
    path: comment.path,
    depth: comment.depth,
    text: comment.text ?? "",
    audio_url: comment.audioUrl ?? "",
    created_at: new Date(comment._creationTime).toISOString(),
    author: author
      ? {
          id: author._id,
          username: author.username,
          display_name: author.displayName ?? "",
          avatar_url: author.avatarUrl ?? "",
        }
      : null,
    likes_count: likesCount,
    replies_count: repliesCount,
    is_liked: isLiked,
  };
}

/**
 * Create a top-level comment on a post
 */
export const create = mutation({
  args: {
    postId: v.id("posts"),
    text: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    
    // Rate limit: 10 comments per minute
    await checkRateLimit(ctx, "createComment", profile._id);

    // Verify post exists
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Sanitize and validate inputs
    const text = sanitizeText(args.text);
    const audioUrl = args.audioUrl;

    validateTextLength(text, MAX_LENGTHS.COMMENT_TEXT, "Comment text");
    validateUrl(audioUrl);

    if (!text && !audioUrl) {
      throw new Error("Comment must have either text or audio");
    }

    // Get parent post for atomic sequence counter
    const parentPost = await ctx.db.get(args.postId);
    if (!parentPost) {
      throw new Error("Post not found");
    }

    // Atomically increment sequence counter to generate unique path
    // This guarantees no duplicate paths even under concurrent comment creation
    const nextSeq = (parentPost.nextCommentSequence ?? 0) + 1;
    await ctx.db.patch(args.postId, {
      nextCommentSequence: nextSeq,
      commentsCount: (parentPost.commentsCount ?? 0) + 1,
    });

    // Generate path using the atomic sequence
    const path = generateNextSegment(nextSeq);

    const commentId = await ctx.db.insert("comments", {
      postId: args.postId,
      authorId: profile._id,
      parentId: undefined,
      path,
      depth: 0,
      text,
      audioUrl,
      likesCount: 0,
      repliesCount: 0,
      nextReplySequence: 0, // Initialize counter for this comment's replies
    });

    const comment = await ctx.db.get(commentId);
    if (!comment) {
      throw new Error("Failed to create comment");
    }

    return await formatComment(ctx, comment, profile._id);
  },
});

/**
 * Reply to an existing comment (threaded)
 */
export const reply = mutation({
  args: {
    parentId: v.id("comments"),
    text: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    
    // Rate limit: 10 replies per minute
    await checkRateLimit(ctx, "replyToComment", profile._id);

    // Verify parent comment exists
    const parent = await ctx.db.get(args.parentId);
    if (!parent) {
      throw new Error("Parent comment not found");
    }

    // Sanitize and validate inputs
    const text = sanitizeText(args.text);
    const audioUrl = args.audioUrl;

    validateTextLength(text, MAX_LENGTHS.COMMENT_TEXT, "Comment text");
    validateUrl(audioUrl);

    if (!text && !audioUrl) {
      throw new Error("Reply must have either text or audio");
    }

    // Atomically increment sequence counter to generate unique path
    // This guarantees no duplicate paths even under concurrent reply creation
    const nextSeq = (parent.nextReplySequence ?? 0) + 1;
    await ctx.db.patch(args.parentId, {
      nextReplySequence: nextSeq,
      repliesCount: (parent.repliesCount ?? 0) + 1,
    });

    // Generate path using the atomic sequence
    const newSegment = generateNextSegment(nextSeq);
    const path = `${parent.path}.${newSegment}`;

    const commentId = await ctx.db.insert("comments", {
      postId: parent.postId,
      authorId: profile._id,
      parentId: args.parentId,
      path,
      depth: parent.depth + 1,
      text,
      audioUrl,
      likesCount: 0,
      repliesCount: 0,
      nextReplySequence: 0, // Initialize counter for this comment's replies
    });

    const comment = await ctx.db.get(commentId);
    if (!comment) {
      throw new Error("Failed to create reply");
    }

    return await formatComment(ctx, comment, profile._id);
  },
});

/**
 * Get all comments for a post, ordered by path (tree order)
 * Supports cursor-based pagination
 */
export const getByPost = query({
  args: {
    postId: v.id("posts"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()), // Path-based cursor
    maxDepth: v.optional(v.number()), // Optional: limit nesting depth
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const currentProfile = await getCurrentProfile(ctx);

    const post = await ctx.db.get(args.postId);
    if (!post) {
      return { data: [], hasMore: false, nextCursor: null };
    }

    let comments: Doc<"comments">[] = [];
    let hasMore = false;

    if (args.maxDepth !== undefined) {
      // When maxDepth is specified, fetch in batches until we have enough
      // comments after filtering by depth (prevents returning fewer than limit)
      const batchSize = 100;
      let lastPath = args.cursor ?? null;
      const matchingComments: Doc<"comments">[] = [];

      // Fetch batches until we have enough matching comments or run out of data
      while (matchingComments.length <= limit) {
        let query = ctx.db
          .query("comments")
          .withIndex("by_post_and_path", (q) => q.eq("postId", args.postId));

        if (lastPath !== null) {
          query = query.filter((q) => q.gt(q.field("path"), lastPath!));
        }

        const batch = await query.take(batchSize);

        if (batch.length === 0) {
          // No more data
          hasMore = false;
          break;
        }

        // Filter by maxDepth
        const filtered = batch.filter((c) => c.depth <= args.maxDepth!);
        matchingComments.push(...filtered);

        // Update lastPath for next iteration
        lastPath = batch[batch.length - 1].path;

        // Check if we have enough results
        if (matchingComments.length > limit) {
          hasMore = true;
          break;
        }

        // If batch was smaller than batchSize, we've exhausted the data
        if (batch.length < batchSize) {
          hasMore = false;
          break;
        }
      }

      comments = matchingComments.slice(0, limit + 1);
      hasMore = comments.length > limit;
      comments = comments.slice(0, limit);
    } else {
      // No maxDepth filter: use efficient single-batch pagination
      const commentsQuery = ctx.db
        .query("comments")
        .withIndex("by_post_and_path", (q) => q.eq("postId", args.postId));

      if (args.cursor) {
        // Get comments after the cursor path
        comments = await commentsQuery
          .filter((q) => q.gt(q.field("path"), args.cursor!))
          .take(limit + 1);
      } else {
        comments = await commentsQuery.take(limit + 1);
      }

      hasMore = comments.length > limit;
      comments = comments.slice(0, limit);
    }

    const formattedComments = await Promise.all(
      comments.map((comment) => formatComment(ctx, comment, currentProfile?._id))
    );

    return {
      data: formattedComments,
      hasMore,
      nextCursor: hasMore && comments.length > 0 ? comments[comments.length - 1].path : null,
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
    cursor: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const currentProfile = await getCurrentProfile(ctx);

    const parent = await ctx.db.get(args.parentId);
    if (!parent) {
      return { data: [], hasMore: false, nextCursor: null };
    }

    let replies: Doc<"comments">[] = [];

    if (args.cursor) {
      const cursorComment = await ctx.db.get(args.cursor);
      if (cursorComment) {
        replies = await ctx.db
          .query("comments")
          .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
          .filter((q) =>
            q.gt(q.field("_creationTime"), cursorComment._creationTime)
          )
          .take(limit + 1);
      }
    } else {
      replies = await ctx.db
        .query("comments")
        .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
        .take(limit + 1);
    }

    const hasMore = replies.length > limit;
    const data = replies.slice(0, limit);

    const formattedReplies = await Promise.all(
      data.map((comment) => formatComment(ctx, comment, currentProfile?._id))
    );

    return {
      data: formattedReplies,
      hasMore,
      nextCursor: hasMore && data.length > 0 ? data[data.length - 1]._id : null,
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
    if (!comment) {
      return null;
    }

    const currentProfile = await getCurrentProfile(ctx);
    return await formatComment(ctx, comment, currentProfile?._id);
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
    const profile = await requireAuth(ctx);
    
    // Rate limit: 30 likes per minute
    await checkRateLimit(ctx, "toggleLike", profile._id);

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    // Check if already liked
    const existingLike = await ctx.db
      .query("comment_likes")
      .withIndex("by_comment_and_user", (q) =>
        q.eq("commentId", args.commentId).eq("userId", profile._id)
      )
      .first();

    if (existingLike) {
      // Unlike
      await ctx.db.delete(existingLike._id);
      // Decrement counter
      await ctx.db.patch(args.commentId, {
        likesCount: Math.max(0, (comment.likesCount ?? 0) - 1),
      });
    } else {
      // Like
      await ctx.db.insert("comment_likes", {
        commentId: args.commentId,
        userId: profile._id,
      });
      // Increment counter
      await ctx.db.patch(args.commentId, {
        likesCount: (comment.likesCount ?? 0) + 1,
      });
    }

    // Refetch comment to get updated count
    const updatedComment = await ctx.db.get(args.commentId);
    return await formatComment(ctx, updatedComment!, profile._id);
  },
});

/**
 * Delete a comment (only owner can delete)
 * Optionally deletes all replies (cascade)
 */
export const remove = mutation({
  args: {
    commentId: v.id("comments"),
    cascade: v.optional(v.boolean()), // If true, delete all replies too
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    
    // Rate limit: 10 deletes per minute
    await checkRateLimit(ctx, "deleteAction", profile._id);

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.authorId !== profile._id) {
      throw new Error("You can only delete your own comments");
    }

    // Delete likes on this comment in batches
    let hasMoreLikes = true;
    while (hasMoreLikes) {
      const likes = await ctx.db
        .query("comment_likes")
        .withIndex("by_comment", (q) => q.eq("commentId", args.commentId))
        .take(100);
      if (likes.length === 0) break;
      for (const like of likes) {
        await ctx.db.delete(like._id);
      }
      hasMoreLikes = likes.length === 100;
    }

    if (args.cascade) {
      // Get all comments in batches and filter by path prefix to find descendants
      let hasMoreComments = true;
      let lastCreationTime: number | null = null;
      let totalDescendantsDeleted = 0;

      while (hasMoreComments) {
        let query = ctx.db
          .query("comments")
          .withIndex("by_post", (q) => q.eq("postId", comment.postId))
          .order("desc");

        if (lastCreationTime !== null) {
          query = query.filter((q) => q.lt(q.field("_creationTime"), lastCreationTime!));
        }

        const batch = await query.take(100);
        if (batch.length === 0) break;

        const descendants = batch.filter(
          (c) => c.path.startsWith(comment.path + ".") && c._id !== comment._id
        );

        for (const descendant of descendants) {
          // Delete likes on descendant in batches
          let hasMoreDescendantLikes = true;
          while (hasMoreDescendantLikes) {
            const descendantLikes = await ctx.db
              .query("comment_likes")
              .withIndex("by_comment", (q) => q.eq("commentId", descendant._id))
              .take(100);
            if (descendantLikes.length === 0) break;
            for (const like of descendantLikes) {
              await ctx.db.delete(like._id);
            }
            hasMoreDescendantLikes = descendantLikes.length === 100;
          }

          // Decrement parent's reply counter for each descendant at depth 1
          if (descendant.parentId && descendant.depth === comment.depth + 1) {
            const parentOfDescendant = await ctx.db.get(descendant.parentId);
            if (parentOfDescendant) {
              await ctx.db.patch(descendant.parentId, {
                repliesCount: Math.max(0, (parentOfDescendant.repliesCount ?? 0) - 1),
              });
            }
          }

          await ctx.db.delete(descendant._id);
          totalDescendantsDeleted++;
        }

        lastCreationTime = batch[batch.length - 1]._creationTime;
        hasMoreComments = batch.length === 100;
      }
    }

    // Decrement parent comment's replies count (if it has a parent)
    if (comment.parentId) {
      const parentComment = await ctx.db.get(comment.parentId);
      if (parentComment) {
        await ctx.db.patch(comment.parentId, {
          repliesCount: Math.max(0, (parentComment.repliesCount ?? 0) - 1),
        });
      }
    } else {
      // Top-level comment - decrement post's comments count
      const postDoc = await ctx.db.get(comment.postId);
      if (postDoc) {
        await ctx.db.patch(comment.postId, {
          commentsCount: Math.max(0, (postDoc.commentsCount ?? 0) - 1),
        });
      }
    }

    // Delete the comment itself
    await ctx.db.delete(args.commentId);

    return { message: "Comment deleted successfully" };
  },
});

/**
 * Get comment count for a post (for display in post cards)
 */
export const getCountByPost = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    // Use denormalized counter for O(1) performance instead of .collect()
    // This prevents OOM issues on posts with many comments
    const post = await ctx.db.get(args.postId);
    if (!post) return 0;
    return post.commentsCount ?? 0;
  },
});

