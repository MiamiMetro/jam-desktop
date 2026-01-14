import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { 
  requireViewerWithProfile,
  isBlocked, 
  isFriend,
  getOrCreateDM,
  validateTextLength,
  sanitizeText,
  MAX_LENGTHS,
} from "./helpers";
import { checkRateLimit } from "./rateLimiter";

/**
 * Send a message to a user
 */
export const send = mutation({
  args: {
    recipientAccountId: v.id("accounts"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { account, profile } = await requireViewerWithProfile(ctx);
    
    // Rate limit: 30 messages per minute
    await checkRateLimit(ctx, "sendMessage", profile._id);

    // Cannot send message to self
    if (account._id === args.recipientAccountId) {
      throw new Error("You cannot send message to yourself");
    }

    // Sanitize and validate inputs
    const content = sanitizeText(args.content);
    if (!content) {
      throw new Error("Message content is required");
    }
    validateTextLength(content, MAX_LENGTHS.MESSAGE_TEXT, "Message");

    // Check if blocked
    const blocked = await isBlocked(ctx, account._id, args.recipientAccountId);
    if (blocked) {
      throw new Error("Cannot send message to this user");
    }

    // Get recipient profile
    const recipientProfile = await ctx.db
      .query("profiles")
      .withIndex("by_accountId", (q) => q.eq("accountId", args.recipientAccountId))
      .first();

    if (!recipientProfile) {
      throw new Error("Recipient not found");
    }

    // Check DM privacy settings
    const areFriends = await isFriend(ctx, account._id, args.recipientAccountId);
    const dmPrivacy = recipientProfile.dmPrivacy ?? "friends";

    if (!areFriends && dmPrivacy !== "everyone") {
      throw new Error("This user only accepts messages from friends");
    }

    // Get or create DM conversation
    const conversation = await getOrCreateDM(ctx, account._id, args.recipientAccountId);

    // Create message
    const messageId = await ctx.db.insert("messages", {
      conversationId: conversation._id,
      senderId: account._id,
      content,
      createdAt: Date.now(),
    });

    // Update conversation's lastMessageAt
    await ctx.db.patch(conversation._id, {
      lastMessageAt: Date.now(),
    });

    const message = await ctx.db.get(messageId);

    return {
      id: message!._id,
      conversation_id: message!.conversationId,
      sender_id: message!.senderId,
      content: message!.content,
      created_at: new Date(message!.createdAt).toISOString(),
      is_deleted: false,
    };
  },
});

/**
 * Get list of conversations
 * Supports cursor-based pagination
 */
export const getConversations = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()), // lastMessageAt timestamp
  },
  handler: async (ctx, args) => {
    const { account } = await requireViewerWithProfile(ctx);
    const limit = args.limit ?? 50;

    // Get all memberships for this user
    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_accountId", (q) => q.eq("accountId", account._id))
      .collect();

    // Get conversations and enrich
    const enrichedConversations = await Promise.all(
      memberships.map(async (membership) => {
        const conversation = await ctx.db.get(membership.conversationId);
        if (!conversation) return null;

        // For DMs, get the other user
        let otherUser = null;
        if (conversation.type === "dm") {
          const otherAccountId = conversation.dmUserA === account._id 
            ? conversation.dmUserB 
            : conversation.dmUserA;
          
          if (otherAccountId) {
            const otherProfile = await ctx.db
              .query("profiles")
              .withIndex("by_accountId", (q) => q.eq("accountId", otherAccountId))
              .first();
            
            if (otherProfile) {
              otherUser = {
                account_id: otherAccountId,
                id: otherProfile._id,
                username: otherProfile.username,
                display_name: otherProfile.displayName ?? "",
                avatar_url: otherProfile.avatarUrl ?? "",
              };
            }
          }
        }

        // Get last message
        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_conversation_createdAt", (q) => q.eq("conversationId", conversation._id))
          .order("desc")
          .filter((q) => q.eq(q.field("deletedAt"), undefined))
          .first();

        return {
          id: conversation._id,
          type: conversation.type,
          other_user: otherUser,
          title: conversation.title,
          image_url: conversation.imageUrl,
          last_message: lastMessage
            ? {
                id: lastMessage._id,
                content: lastMessage.content,
                sender_id: lastMessage.senderId,
                created_at: new Date(lastMessage.createdAt).toISOString(),
                is_deleted: !!lastMessage.deletedAt,
              }
            : null,
          updated_at: conversation.lastMessageAt 
            ? new Date(conversation.lastMessageAt).toISOString()
            : new Date(conversation.createdAt).toISOString(),
          _sortTime: conversation.lastMessageAt ?? conversation.createdAt,
        };
      })
    );

    // Filter out nulls and sort by last message time
    let validConversations = enrichedConversations
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => b._sortTime - a._sortTime);

    // Apply cursor pagination
    let startIndex = 0;
    if (args.cursor) {
      startIndex = validConversations.findIndex((c) => c._sortTime < args.cursor!);
      if (startIndex === -1) startIndex = validConversations.length;
    }

    const paginatedConversations = validConversations.slice(startIndex, startIndex + limit + 1);
    const hasMore = paginatedConversations.length > limit;
    const dataConversations = paginatedConversations.slice(0, limit);

    return {
      data: dataConversations.map(({ _sortTime, ...rest }) => rest),
      hasMore,
      total: validConversations.length,
      nextCursor: hasMore && dataConversations.length > 0
        ? dataConversations[dataConversations.length - 1]._sortTime
        : null,
    };
  },
});

/**
 * Get messages with a specific user (DM)
 * Supports cursor-based pagination
 */
export const getWithUser = query({
  args: {
    targetAccountId: v.id("accounts"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()), // createdAt timestamp
  },
  handler: async (ctx, args) => {
    const { account } = await requireViewerWithProfile(ctx);
    const limit = args.limit ?? 50;

    // Find the DM conversation using canonical ordering
    const [userA, userB] = account._id < args.targetAccountId
      ? [account._id, args.targetAccountId]
      : [args.targetAccountId, account._id];

    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_dmUserA_dmUserB", (q) => q.eq("dmUserA", userA).eq("dmUserB", userB))
      .first();

    if (!conversation) {
      return {
        data: [],
        hasMore: false,
        total: 0,
        nextCursor: null,
      };
    }

    // Get messages
    let messages: Doc<"messages">[] = [];
    
    if (args.cursor) {
      messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation_createdAt", (q) => q.eq("conversationId", conversation._id))
        .order("desc")
        .filter((q) => q.lt(q.field("createdAt"), args.cursor!))
        .take(limit + 1);
    } else {
      messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation_createdAt", (q) => q.eq("conversationId", conversation._id))
        .order("desc")
        .take(limit + 1);
    }

    const hasMore = messages.length > limit;
    const data = messages.slice(0, limit);

    // Reverse to get chronological order for display
    const formattedMessages = data.reverse().map((msg) => ({
      id: msg._id,
      conversation_id: msg.conversationId,
      sender_id: msg.senderId,
      content: msg.deletedAt ? "" : msg.content,
      created_at: new Date(msg.createdAt).toISOString(),
      is_deleted: !!msg.deletedAt,
      is_system: msg.isSystem ?? false,
    }));

    // Get total count
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
      .collect();

    return {
      data: formattedMessages,
      hasMore,
      total: allMessages.length,
      nextCursor: hasMore && data.length > 0 ? data[data.length - 1].createdAt : null,
    };
  },
});

/**
 * Soft delete a message (only sender can delete)
 */
export const remove = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const { account, profile } = await requireViewerWithProfile(ctx);
    
    // Rate limit: 10 deletes per minute
    await checkRateLimit(ctx, "deleteAction", profile._id);

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    if (message.senderId !== account._id) {
      throw new Error("You can only delete your own messages");
    }

    if (message.deletedAt) {
      throw new Error("Message is already deleted");
    }

    // Soft delete
    await ctx.db.patch(args.messageId, {
      deletedAt: Date.now(),
      deletedBy: account._id,
    });

    return { message: "Message deleted successfully" };
  },
});
