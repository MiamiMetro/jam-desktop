import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Profiles table - equivalent to Prisma Profile model
  profiles: defineTable({
    // Supabase Auth user ID (stored as string, not Convex ID)
    supabaseId: v.string(),
    username: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    dmPrivacy: v.union(v.literal("friends"), v.literal("everyone")),
  })
    .index("by_supabase_id", ["supabaseId"])
    .index("by_username", ["username"]),

  // Posts table - top-level posts only (comments moved to separate table)
  posts: defineTable({
    authorId: v.id("profiles"),
    // DEPRECATED: parentId kept for migration, will be removed
    parentId: v.optional(v.id("posts")),
    text: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
  })
    .index("by_author", ["authorId"])
    .index("by_parent", ["parentId"]),

  // Comments table - threaded comments with path-based ordering
  // Path format: "0001.0002.0003" enables efficient tree operations
  comments: defineTable({
    postId: v.id("posts"),
    authorId: v.id("profiles"),
    parentId: v.optional(v.id("comments")), // For replies to other comments
    path: v.string(), // e.g. "0001", "0001.0001", "0001.0001.0001"
    depth: v.number(), // 0 for top-level, 1 for first reply, etc.
    text: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
  })
    .index("by_post", ["postId"])
    .index("by_post_and_path", ["postId", "path"])
    .index("by_author", ["authorId"])
    .index("by_parent", ["parentId"]),

  // Likes table - for posts
  likes: defineTable({
    postId: v.id("posts"),
    userId: v.id("profiles"),
  })
    .index("by_post", ["postId"])
    .index("by_user", ["userId"])
    .index("by_post_and_user", ["postId", "userId"]),

  // Comment likes table - separate from post likes to avoid cross-invalidation
  comment_likes: defineTable({
    commentId: v.id("comments"),
    userId: v.id("profiles"),
  })
    .index("by_comment", ["commentId"])
    .index("by_user", ["userId"])
    .index("by_comment_and_user", ["commentId", "userId"]),

  // Friends table - for friend requests and friendships
  friends: defineTable({
    userId: v.id("profiles"), // The one who sent the request
    friendId: v.id("profiles"), // The one who received the request
    status: v.union(v.literal("pending"), v.literal("accepted")),
  })
    .index("by_user", ["userId"])
    .index("by_friend", ["friendId"])
    .index("by_status", ["status"])
    .index("by_user_and_friend", ["userId", "friendId"]),

  // Blocks table
  blocks: defineTable({
    blockerId: v.id("profiles"),
    blockedId: v.id("profiles"),
  })
    .index("by_blocker", ["blockerId"])
    .index("by_blocked", ["blockedId"])
    .index("by_blocker_and_blocked", ["blockerId", "blockedId"]),

  // Conversations table - DM threads between two users
  conversations: defineTable({
    user1: v.id("profiles"), // Always the smaller ID (lexicographically)
    user2: v.id("profiles"), // Always the larger ID
  })
    .index("by_user1", ["user1"])
    .index("by_user2", ["user2"])
    .index("by_users", ["user1", "user2"]),

  // Messages table - DM messages
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("profiles"),
    text: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_sender", ["senderId"]),
});

