import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Profiles table - equivalent to Prisma Profile model
  profiles: defineTable({
    // Auth identity (issuer + subject) for multi-provider support
    authIssuer: v.string(),
    authSubject: v.string(),
    username: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    dmPrivacy: v.union(v.literal("friends"), v.literal("everyone")),
  })
    .index("by_auth_identity", ["authIssuer", "authSubject"])
    .index("by_username", ["username"])
    .searchIndex("search_profiles", {
      searchField: "username",
      filterFields: ["_creationTime"],
    }),

  // Posts table - top-level posts only (comments moved to separate table)
  posts: defineTable({
    authorId: v.id("profiles"),
    text: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
    // Denormalized counts for O(1) read performance
    likesCount: v.optional(v.number()),
    commentsCount: v.optional(v.number()),
  })
    .index("by_author", ["authorId"]),

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
    // Denormalized counts for O(1) read performance
    likesCount: v.optional(v.number()),
    repliesCount: v.optional(v.number()),
  })
    .index("by_post", ["postId"])
    .index("by_post_and_path", ["postId", "path"])
    .index("by_author", ["authorId"])
    .index("by_parent", ["parentId"]),

  // Post likes table - for posts
  post_likes: defineTable({
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
  // BIDIRECTIONAL MODEL:
  // - Pending requests: ONE record (userId = requester, friendId = recipient)
  // - Accepted friendships: TWO records (one for each direction)
  friends: defineTable({
    userId: v.id("profiles"), // The owner of this friendship record
    friendId: v.id("profiles"), // The friend
    status: v.union(v.literal("pending"), v.literal("accepted")),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_user_and_status", ["userId", "status"]) // Optimized for filtering accepted friends
    .index("by_friend", ["friendId"])
    .index("by_user_and_friend", ["userId", "friendId"]),

  // Blocks table
  blocks: defineTable({
    blockerId: v.id("profiles"),
    blockedId: v.id("profiles"),
  })
    .index("by_blocker", ["blockerId"])
    .index("by_blocked", ["blockedId"])
    .index("by_blocker_and_blocked", ["blockerId", "blockedId"]),

  // DM lookup table - provides practical uniqueness for 1:1 conversations
  // Uses _creationTime for canonical selection (no custom timestamp needed)
  dm_keys: defineTable({
    dmKey: v.string(), // "idA:idB" lexicographically sorted
    conversationId: v.id("conversations"),
  })
    .index("by_dmKey", ["dmKey"])
    .index("by_conversation", ["conversationId"]),
  // Conversations table - supports 1:1 now, groups later
  conversations: defineTable({
    isGroup: v.boolean(), // Always false for now
    name: v.optional(v.string()), // For future group names
    // Denormalized for O(1) unread check (avoids N+1)
    lastMessageAt: v.optional(v.number()),
    // For duplicate DM cleanup - points to canonical conversation
    mergedIntoConversationId: v.optional(v.id("conversations")),
  })
    .index("by_lastMessageAt", ["lastMessageAt"]),

  // Participants - who's in each conversation + read tracking
  conversation_participants: defineTable({
    conversationId: v.id("conversations"),
    profileId: v.id("profiles"),
    // Uses message _creationTime (not wall clock) - prevents clock skew
    lastReadMessageAt: v.optional(v.number()),
    joinedAt: v.number(),
    // Track if conversation is active (false when merged into another conversation)
    isActive: v.optional(v.boolean()),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_profile", ["profileId"])
    .index("by_profile_active", ["profileId", "isActive"])
    .index("by_conversation_and_profile", ["conversationId", "profileId"]),

  // Messages table - DM messages with index for cursor pagination
  // Note: Convex automatically appends _creationTime to all indexes
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("profiles"),
    text: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
  })
    .index("by_conversation_time", ["conversationId"])
    .index("by_sender", ["senderId"]),
});

