import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

// ============================================
// Input Validation Constants & Utilities
// ============================================

/** Maximum lengths for user-generated content */
export const MAX_LENGTHS = {
  POST_TEXT: 5000,
  COMMENT_TEXT: 2000,
  MESSAGE_TEXT: 2000,
  USERNAME: 30,
  DISPLAY_NAME: 50,
  BIO: 500,
  URL: 2048,
} as const;


/**
 * Validate text length and throw if exceeded
 */
export function validateTextLength(
  text: string | undefined,
  maxLength: number,
  fieldName: string
): void {
  if (text && text.length > maxLength) {
    throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters`);
  }
}

/**
 * Validate URL format (basic check)
 */
export function validateUrl(url: string | undefined): void {
  if (!url) return;
  if (url.length > MAX_LENGTHS.URL) {
    throw new Error(`URL exceeds maximum length of ${MAX_LENGTHS.URL} characters`);
  }
  try {
    new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }
}

/**
 * Sanitize text by trimming whitespace
 */
export function sanitizeText(text: string | undefined): string | undefined {
  return text?.trim();
}


// ============================================
// Authentication Helpers
// ============================================

/**
 * Get the current viewer (account + profile) from their auth token
 * Uses the authAccounts bridge table to map provider identity to canonical account
 * Returns null if not authenticated or account doesn't exist
 */
export async function getViewer(ctx: QueryCtx | MutationCtx): Promise<{
  account: Doc<"accounts">;
  profile: Doc<"profiles"> | null;
} | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  // Find authAccount by provider + providerUserId
  const authAccount = await ctx.db
    .query("authAccounts")
    .withIndex("by_provider_providerUserId", (q) =>
      q.eq("provider", "supabase").eq("providerUserId", identity.subject)
    )
    .first();

  if (!authAccount) {
    return null;
  }

  // Get the account
  const account = await ctx.db.get(authAccount.accountId);
  if (!account || account.status !== "active") {
    return null;
  }

  // Get profile (may not exist during onboarding)
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_accountId", (q) => q.eq("accountId", account._id))
    .first();

  return { account, profile };
}

/**
 * Get the current viewer, throwing an error if not authenticated
 */
export async function requireViewer(ctx: QueryCtx | MutationCtx): Promise<{
  account: Doc<"accounts">;
  profile: Doc<"profiles"> | null;
}> {
  const viewer = await getViewer(ctx);
  if (!viewer) {
    throw new Error("Not authenticated");
  }
  return viewer;
}

/**
 * Get the current viewer with a completed profile, throwing if missing
 */
export async function requireViewerWithProfile(ctx: QueryCtx | MutationCtx): Promise<{
  account: Doc<"accounts">;
  profile: Doc<"profiles">;
}> {
  const viewer = await requireViewer(ctx);
  if (!viewer.profile) {
    throw new Error("Profile not set up");
  }
  return { account: viewer.account, profile: viewer.profile };
}

/**
 * Create an account if it doesn't exist (called on first login)
 * Creates both the account and authAccount bridge row
 * Profile is created separately during onboarding
 */
export async function createAccountIfNeeded(
  ctx: MutationCtx
): Promise<Doc<"accounts">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  // Check if authAccount already exists
  const existingAuthAccount = await ctx.db
    .query("authAccounts")
    .withIndex("by_provider_providerUserId", (q) =>
      q.eq("provider", "supabase").eq("providerUserId", identity.subject)
    )
    .first();

  if (existingAuthAccount) {
    // Update last login
    await ctx.db.patch(existingAuthAccount._id, { lastLoginAt: Date.now() });
    const account = await ctx.db.get(existingAuthAccount.accountId);
    if (!account) {
      throw new Error("Account not found");
    }
    return account;
  }

  // Create new account
  const accountId = await ctx.db.insert("accounts", {
    createdAt: Date.now(),
    status: "active",
    role: "user",
  });

  // Create authAccount bridge
  await ctx.db.insert("authAccounts", {
    accountId,
    provider: "supabase",
    providerUserId: identity.subject,
    email: identity.email,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  });

  const account = await ctx.db.get(accountId);
  if (!account) {
    throw new Error("Failed to create account");
  }
  return account;
}

// ============================================
// Canonical ID Helpers
// ============================================

/**
 * Get canonical pair of IDs (userA is always the smaller ID)
 * This prevents duplicate rows for relationships
 */
export function getCanonicalPair(
  id1: Id<"accounts">,
  id2: Id<"accounts">
): { userA: Id<"accounts">; userB: Id<"accounts"> } {
  if (id1 < id2) {
    return { userA: id1, userB: id2 };
  }
  return { userA: id2, userB: id1 };
}

// ============================================
// Relationship Helpers
// ============================================

/**
 * Check if there's a block between two accounts (in either direction)
 */
export async function isBlocked(
  ctx: QueryCtx | MutationCtx,
  accountId1: Id<"accounts">,
  accountId2: Id<"accounts">
): Promise<boolean> {
  // Check if account1 blocked account2
  const block1 = await ctx.db
    .query("blocks")
    .withIndex("by_blocker_blocked", (q) =>
      q.eq("blockerId", accountId1).eq("blockedId", accountId2)
    )
    .first();

  if (block1) return true;

  // Check if account2 blocked account1
  const block2 = await ctx.db
    .query("blocks")
    .withIndex("by_blocker_blocked", (q) =>
      q.eq("blockerId", accountId2).eq("blockedId", accountId1)
    )
    .first();

  return !!block2;
}

/**
 * Check if viewer can interact with target (not blocked)
 */
export async function canInteract(
  ctx: QueryCtx | MutationCtx,
  viewerId: Id<"accounts">,
  targetId: Id<"accounts">
): Promise<boolean> {
  return !(await isBlocked(ctx, viewerId, targetId));
}

/**
 * Check if two accounts are friends
 */
export async function isFriend(
  ctx: QueryCtx | MutationCtx,
  accountId1: Id<"accounts">,
  accountId2: Id<"accounts">
): Promise<boolean> {
  const { userA, userB } = getCanonicalPair(accountId1, accountId2);
  
  const friendship = await ctx.db
    .query("friends")
    .withIndex("by_userA_userB", (q) => q.eq("userA", userA).eq("userB", userB))
    .first();

  return !!friendship;
}

/**
 * Get relationship status between two accounts
 */
export async function getRelationship(
  ctx: QueryCtx | MutationCtx,
  viewerId: Id<"accounts">,
  targetId: Id<"accounts">
): Promise<{
  isFriend: boolean;
  hasPendingRequest: boolean;    // Viewer sent request to target
  hasReceivedRequest: boolean;   // Target sent request to viewer
  isBlockedEitherWay: boolean;
}> {
  const { userA, userB } = getCanonicalPair(viewerId, targetId);

  // Check friendship
  const friendship = await ctx.db
    .query("friends")
    .withIndex("by_userA_userB", (q) => q.eq("userA", userA).eq("userB", userB))
    .first();

  // Check friend request
  const friendRequest = await ctx.db
    .query("friendRequests")
    .withIndex("by_userA_userB", (q) => q.eq("userA", userA).eq("userB", userB))
    .first();

  // Check blocks
  const blocked = await isBlocked(ctx, viewerId, targetId);

  return {
    isFriend: !!friendship,
    hasPendingRequest: friendRequest?.status === "pending" && friendRequest.requesterId === viewerId,
    hasReceivedRequest: friendRequest?.status === "pending" && friendRequest.requesterId === targetId,
    isBlockedEitherWay: blocked,
  };
}

// ============================================
// DM Helpers
// ============================================

/**
 * Get or create a DM conversation between two accounts
 * Uses canonical ordering to ensure only one DM exists per pair
 */
export async function getOrCreateDM(
  ctx: MutationCtx,
  accountId1: Id<"accounts">,
  accountId2: Id<"accounts">
): Promise<Doc<"conversations">> {
  const { userA, userB } = getCanonicalPair(accountId1, accountId2);

  // Check for existing DM
  const existingDM = await ctx.db
    .query("conversations")
    .withIndex("by_dmUserA_dmUserB", (q) => q.eq("dmUserA", userA).eq("dmUserB", userB))
    .first();

  if (existingDM) {
    return existingDM;
  }

  // Create new DM
  const conversationId = await ctx.db.insert("conversations", {
    type: "dm",
    createdAt: Date.now(),
    createdBy: accountId1,
    dmUserA: userA,
    dmUserB: userB,
  });

  // Add both users as members
  await ctx.db.insert("conversationMembers", {
    conversationId,
    accountId: userA,
    joinedAt: Date.now(),
    role: "member",
  });
  await ctx.db.insert("conversationMembers", {
    conversationId,
    accountId: userB,
    joinedAt: Date.now(),
    role: "member",
  });

  const conversation = await ctx.db.get(conversationId);
  if (!conversation) {
    throw new Error("Failed to create conversation");
  }
  return conversation;
}

// ============================================
// Block Side-Effects
// ============================================

/**
 * Execute side-effects when blocking someone:
 * - Remove friendship if exists
 * - Cancel pending friend requests
 */
export async function executeBlockSideEffects(
  ctx: MutationCtx,
  blockerId: Id<"accounts">,
  blockedId: Id<"accounts">
): Promise<void> {
  const { userA, userB } = getCanonicalPair(blockerId, blockedId);

  // Remove friendship if exists
  const friendship = await ctx.db
    .query("friends")
    .withIndex("by_userA_userB", (q) => q.eq("userA", userA).eq("userB", userB))
    .first();

  if (friendship) {
    await ctx.db.delete(friendship._id);
    // Decrement friend counts for both
    await decrementFriendCount(ctx, blockerId);
    await decrementFriendCount(ctx, blockedId);
  }

  // Cancel pending friend requests
  const friendRequest = await ctx.db
    .query("friendRequests")
    .withIndex("by_userA_userB", (q) => q.eq("userA", userA).eq("userB", userB))
    .first();

  if (friendRequest && friendRequest.status === "pending") {
    await ctx.db.patch(friendRequest._id, {
      status: "cancelled",
      resolvedAt: Date.now(),
      resolvedBy: blockerId,
    });
  }
}

// ============================================
// Counter Helpers
// ============================================

/**
 * Increment post like count
 */
export async function incrementPostLikeCount(
  ctx: MutationCtx,
  postId: Id<"posts">,
  delta: number
): Promise<void> {
  const post = await ctx.db.get(postId);
  if (post) {
    await ctx.db.patch(postId, { likeCount: Math.max(0, post.likeCount + delta) });
  }
}

/**
 * Increment comment count on a post
 */
export async function incrementCommentCount(
  ctx: MutationCtx,
  postId: Id<"posts">,
  delta: number
): Promise<void> {
  const post = await ctx.db.get(postId);
  if (post) {
    await ctx.db.patch(postId, { commentCount: Math.max(0, post.commentCount + delta) });
  }
}

/**
 * Increment comment like count
 */
export async function incrementCommentLikeCount(
  ctx: MutationCtx,
  commentId: Id<"comments">,
  delta: number
): Promise<void> {
  const comment = await ctx.db.get(commentId);
  if (comment) {
    await ctx.db.patch(commentId, { likeCount: Math.max(0, comment.likeCount + delta) });
  }
}

/**
 * Increment reply count on a comment
 */
export async function incrementReplyCount(
  ctx: MutationCtx,
  commentId: Id<"comments">,
  delta: number
): Promise<void> {
  const comment = await ctx.db.get(commentId);
  if (comment) {
    await ctx.db.patch(commentId, { replyCount: Math.max(0, comment.replyCount + delta) });
  }
}

/**
 * Increment friend count for an account
 */
export async function incrementFriendCount(
  ctx: MutationCtx,
  accountId: Id<"accounts">,
  delta: number = 1
): Promise<void> {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
    .first();
  
  if (profile) {
    await ctx.db.patch(profile._id, { friendCount: Math.max(0, profile.friendCount + delta) });
  }
}

/**
 * Decrement friend count (convenience wrapper)
 */
export async function decrementFriendCount(
  ctx: MutationCtx,
  accountId: Id<"accounts">
): Promise<void> {
  await incrementFriendCount(ctx, accountId, -1);
}

/**
 * Increment post count for an account
 */
export async function incrementPostCount(
  ctx: MutationCtx,
  accountId: Id<"accounts">,
  delta: number = 1
): Promise<void> {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
    .first();
  
  if (profile) {
    await ctx.db.patch(profile._id, { postCount: Math.max(0, profile.postCount + delta) });
  }
}

// ============================================
// Formatting Helpers
// ============================================

/**
 * Format profile for API response
 */
export function formatProfile(profile: Doc<"profiles">) {
  return {
    id: profile._id,
    account_id: profile.accountId,
    username: profile.username,
    display_name: profile.displayName ?? "",
    avatar_url: profile.avatarUrl ?? "",
    bio: profile.bio ?? "",
    is_private: profile.isPrivate ?? false,
    friend_count: profile.friendCount,
    post_count: profile.postCount,
    created_at: new Date(profile._creationTime).toISOString(),
  };
}

/**
 * Format account for API response (minimal info)
 */
export function formatAccount(account: Doc<"accounts">) {
  return {
    id: account._id,
    status: account.status,
    role: account.role,
    created_at: new Date(account.createdAt).toISOString(),
  };
}

// ============================================
// Legacy Compatibility (DEPRECATED)
// ============================================

/**
 * @deprecated Use getViewer() instead
 */
export async function getCurrentProfile(ctx: QueryCtx | MutationCtx) {
  const viewer = await getViewer(ctx);
  return viewer?.profile ?? null;
}

/**
 * @deprecated Use requireViewerWithProfile() instead
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const viewer = await requireViewerWithProfile(ctx);
  return viewer.profile;
}

/**
 * @deprecated Use isFriend() instead
 */
export async function areFriends(
  ctx: QueryCtx | MutationCtx,
  userId1: Id<"accounts">,
  userId2: Id<"accounts">
): Promise<boolean> {
  return isFriend(ctx, userId1, userId2);
}
