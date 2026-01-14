import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import { 
  getViewer,
  requireViewerWithProfile,
  isFriend,
  validateTextLength,
  sanitizeText,
  incrementPostLikeCount,
  incrementPostCount,
  MAX_LENGTHS,
} from "./helpers";
import { checkRateLimit } from "./rateLimiter";

// Helper to format a post for API response
async function formatPost(
  ctx: any,
  post: Doc<"posts">,
  currentAccountId?: Id<"accounts">
) {
  // Get author profile
  const authorProfile = await ctx.db
    .query("profiles")
    .withIndex("by_accountId", (q: any) => q.eq("accountId", post.authorId))
    .first();

  // Check if current user liked this post
  let isLiked = false;
  if (currentAccountId) {
    const like = await ctx.db
      .query("postLikes")
      .withIndex("by_post_account", (q: any) =>
        q.eq("postId", post._id).eq("accountId", currentAccountId)
      )
      .first();
    isLiked = !!like;
  }

  return {
    id: post._id,
    author_id: post.authorId,
    content: post.content,
    media_urls: post.mediaUrls ?? [],
    visibility: post.visibility,
    created_at: new Date(post.createdAt).toISOString(),
    author: authorProfile
      ? {
          id: authorProfile._id,
          account_id: authorProfile.accountId,
          username: authorProfile.username,
          display_name: authorProfile.displayName ?? "",
          avatar_url: authorProfile.avatarUrl ?? "",
        }
      : null,
    likes_count: post.likeCount,
    comments_count: post.commentCount,
    is_liked: isLiked,
    is_deleted: !!post.deletedAt,
  };
}

/**
 * Create a new post
 * Equivalent to POST /posts
 */
export const create = mutation({
  args: {
    content: v.string(),
    visibility: v.optional(v.union(v.literal("public"), v.literal("friends"), v.literal("private"))),
  },
  handler: async (ctx, args) => {
    const { account, profile } = await requireViewerWithProfile(ctx);
    
    // Rate limit: 5 posts per minute
    await checkRateLimit(ctx, "createPost", profile._id);

    // Sanitize and validate inputs
    const content = sanitizeText(args.content);
    
    if (!content) {
      throw new Error("Post content is required");
    }
    
    validateTextLength(content, MAX_LENGTHS.POST_TEXT, "Post content");

    const postId = await ctx.db.insert("posts", {
      authorId: account._id,
      content: content,
      visibility: args.visibility ?? "public",
      createdAt: Date.now(),
      likeCount: 0,
      commentCount: 0,
    });

    // Increment post count
    await incrementPostCount(ctx, account._id);

    const post = await ctx.db.get(postId);
    if (!post) {
      throw new Error("Failed to create post");
    }

    return await formatPost(ctx, post, account._id);
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
    if (!post || post.deletedAt) {
      return null;
    }

    const viewer = await getViewer(ctx);
    return await formatPost(ctx, post, viewer?.account._id);
  },
});

/**
 * Get feed (public posts + friends' posts if authenticated)
 * Equivalent to GET /posts/feed
 * Supports cursor-based pagination
 */
export const getFeed = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()), // createdAt timestamp for cursor
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const viewer = await getViewer(ctx);

    // Get public posts
    let postsQuery = ctx.db
      .query("posts")
      .withIndex("by_createdAt")
      .order("desc");

    let posts: Doc<"posts">[] = [];

    if (args.cursor) {
      posts = await postsQuery
        .filter((q) => 
          q.and(
            q.lt(q.field("createdAt"), args.cursor!),
            q.eq(q.field("deletedAt"), undefined)
          )
        )
        .take(limit + 1);
    } else {
      posts = await postsQuery
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .take(limit + 1);
    }

    // Filter by visibility
    const visiblePosts: Doc<"posts">[] = [];
    for (const post of posts) {
      if (post.visibility === "public") {
        visiblePosts.push(post);
      } else if (viewer && post.visibility === "friends") {
        // Check if viewer is friends with author or is the author
        if (post.authorId === viewer.account._id) {
          visiblePosts.push(post);
        } else {
          const areFriends = await isFriend(ctx, viewer.account._id, post.authorId);
          if (areFriends) {
            visiblePosts.push(post);
          }
        }
      } else if (viewer && post.visibility === "private" && post.authorId === viewer.account._id) {
        visiblePosts.push(post);
      }
      
      if (visiblePosts.length > limit) break;
    }

    const hasMore = visiblePosts.length > limit;
    const data = visiblePosts.slice(0, limit);

    const formattedPosts = await Promise.all(
      data.map((post) => formatPost(ctx, post, viewer?.account._id))
    );

    return {
      data: formattedPosts,
      hasMore,
      nextCursor: hasMore && data.length > 0 ? data[data.length - 1].createdAt : null,
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
    cursor: v.optional(v.number()), // createdAt timestamp
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const viewer = await getViewer(ctx);

    // Find the user's profile
    const authorProfile = await ctx.db
      .query("profiles")
      .withIndex("by_usernameLower", (q) => q.eq("usernameLower", args.username.toLowerCase()))
      .first();

    if (!authorProfile) {
      return { data: [], hasMore: false, nextCursor: null };
    }

    // Get posts by this author
    let posts: Doc<"posts">[] = [];
    
    if (args.cursor) {
      posts = await ctx.db
        .query("posts")
        .withIndex("by_author_createdAt", (q) => q.eq("authorId", authorProfile.accountId))
        .order("desc")
        .filter((q) => 
          q.and(
            q.lt(q.field("createdAt"), args.cursor!),
            q.eq(q.field("deletedAt"), undefined)
          )
        )
        .take(limit + 1);
    } else {
      posts = await ctx.db
        .query("posts")
        .withIndex("by_author_createdAt", (q) => q.eq("authorId", authorProfile.accountId))
        .order("desc")
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .take(limit + 1);
    }

    // Filter by visibility based on viewer's relationship
    const isOwner = viewer?.account._id === authorProfile.accountId;
    const areFriends = viewer ? await isFriend(ctx, viewer.account._id, authorProfile.accountId) : false;

    const visiblePosts = posts.filter((post) => {
      if (isOwner) return true;
      if (post.visibility === "public") return true;
      if (post.visibility === "friends" && areFriends) return true;
      return false;
    });

    const hasMore = visiblePosts.length > limit;
    const data = visiblePosts.slice(0, limit);

    const formattedPosts = await Promise.all(
      data.map((post) => formatPost(ctx, post, viewer?.account._id))
    );

    return {
      data: formattedPosts,
      hasMore,
      nextCursor: hasMore && data.length > 0 ? data[data.length - 1].createdAt : null,
    };
  },
});

/**
 * Soft delete a post (only owner can delete)
 * Equivalent to DELETE /posts/:postId
 */
export const remove = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const { account, profile } = await requireViewerWithProfile(ctx);
    
    // Rate limit: 10 deletes per minute
    await checkRateLimit(ctx, "deleteAction", profile._id);

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    if (post.authorId !== account._id) {
      throw new Error("You can only delete your own posts");
    }

    if (post.deletedAt) {
      throw new Error("Post is already deleted");
    }

    // Soft delete the post
    await ctx.db.patch(args.postId, {
      deletedAt: Date.now(),
      deletedBy: account._id,
    });

    // Decrement post count
    await incrementPostCount(ctx, account._id, -1);

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
    const { account, profile } = await requireViewerWithProfile(ctx);
    
    // Rate limit: 30 likes per minute
    await checkRateLimit(ctx, "toggleLike", profile._id);

    const post = await ctx.db.get(args.postId);
    if (!post || post.deletedAt) {
      throw new Error("Post not found");
    }

    // Check if already liked
    const existingLike = await ctx.db
      .query("postLikes")
      .withIndex("by_post_account", (q) =>
        q.eq("postId", args.postId).eq("accountId", account._id)
      )
      .first();

    if (existingLike) {
      // Unlike
      await ctx.db.delete(existingLike._id);
      await incrementPostLikeCount(ctx, args.postId, -1);
    } else {
      // Like
      await ctx.db.insert("postLikes", {
        postId: args.postId,
        accountId: account._id,
        createdAt: Date.now(),
      });
      await incrementPostLikeCount(ctx, args.postId, 1);
    }

    // Return updated post
    const updatedPost = await ctx.db.get(args.postId);
    return await formatPost(ctx, updatedPost!, account._id);
  },
});

/**
 * Get users who liked a post
 * Equivalent to GET /posts/:postId/likes
 */
export const getLikes = query({
  args: {
    postId: v.id("posts"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    
    const likes = await ctx.db
      .query("postLikes")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("desc")
      .take(limit);

    const users = await Promise.all(
      likes.map(async (like) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_accountId", (q) => q.eq("accountId", like.accountId))
          .first();
        
        if (!profile) return null;
        return {
          id: profile._id,
          account_id: profile.accountId,
          username: profile.username,
          display_name: profile.displayName ?? "",
          avatar_url: profile.avatarUrl ?? "",
          liked_at: new Date(like.createdAt).toISOString(),
        };
      })
    );

    return users.filter(Boolean);
  },
});
