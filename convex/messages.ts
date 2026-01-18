import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import {
  getCurrentProfile,
  requireAuth,
  isBlocked,
  areFriends,
  validateTextLength,
  validateUrl,
  sanitizeText,
  MAX_LENGTHS,
} from "./helpers";
import { checkRateLimit } from "./rateLimiter";

/**
 * Find or create a DM conversation between two users
 * Uses dm_keys for practical uniqueness with deterministic canonical selection
 */
async function findOrCreateDM(
  ctx: any,
  profileA: Id<"profiles">,
  profileB: Id<"profiles">
): Promise<{ conversationId: Id<"conversations">; participantId: Id<"conversation_participants"> }> {
  // Build deterministic key (lexicographic sort)
  const dmKey = profileA < profileB 
    ? `${profileA}:${profileB}` 
    : `${profileB}:${profileA}`;

  // Get dm_keys for this pair
  // Cap at 10: duplicates are extremely rare; prevents pathological scans
  const locks = await ctx.db
    .query("dm_keys")
    .withIndex("by_dmKey", (q: any) => q.eq("dmKey", dmKey))
    .take(10);

  let conversationId: Id<"conversations">;

  if (locks.length > 0) {
    // Pick canonical: earliest by _creationTime (deterministic across all clients)
    const canonical = locks.sort((a: Doc<"dm_keys">, b: Doc<"dm_keys">) => 
      a._creationTime - b._creationTime
    )[0];
    
    // Check if canonical conversation is itself merged (edge case)
    const conv = await ctx.db.get(canonical.conversationId);
    if (conv?.mergedIntoConversationId) {
      conversationId = conv.mergedIntoConversationId;
    } else {
      conversationId = canonical.conversationId;
    }
  } else {
    // Create new conversation
    const now = Date.now();
    conversationId = await ctx.db.insert("conversations", {
      isGroup: false,
    });

    // Create dm_keys entry (uses _creationTime for canonical selection)
    await ctx.db.insert("dm_keys", {
      dmKey,
      conversationId,
    });

    // Create participants
    await ctx.db.insert("conversation_participants", {
      conversationId,
      profileId: profileA,
      joinedAt: now,
    });
    await ctx.db.insert("conversation_participants", {
      conversationId,
      profileId: profileB,
      joinedAt: now,
    });
  }

  // Get or find the sender's participant record
  const senderParticipant = await ctx.db
    .query("conversation_participants")
    .withIndex("by_conversation_and_profile", (q: any) => 
      q.eq("conversationId", conversationId).eq("profileId", profileA)
    )
    .first();

  return { conversationId, participantId: senderParticipant!._id };
}

/**
 * Send a message to a user
 */
export const send = mutation({
  args: {
    recipient_id: v.id("profiles"),
    text: v.optional(v.string()),
    audio_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    
    // Rate limit: 30 messages per minute
    await checkRateLimit(ctx, "sendMessage", profile._id);

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

    // Find or create DM conversation
    const { conversationId, participantId } = await findOrCreateDM(
      ctx,
      profile._id,
      args.recipient_id
    );

    // Insert message
    const messageId = await ctx.db.insert("messages", {
      conversationId,
      senderId: profile._id,
      text: text,
      audioUrl: audioUrl,
    });

    // Get message to access _creationTime
    const message = await ctx.db.get(messageId);

    // Update conversation's lastMessageAt
    await ctx.db.patch(conversationId, {
      lastMessageAt: message!._creationTime,
    });

    // Update sender's lastReadMessageAt (so they don't see their own message as unread)
    await ctx.db.patch(participantId, {
      lastReadMessageAt: message!._creationTime,
    });

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
 * Get list of conversations with unread status
 * Uses participant-based model with O(1) unread check per conversation
 */
export const getConversations = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    if (!profile) {
      return { data: [], hasMore: false, total: 0 };
    }
    const limit = args.limit ?? 50;

    // Get all participant records for current user
    const participations = await ctx.db
      .query("conversation_participants")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .collect();

    // For each participation, get conversation and compute hasUnread
    const conversations = await Promise.all(
      participations.map(async (p) => {
        const conv = await ctx.db.get(p.conversationId);
        
        // Skip merged (orphaned) conversations
        if (!conv || conv.mergedIntoConversationId != null) return null;
        
        // O(1) unread check using denormalized lastMessageAt
        const hasUnread = 
          conv.lastMessageAt != null &&
          (p.lastReadMessageAt ?? 0) < conv.lastMessageAt;

        // Get other participants for display
        const allParticipants = await ctx.db
          .query("conversation_participants")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
          .collect();

        // For 1:1 DM, get the other user
        const otherParticipant = allParticipants.find(
          (part) => part.profileId !== profile._id
        );

        let otherUser = null;
        if (otherParticipant) {
          const otherProfile = await ctx.db.get(otherParticipant.profileId);
          if (otherProfile) {
            otherUser = {
              id: otherProfile._id,
              username: otherProfile.username,
              display_name: otherProfile.displayName ?? "",
              avatar_url: otherProfile.avatarUrl ?? "",
            };
          }
        }

        // Get last message for preview
        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_conversation_time", (q) => q.eq("conversationId", conv._id))
          .order("desc")
          .first();

        return {
          id: conv._id,
          isGroup: conv.isGroup,
          name: conv.name,
          hasUnread,
          other_user: otherUser,
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
          updated_at: conv.lastMessageAt
            ? new Date(conv.lastMessageAt).toISOString()
            : new Date(conv._creationTime).toISOString(),
        };
      })
    );

    // Filter out nulls (merged convos) and sort by last message time
    const validConversations = conversations
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

    // Apply limit
    const dataConversations = validConversations.slice(0, limit);
    const hasMore = validConversations.length > limit;

    return {
      data: dataConversations,
      hasMore,
      total: validConversations.length,
    };
  },
});

/**
 * Get messages with a specific user
 * Supports reverse cursor pagination (scroll up to load older)
 * Returns lastReadMessageAt for "New Messages" divider positioning
 */
export const getWithUser = query({
  args: {
    userId: v.id("profiles"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()), // _creationTime as cursor
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    if (!profile) {
      return { data: [], hasMore: false, nextCursor: null, lastReadMessageAt: null };
    }
    const limit = args.limit ?? 50;

    // Build deterministic key to find conversation
    const dmKey = profile._id < args.userId 
      ? `${profile._id}:${args.userId}` 
      : `${args.userId}:${profile._id}`;

    // Find dm_key entry
    const dmKeyEntry = await ctx.db
      .query("dm_keys")
      .withIndex("by_dmKey", (q) => q.eq("dmKey", dmKey))
      .first();

    if (!dmKeyEntry) {
      // No conversation yet
      return {
        data: [],
        hasMore: false,
        nextCursor: null,
        lastReadMessageAt: null,
      };
    }

    const conversationId = dmKeyEntry.conversationId;

    // Check if conversation is merged (orphan) - redirect
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) {
      return { data: [], hasMore: false, nextCursor: null, lastReadMessageAt: null };
    }

    if (conversation.mergedIntoConversationId != null) {
      return { 
        redirect: true, 
        canonicalConversationId: conversation.mergedIntoConversationId,
        data: [],
        hasMore: false,
        nextCursor: null,
        lastReadMessageAt: null,
      };
    }

    // Get participant's lastReadMessageAt for divider
    const participant = await ctx.db
      .query("conversation_participants")
      .withIndex("by_conversation_and_profile", (q) => 
        q.eq("conversationId", conversationId).eq("profileId", profile._id)
      )
      .first();

    // Query messages with cursor condition inside withIndex
    let results: Doc<"messages">[];
    if (args.cursor == null) {
      // First load: get newest N messages
      results = await ctx.db
        .query("messages")
        .withIndex("by_conversation_time", (q) => q.eq("conversationId", conversationId))
        .order("desc")
        .take(limit + 1);
    } else {
      // Subsequent loads: cursor inside withIndex for indexed range scan
      results = await ctx.db
        .query("messages")
        .withIndex("by_conversation_time", (q) => 
          q.eq("conversationId", conversationId).lt("_creationTime", args.cursor!)
        )
        .order("desc")
        .take(limit + 1);
    }

    // Check if there are more messages
    const hasMore = results.length > limit;
    const data = results.slice(0, limit);

    // Next cursor is the oldest message's _creationTime (for loading older)
    // Must be computed BEFORE the reverse() call on line 385 (critical ordering constraint).
    // data is ordered DESC (newest first), so data[data.length - 1] is the oldest message
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1]._creationTime : null;

    // Reverse for display (oldest at top, newest at bottom)
    const formattedMessages = data.reverse().map((msg) => ({
      id: msg._id,
      conversation_id: msg.conversationId,
      sender_id: msg.senderId,
      text: msg.text ?? "",
      audio_url: msg.audioUrl ?? "",
      created_at: new Date(msg._creationTime).toISOString(),
      _creationTime: msg._creationTime,
    }));

    return {
      data: formattedMessages,
      hasMore,
      nextCursor,
      lastReadMessageAt: participant?.lastReadMessageAt ?? null,
    };
  },
});

/**
 * Mark conversation as read
 * Only patches if there's something NEW to mark as read (saves writes)
 */
export const markAsRead = mutation({
  args: {
    recipientId: v.id("profiles"),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);

    // Build deterministic key to find conversation
    const dmKey = profile._id < args.recipientId 
      ? `${profile._id}:${args.recipientId}` 
      : `${args.recipientId}:${profile._id}`;

    // Find dm_key entry
    const dmKeyEntry = await ctx.db
      .query("dm_keys")
      .withIndex("by_dmKey", (q) => q.eq("dmKey", dmKey))
      .first();

    if (!dmKeyEntry) {
      return { success: false };
    }

    const conversationId = dmKeyEntry.conversationId;
    const conversation = await ctx.db.get(conversationId);
    
    if (!conversation) {
      return { success: false };
    }

    // Get participant record
    const participant = await ctx.db
      .query("conversation_participants")
      .withIndex("by_conversation_and_profile", (q) => 
        q.eq("conversationId", conversationId).eq("profileId", profile._id)
      )
      .first();

    if (!participant) {
      return { success: false };
    }

    // Only update if there's something NEW to mark as read
    if (
      conversation.lastMessageAt != null &&
      (participant.lastReadMessageAt ?? 0) < conversation.lastMessageAt
    ) {
      await ctx.db.patch(participant._id, {
        lastReadMessageAt: conversation.lastMessageAt,
      });
    }

    return { success: true };
  },
});

/**
 * Delete a message (only sender can delete)
 */
export const remove = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    
    // Rate limit: 10 deletes per minute
    await checkRateLimit(ctx, "deleteAction", profile._id);

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
