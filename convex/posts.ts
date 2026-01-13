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

// Helper to format a post for API response
async function formatPost(
  ctx: any,
  post: any,
  currentUserId?: Id<"profiles">
) {
  const author = await ctx.db.get(post.authorId);

  // Get likes count
  const likes = await ctx.db
    .query("likes")
    .withIndex("by_post", (q: any) => q.eq("postId", post._id))
    .collect();
  const likesCount = likes.length;

  // Get comments count from the new comments table
  const comments = await ctx.db
    .query("comments")
    .withIndex("by_post", (q: any) => q.eq("postId", post._id))
    .collect();
  const commentsCount = comments.length;

  // Check if current user liked this post
  let isLiked = false;
  if (currentUserId) {
    const like = await ctx.db
      .query("likes")
      .withIndex("by_post_and_user", (q: any) =>
        q.eq("postId", post._id).eq("userId", currentUserId)
      )
      .first();
    isLiked = !!like;
  }

  return {
    id: post._id,
    author_id: post.authorId,
    text: post.text ?? "",
    audio_url: post.audioUrl ?? "",
    created_at: new Date(post._creationTime).toISOString(),
    author: author
      ? {
          id: author._id,
          username: author.username,
          display_name: author.displayName ?? "",
          avatar_url: author.avatarUrl ?? "",
        }
      : null,
    likes_count: likesCount,
    comments_count: commentsCount,
    is_liked: isLiked,
  };
}

/**
 * Create a new post
 * Equivalent to POST /posts
 */
export const create = mutation({
  args: {
    text: v.optional(v.string()),
    audio_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    
    // Rate limit: 5 posts per minute
    await checkRateLimit(ctx, "createPost", profile._id);

    // Sanitize and validate inputs
    const text = sanitizeText(args.text);
    const audioUrl = args.audio_url;
    
    validateTextLength(text, MAX_LENGTHS.POST_TEXT, "Post text");
    validateUrl(audioUrl);

    // Text or audio must be provided
    if (!text && !audioUrl) {
      throw new Error("Post must have either text or audio");
    }

    const postId = await ctx.db.insert("posts", {
      authorId: profile._id,
      parentId: undefined,
      text: text,
      audioUrl: audioUrl,
    });

    const post = await ctx.db.get(postId);
    if (!post) {
      throw new Error("Failed to create post");
    }

    return await formatPost(ctx, post, profile._id);
  },
});

/**
 * Get a post by ID
 * Equivalent to GET /posts/:postId
 */
export const getById = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      return null;
    }

    const currentProfile = await getCurrentProfile(ctx);
    return await formatPost(ctx, post, currentProfile?._id);
  },
});

/**
 * Get feed (all top-level posts)
 * Equivalent to GET /posts/feed
 * Supports cursor-based pagination
 */
export const getFeed = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("posts")),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const currentProfile = await getCurrentProfile(ctx);

    // Get all top-level posts (no parentId), ordered by creation time desc
    let posts: Doc<"posts">[] = [];
    
    if (args.cursor) {
      // Get the cursor post to find its creation time
      const cursorPost = await ctx.db.get(args.cursor);
      if (cursorPost) {
        // Get posts older than the cursor
        posts = await ctx.db
          .query("posts")
          .withIndex("by_parent", (q) => q.eq("parentId", undefined))
          .order("desc")
          .filter((q) => q.lt(q.field("_creationTime"), cursorPost._creationTime))
          .take(limit + 1);
      }
    } else {
      // First page - no cursor
      posts = await ctx.db
        .query("posts")
        .withIndex("by_parent", (q) => q.eq("parentId", undefined))
        .order("desc")
        .take(limit + 1);
    }

    const hasMore = posts.length > limit;
    const data = posts.slice(0, limit);

    const formattedPosts = await Promise.all(
      data.map((post) => formatPost(ctx, post, currentProfile?._id))
    );

    return {
      data: formattedPosts,
      hasMore,
      nextCursor: hasMore ? data[data.length - 1]._id : null,
    };
  },
});

/**
 * Get posts by username
 * Equivalent to GET /profiles/:username/posts
 * Supports cursor-based pagination
 */
export const getByUsername = query({
  args: {
    username: v.string(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("posts")),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const currentProfile = await getCurrentProfile(ctx);

    // Find the user
    const author = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (!author) {
      return { data: [], hasMore: false, nextCursor: null };
    }

    let posts: Doc<"posts">[] = [];
    
    if (args.cursor) {
      const cursorPost = await ctx.db.get(args.cursor);
      if (cursorPost) {
        posts = await ctx.db
          .query("posts")
          .withIndex("by_author", (q) => q.eq("authorId", author._id))
          .order("desc")
          .filter((q) => 
            q.and(
              q.eq(q.field("parentId"), undefined),
              q.lt(q.field("_creationTime"), cursorPost._creationTime)
            )
          )
          .take(limit + 1);
      }
    } else {
      posts = await ctx.db
        .query("posts")
        .withIndex("by_author", (q) => q.eq("authorId", author._id))
        .order("desc")
        .filter((q) => q.eq(q.field("parentId"), undefined))
        .take(limit + 1);
    }

    const hasMore = posts.length > limit;
    const data = posts.slice(0, limit);

    const formattedPosts = await Promise.all(
      data.map((post) => formatPost(ctx, post, currentProfile?._id))
    );

    return {
      data: formattedPosts,
      hasMore,
      nextCursor: hasMore ? data[data.length - 1]._id : null,
    };
  },
});

/**
 * Delete a post (only owner can delete)
 * Equivalent to DELETE /posts/:postId
 */
export const remove = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    
    // Rate limit: 10 deletes per minute
    await checkRateLimit(ctx, "deleteAction", profile._id);

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    if (post.authorId !== profile._id) {
      throw new Error("You can only delete your own posts");
    }

    // Delete all likes for this post
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    for (const like of likes) {
      await ctx.db.delete(like._id);
    }

    // Delete all comments from the new comments table
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    for (const comment of comments) {
      // Delete likes on comments
      const commentLikes = await ctx.db
        .query("comment_likes")
        .withIndex("by_comment", (q) => q.eq("commentId", comment._id))
        .collect();
      for (const like of commentLikes) {
        await ctx.db.delete(like._id);
      }
      await ctx.db.delete(comment._id);
    }

    // Also delete legacy comments (posts with parentId) for migration period
    const legacyComments = await ctx.db
      .query("posts")
      .withIndex("by_parent", (q) => q.eq("parentId", args.postId))
      .collect();
    for (const comment of legacyComments) {
      const legacyCommentLikes = await ctx.db
        .query("likes")
        .withIndex("by_post", (q) => q.eq("postId", comment._id))
        .collect();
      for (const like of legacyCommentLikes) {
        await ctx.db.delete(like._id);
      }
      await ctx.db.delete(comment._id);
    }

    // Delete the post
    await ctx.db.delete(args.postId);

    return { message: "Post deleted successfully" };
  },
});

/**
 * Toggle like on a post
 * Equivalent to POST /posts/:postId/like
 */
export const toggleLike = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    
    // Rate limit: 30 likes per minute
    await checkRateLimit(ctx, "toggleLike", profile._id);

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Check if already liked
    const existingLike = await ctx.db
      .query("likes")
      .withIndex("by_post_and_user", (q) =>
        q.eq("postId", args.postId).eq("userId", profile._id)
      )
      .first();

    if (existingLike) {
      // Unlike
      await ctx.db.delete(existingLike._id);
    } else {
      // Like
      await ctx.db.insert("likes", {
        postId: args.postId,
        userId: profile._id,
      });
    }

    // Return updated post
    return await formatPost(ctx, post, profile._id);
  },
});

/**
 * Get users who liked a post
 * Equivalent to GET /posts/:postId/likes
 */
export const getLikes = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    const users = await Promise.all(
      likes.map(async (like) => {
        const user = await ctx.db.get(like.userId);
        if (!user) return null;
        return {
          id: user._id,
          username: user.username,
          display_name: user.displayName ?? "",
          avatar_url: user.avatarUrl ?? "",
          liked_at: new Date(like._creationTime).toISOString(),
        };
      })
    );

    return users.filter(Boolean);
  },
});

/**
 * Get comments for a post
 * DEPRECATED: Use comments.getByPost instead for threaded comments
 * This is kept for backward compatibility during migration
 */
export const getComments = query({
  args: {
    postId: v.id("posts"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()), // Changed to string to support path-based cursors
    order: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const currentProfile = await getCurrentProfile(ctx);

    const post = await ctx.db.get(args.postId);
    if (!post) {
      return { data: [], hasMore: false, nextCursor: null };
    }

    // Use new comments table with path-based ordering
    let comments: Doc<"comments">[] = [];

    if (args.cursor) {
      comments = await ctx.db
        .query("comments")
        .withIndex("by_post_and_path", (q) => q.eq("postId", args.postId))
        .filter((q) => q.gt(q.field("path"), args.cursor!))
        .take(limit + 1);
    } else {
      comments = await ctx.db
        .query("comments")
        .withIndex("by_post_and_path", (q) => q.eq("postId", args.postId))
        .take(limit + 1);
    }

    const hasMore = comments.length > limit;
    const data = comments.slice(0, limit);

    const formattedComments = await Promise.all(
      data.map(async (comment) => {
        const author = (await ctx.db.get(comment.authorId)) as Doc<"profiles"> | null;

        // Get likes count from new comment_likes table
        const likes = await ctx.db
          .query("comment_likes")
          .withIndex("by_comment", (q) => q.eq("commentId", comment._id))
          .collect();

        // Check if current user liked this comment
        let isLiked = false;
        if (currentProfile) {
          const like = await ctx.db
            .query("comment_likes")
            .withIndex("by_comment_and_user", (q) =>
              q.eq("commentId", comment._id).eq("userId", currentProfile._id)
            )
            .first();
          isLiked = !!like;
        }

        return {
          id: comment._id,
          author_id: comment.authorId,
          parent_id: comment.parentId ?? null,
          path: comment.path,
          depth: comment.depth,
          author: author
            ? {
                id: author._id,
                username: author.username,
                display_name: author.displayName ?? "",
                avatar_url: author.avatarUrl ?? "",
              }
            : null,
          text: comment.text ?? "",
          audio_url: comment.audioUrl ?? "",
          created_at: new Date(comment._creationTime).toISOString(),
          likes_count: likes.length,
          is_liked: isLiked,
        };
      })
    );

    return {
      data: formattedComments,
      hasMore,
      nextCursor: hasMore && data.length > 0 ? data[data.length - 1].path : null,
    };
  },
});

/**
 * Create a comment on a post
 * DEPRECATED: Use comments.create instead for threaded comments
 * This is kept for backward compatibility during migration
 */
export const createComment = mutation({
  args: {
    postId: v.id("posts"),
    content: v.optional(v.string()),
    audio_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    
    // Rate limit: 10 comments per minute
    await checkRateLimit(ctx, "createComment", profile._id);

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // Sanitize and validate inputs
    const content = sanitizeText(args.content);
    const audioUrl = args.audio_url;

    validateTextLength(content, MAX_LENGTHS.COMMENT_TEXT, "Comment text");
    validateUrl(audioUrl);

    // Content or audio must be provided
    if (!content && !audioUrl) {
      throw new Error("Comment must have either content or audio_url");
    }

    // Count existing top-level comments to generate path
    const existingTopLevel = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .filter((q) => q.eq(q.field("depth"), 0))
      .collect();

    const path = String(existingTopLevel.length + 1).padStart(4, "0");

    // Create comment in the new comments table
    const commentId = await ctx.db.insert("comments", {
      postId: args.postId,
      authorId: profile._id,
      parentId: undefined,
      path,
      depth: 0,
      text: content,
      audioUrl: audioUrl,
    });

    const comment = await ctx.db.get(commentId);
    if (!comment) {
      throw new Error("Failed to create comment");
    }

    return {
      id: comment._id,
      author_id: comment.authorId,
      parent_id: null,
      path: comment.path,
      depth: 0,
      author: {
        id: profile._id,
        username: profile.username,
        display_name: profile.displayName ?? "",
        avatar_url: profile.avatarUrl ?? "",
      },
      text: comment.text ?? "",
      audio_url: comment.audioUrl ?? "",
      created_at: new Date(comment._creationTime).toISOString(),
      likes_count: 0,
      is_liked: false,
    };
  },
});

