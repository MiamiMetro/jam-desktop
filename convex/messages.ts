import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import { 
  requireAuth, 
  isBlocked, 
  areFriends,
  validateTextLength,
  validateUrl,
  sanitizeText,
  MAX_LENGTHS,
} from "./helpers";

/**
 * Find or create a conversation between two users
 * Ensures consistent ordering of user IDs
 */
async function findOrCreateConversation(
  ctx: any,
  user1: Id<"profiles">,
  user2: Id<"profiles">
): Promise<Id<"conversations">> {
  // Sort IDs to ensure consistent ordering
  const [smaller, larger] = [user1, user2].sort();

  // Try to find existing conversation
  const existing = await ctx.db
    .query("conversations")
    .withIndex("by_users", (q: any) => q.eq("user1", smaller).eq("user2", larger))
    .first();

  if (existing) {
    return existing._id;
  }

  // Create new conversation
  const conversationId = await ctx.db.insert("conversations", {
    user1: smaller,
    user2: larger,
  });

  return conversationId;
}

/**
 * Send a message to a user
 * Equivalent to POST /messages/send
 */
export const send = mutation({
  args: {
    recipient_id: v.id("profiles"),
    text: v.optional(v.string()),
    audio_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);

    // Cannot send message to self
    if (profile._id === args.recipient_id) {
      throw new Error("You cannot send message to yourself");
    }

    // Sanitize and validate inputs
    const text = sanitizeText(args.text);
    const audioUrl = args.audio_url;
    
    validateTextLength(text, MAX_LENGTHS.MESSAGE_TEXT, "Message text");
    validateUrl(audioUrl);

    // Text or audio must be provided
    if (!text && !audioUrl) {
      throw new Error("Message must have either text or audio");
    }

    // Check if blocked
    const blocked = await isBlocked(ctx, profile._id, args.recipient_id);
    if (blocked) {
      throw new Error("Cannot send message to this user");
    }

    // Get recipient profile
    const recipient = await ctx.db.get(args.recipient_id);
    if (!recipient) {
      throw new Error("Recipient not found");
    }

    // Check if users are friends
    const friends = await areFriends(ctx, profile._id, args.recipient_id);

    // Check if message is allowed
    if (!friends && recipient.dmPrivacy !== "everyone") {
      throw new Error(
        "You can only send messages to friends or users who allow messages from everyone"
      );
    }

    // Find or create conversation
    const conversationId = await findOrCreateConversation(
      ctx,
      profile._id,
      args.recipient_id
    );

    // Create message
    const messageId = await ctx.db.insert("messages", {
      conversationId,
      senderId: profile._id,
      text: text,
      audioUrl: audioUrl,
    });

    const message = await ctx.db.get(messageId);

    return {
      id: message!._id,
      conversation_id: message!.conversationId,
      sender_id: message!.senderId,
      text: message!.text ?? "",
      audio_url: message!.audioUrl ?? "",
      created_at: new Date(message!._creationTime).toISOString(),
    };
  },
});

/**
 * Get list of conversations
 * Equivalent to GET /messages/conversations
 */
export const getConversations = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    const limit = args.limit ?? 50;

    // Get conversations where user is user1
    const convs1 = await ctx.db
      .query("conversations")
      .withIndex("by_user1", (q) => q.eq("user1", profile._id))
      .collect();

    // Get conversations where user is user2
    const convs2 = await ctx.db
      .query("conversations")
      .withIndex("by_user2", (q) => q.eq("user2", profile._id))
      .collect();

    const allConversations = [...convs1, ...convs2];

    // Enrich with other user info and last message
    const enrichedConversations = await Promise.all(
      allConversations.map(async (conv) => {
        const otherUserId =
          conv.user1 === profile._id ? conv.user2 : conv.user1;
        const otherUser = await ctx.db.get(otherUserId);

        // Get last message
        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
          .order("desc")
          .first();

        return {
          id: conv._id,
          other_user: otherUser
            ? {
                id: otherUser._id,
                username: otherUser.username,
                display_name: otherUser.displayName ?? "",
                avatar_url: otherUser.avatarUrl ?? "",
              }
            : null,
          last_message: lastMessage
            ? {
                id: lastMessage._id,
                conversation_id: lastMessage.conversationId,
                sender_id: lastMessage.senderId,
                text: lastMessage.text ?? "",
                audio_url: lastMessage.audioUrl ?? "",
                created_at: new Date(lastMessage._creationTime).toISOString(),
              }
            : null,
          updated_at: lastMessage
            ? new Date(lastMessage._creationTime).toISOString()
            : new Date(conv._creationTime).toISOString(),
        };
      })
    );

    // Sort by last message time (most recent first)
    enrichedConversations.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    return {
      data: enrichedConversations.slice(0, limit),
      hasMore: enrichedConversations.length > limit,
      total: enrichedConversations.length,
    };
  },
});

/**
 * Get messages with a specific user
 * Equivalent to GET /messages/conversation/:userId
 * Supports cursor-based pagination
 */
export const getWithUser = query({
  args: {
    userId: v.id("profiles"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    const limit = args.limit ?? 50;

    // Find conversation
    const [smaller, larger] = [profile._id, args.userId].sort();

    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_users", (q) => q.eq("user1", smaller).eq("user2", larger))
      .first();

    if (!conversation) {
      // No conversation yet
      return {
        data: [],
        hasMore: false,
        total: 0,
        nextCursor: null,
      };
    }

    // Get messages in the conversation
    let messages: Doc<"messages">[] = [];
    
    if (args.cursor) {
      const cursorMessage = await ctx.db.get(args.cursor);
      if (cursorMessage) {
        messages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", conversation._id)
          )
          .order("desc")
          .filter((q) => q.lt(q.field("_creationTime"), cursorMessage._creationTime))
          .take(limit + 1);
      }
    } else {
      messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversation._id)
        )
        .order("desc")
        .take(limit + 1);
    }

    const hasMore = messages.length > limit;
    const data = messages.slice(0, limit);

    // Reverse to get oldest first
    const formattedMessages = data.reverse().map((msg) => ({
      id: msg._id,
      conversation_id: msg.conversationId,
      sender_id: msg.senderId,
      text: msg.text ?? "",
      audio_url: msg.audioUrl ?? "",
      created_at: new Date(msg._creationTime).toISOString(),
    }));

    // Get total count
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversation._id)
      )
      .collect();

    return {
      data: formattedMessages,
      hasMore,
      total: allMessages.length,
      nextCursor: hasMore ? data[data.length - 1]._id : null,
    };
  },
});

/**
 * Delete a message (only sender can delete)
 * Equivalent to DELETE /messages/:messageId
 */
export const remove = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    if (message.senderId !== profile._id) {
      throw new Error("You can only delete your own messages");
    }

    await ctx.db.delete(args.messageId);

    return { message: "Message deleted successfully" };
  },
});

