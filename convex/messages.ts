import { query, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
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
 * Mark participants of a merged conversation as inactive.
 * Call this when merging duplicate conversations.
 *
 * Helper function for conversation merge features. This function is part of the public API.
 * Uses batched processing to prevent OOM on large group conversations.
 */
export async function markConversationAsInactive(
  ctx: MutationCtx,
  conversationId: Id<"conversations">
): Promise<void> {
  // Process in cursor-based batches to avoid re-reading the same first page.
  let cursor: string | null = null;
  let isDone = false;

  while (!isDone) {
    const page = await ctx.db
      .query("conversation_participants")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .paginate({ cursor, numItems: 100 });

    for (const participant of page.page) {
      if (participant.isActive !== false) {
        await ctx.db.patch(participant._id, { isActive: false });
      }
    }

    cursor = page.continueCursor;
    isDone = page.isDone;
  }
}

/**
 * Find or create a DM conversation between two users
 * Uses dm_keys for practical uniqueness with deterministic canonical selection
 */
async function findOrCreateDM(
  ctx: MutationCtx,
  profileA: Id<"profiles">,
  profileB: Id<"profiles">
): Promise<{ conversationId: Id<"conversations"> }> {
  // Build deterministic key (lexicographic sort)
  const dmKey = profileA < profileB 
    ? `${profileA}:${profileB}` 
    : `${profileB}:${profileA}`;

  // Get dm_keys for this pair
  // Cap at 10: duplicates are extremely rare; prevents pathological scans
  const locks = await ctx.db
    .query("dm_keys")
    .withIndex("by_dmKey", (q) => q.eq("dmKey", dmKey))
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

    // Create participants (isActive defaults to true when undefined for backwards compat)
    await ctx.db.insert("conversation_participants", {
      conversationId,
      profileId: profileA,
      joinedAt: now,
      isActive: true,
      lastActivityAt: now,
    });
    await ctx.db.insert("conversation_participants", {
      conversationId,
      profileId: profileB,
      joinedAt: now,
      isActive: true,
      lastActivityAt: now,
    });
  }

  return { conversationId };
}

/**
 * Ensure a DM conversation exists with another user and return its ID.
 */
export const ensureDmWithUser = mutation({
  args: {
    userId: v.id("profiles"),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);

    await checkRateLimit(ctx, "general", profile._id);

    if (profile._id === args.userId) {
      throw new Error("You cannot create a DM with yourself");
    }

    const otherUser = await ctx.db.get(args.userId);
    if (!otherUser) {
      throw new Error("User not found");
    }

    const blocked = await isBlocked(ctx, profile._id, args.userId);
    if (blocked) {
      throw new Error("Cannot start a conversation with this user");
    }

    const friends = await areFriends(ctx, profile._id, args.userId);
    if (!friends && otherUser.dmPrivacy !== "everyone") {
      throw new Error(
        "You can only send messages to friends or users who allow messages from everyone"
      );
    }

    const { conversationId } = await findOrCreateDM(ctx, profile._id, args.userId);
    return { conversationId };
  },
});

/**
 * Send a message to an existing conversation.
 */
export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    text: v.optional(v.string()),
    audio_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    
    // Rate limit: 30 messages per minute
    await checkRateLimit(ctx, "sendMessage", profile._id);

    // Sanitize and validate inputs
    const text = sanitizeText(args.text);
    const audioUrl = args.audio_url;
    
    validateTextLength(text, MAX_LENGTHS.MESSAGE_TEXT, "Message text");
    validateUrl(audioUrl);

    // Text or audio must be provided
    if (!text && !audioUrl) {
      throw new Error("Message must have either text or audio");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    if (conversation.mergedIntoConversationId != null) {
      throw new Error("Conversation has been merged");
    }

    const senderParticipant = await ctx.db
      .query("conversation_participants")
      .withIndex("by_conversation_and_profile", (q) =>
        q.eq("conversationId", args.conversationId).eq("profileId", profile._id)
      )
      .first();
    if (!senderParticipant || senderParticipant.isActive === false) {
      throw new Error("You are not a participant in this conversation");
    }

    // Insert message
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: profile._id,
      text: text,
      audioUrl: audioUrl,
    });

    // Get message to access _creationTime
    const message = await ctx.db.get(messageId);

    // Update conversation's lastMessageAt
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: message!._creationTime,
      lastMessageId: message!._id,
      lastMessageSenderId: message!.senderId,
      lastMessageText: message!.text,
      lastMessageAudioUrl: message!.audioUrl,
      lastMessageCreatedAt: message!._creationTime,
    });

    // Update participant activity timestamps for stable conversation ordering.
    let participantCursor: string | null = null;
    let participantIsDone = false;
    while (!participantIsDone) {
      const participantPage = await ctx.db
        .query("conversation_participants")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", args.conversationId)
        )
        .paginate({ cursor: participantCursor, numItems: 100 });

      for (const participant of participantPage.page) {
        if (participant._id === senderParticipant._id) {
          // Sender should not see their own new message as unread.
          await ctx.db.patch(participant._id, {
            lastReadMessageAt: message!._creationTime,
            lastActivityAt: message!._creationTime,
          });
        } else {
          await ctx.db.patch(participant._id, {
            lastActivityAt: message!._creationTime,
          });
        }
      }

      participantCursor = participantPage.continueCursor;
      participantIsDone = participantPage.isDone;
    }

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
 * Get list of conversations with unread status using native Convex pagination.
 * Preferred for Convex-first frontend pagination.
 */
export const getConversationsPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    if (!profile) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const result = await ctx.db
      .query("conversation_participants")
      .withIndex("by_profile_and_last_activity", (q) =>
        q.eq("profileId", profile._id)
      )
      .order("desc")
      .filter((q) => q.neq(q.field("isActive"), false))
      .paginate(args.paginationOpts);

    const conversations = await Promise.all(
      result.page.map(async (p) => {
        const conv = await ctx.db.get(p.conversationId);
        if (!conv || conv.mergedIntoConversationId != null) return null;

        const hasUnread =
          conv.lastMessageAt != null &&
          (p.lastReadMessageAt ?? 0) < conv.lastMessageAt;

        let otherUser = null;
        if (!conv.isGroup) {
          const participantRows = await ctx.db
            .query("conversation_participants")
            .withIndex("by_conversation", (q) =>
              q.eq("conversationId", conv._id)
            )
            .take(10);
          const otherParticipant = participantRows.find(
            (participant) =>
              participant.profileId !== profile._id &&
              participant.isActive !== false
          );

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
        }

        const lastMessage =
          conv.lastMessageId &&
          conv.lastMessageSenderId &&
          conv.lastMessageCreatedAt != null
            ? {
                id: conv.lastMessageId,
                conversation_id: conv._id,
                sender_id: conv.lastMessageSenderId,
                text: conv.lastMessageText ?? "",
                audio_url: conv.lastMessageAudioUrl ?? "",
                created_at: new Date(conv.lastMessageCreatedAt).toISOString(),
              }
            : null;

        return {
          id: conv._id,
          isGroup: conv.isGroup,
          name: conv.name,
          hasUnread,
          other_user: otherUser,
          last_message: lastMessage,
          updated_at: new Date(
            p.lastActivityAt ?? conv.lastMessageAt ?? p._creationTime
          ).toISOString(),
        };
      })
    );

    return {
      ...result,
      page: conversations.filter(
        (
          conversation
        ): conversation is NonNullable<(typeof conversations)[number]> =>
          conversation !== null
      ),
    };
  },
});

/**
 * Get messages by conversation ID.
 * Supports reverse cursor pagination (scroll up to load older).
 */
export const getByConversationPaginated = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()), // _creationTime as cursor
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    if (!profile) {
      return {
        data: [],
        hasMore: false,
        nextCursor: null,
        lastReadMessageAt: null,
        otherParticipantLastRead: null,
      };
    }

    const participant = await ctx.db
      .query("conversation_participants")
      .withIndex("by_conversation_and_profile", (q) =>
        q.eq("conversationId", args.conversationId).eq("profileId", profile._id)
      )
      .first();
    if (!participant || participant.isActive === false) {
      throw new Error("Conversation not found");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.mergedIntoConversationId != null) {
      throw new Error("Conversation not found");
    }

    const limit = args.limit ?? 50;

    let results: Doc<"messages">[];
    if (args.cursor == null) {
      results = await ctx.db
        .query("messages")
        .withIndex("by_conversation_time", (q) =>
          q.eq("conversationId", args.conversationId)
        )
        .order("desc")
        .take(limit + 1);
    } else {
      results = await ctx.db
        .query("messages")
        .withIndex("by_conversation_time", (q) =>
          q.eq("conversationId", args.conversationId).lt("_creationTime", args.cursor!)
        )
        .order("desc")
        .take(limit + 1);
    }

    const hasMore = results.length > limit;
    const data = results.slice(0, limit);
    const nextCursor =
      hasMore && data.length > 0 ? data[data.length - 1]._creationTime : null;

    const formattedMessages = data.reverse().map((msg) => ({
      id: msg._id,
      conversation_id: msg.conversationId,
      sender_id: msg.senderId,
      text: msg.text ?? "",
      audio_url: msg.audioUrl ?? "",
      created_at: new Date(msg._creationTime).toISOString(),
      _creationTime: msg._creationTime,
    }));

    const participantPage = await ctx.db
      .query("conversation_participants")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .take(50);

    const otherParticipant = participantPage.find(
      (p) => p.profileId !== profile._id && p.isActive !== false
    );

    return {
      data: formattedMessages,
      hasMore,
      nextCursor,
      lastReadMessageAt: participant.lastReadMessageAt ?? null,
      otherParticipantLastRead: otherParticipant?.lastReadMessageAt ?? null,
    };
  },
});

/**
 * Get participants for a conversation.
 */
export const getParticipants = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    if (!profile) return [];

    const membership = await ctx.db
      .query("conversation_participants")
      .withIndex("by_conversation_and_profile", (q) =>
        q.eq("conversationId", args.conversationId).eq("profileId", profile._id)
      )
      .first();
    if (!membership || membership.isActive === false) {
      return [];
    }

    const participants = await ctx.db
      .query("conversation_participants")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .take(50);

    const profiles = await Promise.all(
      participants
        .filter((p) => p.isActive !== false)
        .map((participant) => ctx.db.get(participant.profileId))
    );

    return profiles
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .map((p) => ({
        id: p._id,
        username: p.username,
        display_name: p.displayName ?? "",
        avatar_url: p.avatarUrl ?? "",
      }));
  },
});

/**
 * Mark conversation as read
 * Only patches if there's something NEW to mark as read (saves writes)
 */
export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      return { success: false };
    }

    // Get participant record
    const participant = await ctx.db
      .query("conversation_participants")
      .withIndex("by_conversation_and_profile", (q) => 
        q.eq("conversationId", args.conversationId).eq("profileId", profile._id)
      )
      .first();

    if (!participant || participant.isActive === false) {
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
