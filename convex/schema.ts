import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============================================
  // CORE IDENTITY TABLES
  // ============================================

  // Accounts table - Pure canonical identity (NO auth info)
  // This is the stable internal identity that all app data references
  accounts: defineTable({
    createdAt: v.number(),
    lastSeenAt: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("banned"), v.literal("deleted")),
    role: v.union(v.literal("user"), v.literal("admin")),
    bannedAt: v.optional(v.number()),
    bannedReason: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
  }),

  // AuthAccounts table - Bridge to auth providers (supports multi-provider)
  // This enables: adding Google later, migrating to WorkOS, multiple logins per account
  authAccounts: defineTable({
    accountId: v.id("accounts"),       // Links to canonical identity
    provider: v.string(),              // "supabase" (or future: "google", "workos", "auth0")
    providerUserId: v.string(),        // JWT subject (sub)
    email: v.optional(v.string()),     // Read-only from provider
    createdAt: v.number(),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_provider_providerUserId", ["provider", "providerUserId"])  // For login lookup
    .index("by_accountId", ["accountId"])  // For "linked accounts" query
    .index("by_email", ["email"]),  // For account recovery/admin

  // Profiles table - Public display layer
  profiles: defineTable({
    accountId: v.id("accounts"),      // Links to canonical identity
    username: v.string(),             // Display (original case)
    usernameLower: v.string(),        // Canonical lowercase for lookups
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    dmPrivacy: v.optional(v.union(v.literal("friends"), v.literal("everyone"))),  // Defaults to "friends"
    isPrivate: v.optional(v.boolean()),
    isOnboarded: v.optional(v.boolean()),
    // Denormalized counts
    friendCount: v.number(),
    postCount: v.number(),
  })
    .index("by_accountId", ["accountId"])  // For unique check in code
    .index("by_usernameLower", ["usernameLower"]),  // For unique check in code

  // ============================================
  // CONTENT TABLES
  // ============================================

  // Posts table
  posts: defineTable({
    authorId: v.id("accounts"),
    content: v.string(),
    mediaUrls: v.optional(v.array(v.string())),  // For future media
    visibility: v.union(v.literal("public"), v.literal("friends"), v.literal("private")),
    createdAt: v.number(),
    // Denormalized counts
    likeCount: v.number(),
    commentCount: v.number(),
    // Soft delete
    deletedAt: v.optional(v.number()),
    deletedBy: v.optional(v.id("accounts")),
  })
    .index("by_author", ["authorId"])
    .index("by_author_createdAt", ["authorId", "createdAt"])  // Profile page posts
    .index("by_createdAt", ["createdAt"])  // Global feed
    .index("by_visibility", ["visibility"])
    .index("by_visibility_createdAt", ["visibility", "createdAt"]),  // Filtered feeds

  // Comments table - threaded comments
  comments: defineTable({
    authorId: v.id("accounts"),
    postId: v.id("posts"),
    parentId: v.optional(v.id("comments")),  // For replies
    content: v.string(),
    createdAt: v.number(),
    // Denormalized counts
    likeCount: v.number(),
    replyCount: v.number(),
    // Soft delete
    deletedAt: v.optional(v.number()),
    deletedBy: v.optional(v.id("accounts")),
  })
    .index("by_post", ["postId"])
    .index("by_post_createdAt", ["postId", "createdAt"])  // Top-level comments chronological
    .index("by_author", ["authorId"])
    .index("by_parent", ["parentId"])
    .index("by_parent_createdAt", ["parentId", "createdAt"]),  // Replies chronological

  // Post likes
  postLikes: defineTable({
    accountId: v.id("accounts"),
    postId: v.id("posts"),
    createdAt: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_account", ["accountId"])
    .index("by_post_account", ["postId", "accountId"])  // For unique check in code
    .index("by_createdAt", ["createdAt"]),  // Recent likes

  // Comment likes
  commentLikes: defineTable({
    accountId: v.id("accounts"),
    commentId: v.id("comments"),
    createdAt: v.number(),
  })
    .index("by_comment", ["commentId"])
    .index("by_account", ["accountId"])
    .index("by_comment_account", ["commentId", "accountId"]),  // For unique check in code

  // ============================================
  // SOCIAL GRAPH TABLES
  // ============================================

  // Friend requests - canonical direction (userA < userB prevents duplicates)
  friendRequests: defineTable({
    userA: v.id("accounts"),          // Always min ID
    userB: v.id("accounts"),          // Always max ID
    requesterId: v.id("accounts"),    // Who initiated
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("cancelled")
    ),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("accounts")),
  })
    .index("by_userA", ["userA"])
    .index("by_userB", ["userB"])
    .index("by_userA_userB", ["userA", "userB"])  // For unique check in code
    .index("by_requesterId_status", ["requesterId", "status"]),

  // Friends - canonical friendships (one row per friendship)
  friends: defineTable({
    userA: v.id("accounts"),          // Always min ID
    userB: v.id("accounts"),          // Always max ID
    createdAt: v.number(),
  })
    .index("by_userA", ["userA"])
    .index("by_userB", ["userB"])
    .index("by_userA_userB", ["userA", "userB"]),  // For unique check in code

  // Blocks
  blocks: defineTable({
    blockerId: v.id("accounts"),
    blockedId: v.id("accounts"),
    createdAt: v.number(),
    reason: v.optional(v.string()),
  })
    .index("by_blocker", ["blockerId"])
    .index("by_blocked", ["blockedId"])
    .index("by_blocker_blocked", ["blockerId", "blockedId"]),  // For unique check in code

  // ============================================
  // MESSAGING TABLES
  // ============================================

  // Conversations - supports both DM and group chats
  conversations: defineTable({
    type: v.union(v.literal("dm"), v.literal("group")),
    createdAt: v.number(),
    createdBy: v.id("accounts"),
    lastMessageAt: v.optional(v.number()),
    // DM-specific (canonical pair for uniqueness)
    dmUserA: v.optional(v.id("accounts")),  // min ID
    dmUserB: v.optional(v.id("accounts")),  // max ID
    // Group-specific
    title: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  })
    .index("by_lastMessageAt", ["lastMessageAt"])  // Inbox sorting
    .index("by_dmUserA", ["dmUserA"])
    .index("by_dmUserB", ["dmUserB"])
    .index("by_dmUserA_dmUserB", ["dmUserA", "dmUserB"]),  // For unique DM check in code

  // Conversation members - for group chat membership
  conversationMembers: defineTable({
    conversationId: v.id("conversations"),
    accountId: v.id("accounts"),
    joinedAt: v.number(),
    role: v.union(v.literal("member"), v.literal("admin")),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_accountId", ["accountId"])
    .index("by_conversationId_accountId", ["conversationId", "accountId"]),  // For unique check

  // Messages
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("accounts"),
    content: v.string(),
    createdAt: v.number(),
    // Soft delete
    deletedAt: v.optional(v.number()),
    deletedBy: v.optional(v.id("accounts")),
    isSystem: v.optional(v.boolean()),  // For "X joined" etc.
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_createdAt", ["conversationId", "createdAt"])  // Chat history pagination
    .index("by_sender", ["senderId"]),

  // ============================================
  // MODERATION TABLES
  // ============================================

  // Reports - abuse/moderation reports
  reports: defineTable({
    reporterId: v.id("accounts"),
    targetType: v.union(
      v.literal("user"),
      v.literal("post"),
      v.literal("comment"),
      v.literal("message")
    ),
    targetAccountId: v.optional(v.id("accounts")),
    targetPostId: v.optional(v.id("posts")),
    targetCommentId: v.optional(v.id("comments")),
    targetMessageId: v.optional(v.id("messages")),
    reason: v.string(),
    createdAt: v.number(),
    status: v.union(v.literal("pending"), v.literal("reviewed"), v.literal("actioned")),
  })
    .index("by_reporterId", ["reporterId"])
    .index("by_status", ["status"])
    .index("by_status_createdAt", ["status", "createdAt"]),  // For moderation queue
});
