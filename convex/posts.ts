import { query, mutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
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

  // Use denormalized counts for O(1) performance
  const likesCount = post.likesCount ?? 0;
  const commentsCount = post.commentsCount ?? 0;

  // Check if current user liked this post
  let isLiked = false;
  if (currentUserId) {
    const like = await ctx.db
      .query("post_likes")
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
      text: text,
      audioUrl: audioUrl,
      likesCount: 0,
      commentsCount: 0,
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

    // Get all posts (all posts are top-level), ordered by creation time desc
    let posts: Doc<"posts">[] = [];
    
    if (args.cursor) {
      // Get the cursor post to find its creation time
      const cursorPost = await ctx.db.get(args.cursor);
      if (cursorPost) {
        // Get posts older than the cursor (all posts are top-level now)
        posts = await ctx.db
          .query("posts")
          .order("desc")
          .filter((q) => q.lt(q.field("_creationTime"), cursorPost._creationTime))
          .take(limit + 1);
      }
    } else {
      // First page - no cursor (all posts are top-level now)
      posts = await ctx.db
        .query("posts")
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
          .filter((q) => q.lt(q.field("_creationTime"), cursorPost._creationTime))
          .take(limit + 1);
      }
    } else {
      posts = await ctx.db
        .query("posts")
        .withIndex("by_author", (q) => q.eq("authorId", author._id))
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

    // Delete all likes for this post in batches to avoid memory issues
    let hasMoreLikes = true;
    while (hasMoreLikes) {
      const likes = await ctx.db
        .query("post_likes")
        .withIndex("by_post", (q) => q.eq("postId", args.postId))
        .take(100);
      if (likes.length === 0) break;
      for (const like of likes) {
        await ctx.db.delete(like._id);
      }
      hasMoreLikes = likes.length === 100;
    }

    // Delete all comments from the new comments table in batches
    let hasMoreComments = true;
    while (hasMoreComments) {
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_post", (q) => q.eq("postId", args.postId))
        .take(100);
      if (comments.length === 0) break;
      for (const comment of comments) {
        // Delete likes on comments in batches
        let hasMoreCommentLikes = true;
        while (hasMoreCommentLikes) {
          const commentLikes = await ctx.db
            .query("comment_likes")
            .withIndex("by_comment", (q) => q.eq("commentId", comment._id))
            .take(100);
          if (commentLikes.length === 0) break;
          for (const like of commentLikes) {
            await ctx.db.delete(like._id);
          }
          hasMoreCommentLikes = commentLikes.length === 100;
        }
        await ctx.db.delete(comment._id);
      }
      hasMoreComments = comments.length === 100;
    }

    // Comments are now in the separate comments table, handled above

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
      .query("post_likes")
      .withIndex("by_post_and_user", (q) =>
        q.eq("postId", args.postId).eq("userId", profile._id)
      )
      .first();

    if (existingLike) {
      // Unlike
      await ctx.db.delete(existingLike._id);
      // Decrement counter
      await ctx.db.patch(args.postId, {
        likesCount: Math.max(0, (post.likesCount ?? 0) - 1),
      });
    } else {
      // Like
      await ctx.db.insert("post_likes", {
        postId: args.postId,
        userId: profile._id,
      });
      // Increment counter
      await ctx.db.patch(args.postId, {
        likesCount: (post.likesCount ?? 0) + 1,
      });
    }

    // Return updated post (refetch to get updated count)
    const updatedPost = await ctx.db.get(args.postId);
    return await formatPost(ctx, updatedPost!, profile._id);
  },
});

/**
 * Get users who liked a post
 * Equivalent to GET /posts/:postId/likes
 */
/**
 * Get users who liked a post
 * Supports cursor-based pagination using Convex .paginate()
 */
export const getLikes = query({
  args: {
    postId: v.id("posts"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("post_likes")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("desc")
      .paginate(args.paginationOpts);

    const users = await Promise.all(
      result.page.map(async (like) => {
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

    return {
      ...result,
      page: users.filter(Boolean),
    };
  },
});

