/**
 * Re-export types from Convex for frontend use
 * This provides type safety derived directly from the schema
 * 
 * All types are generated from convex/schema.ts - if you need a new type,
 * add it to convex/types.ts and it will be available here.
 */

// Re-export everything from convex types
export * from "../../../../convex/types";


// ============================================
// Legacy Aliases (for backward compatibility)
// These map old type names to new ones
// ============================================

/**
 * @deprecated Use ProfileResponse instead
 */
export interface User {
  id: string;             // Profile ID
  account_id?: string;    // Account ID (canonical identity)
  username: string;
  avatar?: string;
  display_name?: string;
  bio?: string;
  status?: string;
  statusMessage?: string;
  friend_count?: number;
  post_count?: number;
}

/**
 * @deprecated Use PostResponse instead
 */
export interface Post {
  id: string;
  author: {
    username: string;
    avatar?: string;
  };
  content?: string;
  text?: string;
  audio_url?: string | null;
  audioFile?: {
    url: string;
    title: string;
    duration: number;
  };
  timestamp: string;
  likes: number;
  isLiked?: boolean;
  shares?: number;
  comments?: number;
  community?: string;
  isGlobal?: boolean;
}

/**
 * @deprecated Use CommentResponse instead
 */
export interface Comment {
  id: string;
  postId: string;
  author: {
    username: string;
    avatar?: string;
  };
  content?: string;
  audio_url?: string | null;
  audioFile?: {
    url: string;
    title: string;
    duration: number;
  };
  timestamp: string;
}

/**
 * @deprecated Use MessageResponse instead
 */
export interface Message {
  id: string;
  senderId?: string;
  receiverId?: string;
  content?: string;
  audio_url?: string | null;
  timestamp?: string;
  isRead?: boolean;
}

/**
 * @deprecated Use ConversationResponse instead
 */
export interface Conversation {
  id: string;
  userId: string;
  lastMessage?: Message;
  unreadCount: number;
}
