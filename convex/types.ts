/**
 * Shared types for API responses
 * These are derived from the schema but formatted for frontend consumption
 * 
 * Usage in frontend: import { UserProfile, PostResponse } from "../../convex/types"
 */

import type { Doc, Id } from "./_generated/dataModel";

// ============================================
// Re-export Convex types for convenience
// ============================================
export type { Doc, Id };
export type { DataModel, TableNames } from "./_generated/dataModel";

// ============================================
// Table Document Types (raw from DB)
// ============================================
export type Account = Doc<"accounts">;
export type AuthAccount = Doc<"authAccounts">;
export type Profile = Doc<"profiles">;
export type Post = Doc<"posts">;
export type Comment = Doc<"comments">;
export type PostLike = Doc<"postLikes">;
export type CommentLike = Doc<"commentLikes">;
export type Friend = Doc<"friends">;
export type FriendRequest = Doc<"friendRequests">;
export type Block = Doc<"blocks">;
export type Conversation = Doc<"conversations">;
export type ConversationMember = Doc<"conversationMembers">;
export type Message = Doc<"messages">;
export type Report = Doc<"reports">;

// ============================================
// ID Types
// ============================================
export type AccountId = Id<"accounts">;
export type ProfileId = Id<"profiles">;
export type PostId = Id<"posts">;
export type CommentId = Id<"comments">;
export type ConversationId = Id<"conversations">;
export type MessageId = Id<"messages">;

// ============================================
// API Response Types (what queries/mutations return)
// ============================================

/** Minimal author info embedded in posts/comments */
export interface AuthorInfo {
  id: ProfileId;
  account_id: AccountId;
  username: string;
  display_name: string;
  avatar_url: string;
}

/** Profile response from getMe, getByUsername, etc. */
export interface ProfileResponse {
  id: ProfileId;
  account_id: AccountId;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  is_private: boolean;
  friend_count: number;
  post_count: number;
  created_at: string;
}

/** Account check response from ensureAccount, getMyAccount */
export interface AccountCheckResponse {
  accountId: AccountId;
  hasProfile: boolean;
  profile: ProfileResponse | null;
}

/** Post response from queries */
export interface PostResponse {
  id: PostId;
  author_id: AccountId;
  content: string;
  media_urls: string[];
  visibility: "public" | "friends" | "private";
  created_at: string;
  author: AuthorInfo | null;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_deleted: boolean;
}

/** Comment response from queries */
export interface CommentResponse {
  id: CommentId;
  post_id: PostId;
  author_id: AccountId;
  parent_id: CommentId | null;
  content: string;
  created_at: string;
  author: AuthorInfo | null;
  likes_count: number;
  replies_count: number;
  is_liked: boolean;
  is_deleted: boolean;
}

/** Message response from queries */
export interface MessageResponse {
  id: MessageId;
  conversation_id: ConversationId;
  sender_id: AccountId;
  content: string;
  created_at: string;
  is_deleted: boolean;
  is_system: boolean;
}

/** Conversation response from getConversations */
export interface ConversationResponse {
  id: ConversationId;
  type: "dm" | "group";
  other_user: AuthorInfo | null;
  title?: string;
  image_url?: string;
  last_message: {
    id: MessageId;
    content: string;
    sender_id: AccountId;
    created_at: string;
    is_deleted: boolean;
  } | null;
  updated_at: string;
}

/** Friend list item */
export interface FriendInfo {
  account_id: AccountId;
  id: ProfileId;
  username: string;
  display_name: string;
  avatar_url: string;
  friends_since: string;
}

/** Friend request item */
export interface FriendRequestInfo {
  account_id: AccountId;
  id: ProfileId;
  username: string;
  display_name: string;
  avatar_url: string;
  requested_at: string;
}

/** Block list item */
export interface BlockInfo {
  account_id: AccountId;
  id: ProfileId;
  username: string;
  display_name: string;
  avatar_url: string;
  blocked_at: string;
}

/** User profile with relationship info */
export interface UserProfileWithRelationship extends ProfileResponse {
  relationship: {
    is_friend: boolean;
    has_pending_request: boolean;
    has_received_request: boolean;
    is_blocked: boolean;
  } | null;
  is_self: boolean;
}

/** Username availability check */
export interface UsernameCheckResponse {
  available: boolean;
  reason: string | null;
}

// ============================================
// Paginated Response Types
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  nextCursor: unknown;
  total?: number;
}

export type PaginatedPosts = PaginatedResponse<PostResponse>;
export type PaginatedComments = PaginatedResponse<CommentResponse>;
export type PaginatedMessages = PaginatedResponse<MessageResponse>;
export type PaginatedConversations = PaginatedResponse<ConversationResponse>;
export type PaginatedFriends = PaginatedResponse<FriendInfo>;
export type PaginatedFriendRequests = PaginatedResponse<FriendRequestInfo>;
export type PaginatedBlocks = PaginatedResponse<BlockInfo>;

// ============================================
// Status Enums (for type safety)
// ============================================

export const AccountStatus = {
  ACTIVE: "active",
  BANNED: "banned",
  DELETED: "deleted",
} as const;
export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];

export const AccountRole = {
  USER: "user",
  ADMIN: "admin",
} as const;
export type AccountRole = (typeof AccountRole)[keyof typeof AccountRole];

export const FriendRequestStatus = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
} as const;
export type FriendRequestStatus = (typeof FriendRequestStatus)[keyof typeof FriendRequestStatus];

export const PostVisibility = {
  PUBLIC: "public",
  FRIENDS: "friends",
  PRIVATE: "private",
} as const;
export type PostVisibility = (typeof PostVisibility)[keyof typeof PostVisibility];

export const ConversationType = {
  DM: "dm",
  GROUP: "group",
} as const;
export type ConversationType = (typeof ConversationType)[keyof typeof ConversationType];

export const ReportStatus = {
  PENDING: "pending",
  REVIEWED: "reviewed",
  ACTIONED: "actioned",
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

