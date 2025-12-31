// Shared types for API responses
// These types should match the backend API schema

// Backend User response type (may have snake_case fields)
export interface BackendUser {
  id: string;
  username: string;
  avatar_url?: string;
  display_name?: string;
  bio?: string;
  status?: string;
  statusMessage?: string;
  [key: string]: unknown;
}

// Frontend User type (camelCase)
export interface User {
  id: string;
  username: string;
  avatar?: string;
  display_name?: string;
  bio?: string;
  status?: string;
  statusMessage?: string;
}

// Helper to normalize user from backend format
export function normalizeUser(backendUser: BackendUser): User {
  return {
    id: backendUser.id,
    username: backendUser.username,
    avatar: backendUser.avatar_url || undefined, // Convert avatar_url to avatar
    display_name: backendUser.display_name,
    bio: backendUser.bio,
    status: backendUser.status,
    statusMessage: backendUser.statusMessage,
  };
}

// Backend response type (snake_case)
export interface BackendPost {
  id: string;
  author_id?: string;
  text?: string;
  audio_url?: string | null;
  created_at: string;
  likes_count: number;
  is_liked?: boolean;
  author: {
    id: string;
    username: string;
    avatar_url?: string;
    display_name?: string;
  };
  // Add any other backend fields that might exist
  [key: string]: unknown;
}

// Frontend Post type (camelCase)
export interface Post {
  id: string;
  author: {
    username: string;
    avatar?: string;
  };
  content?: string;
  text?: string; // Backend uses 'text', frontend uses 'content'
  audio_url?: string | null;
  audioFile?: {
    url: string;
    title: string;
    duration: number;
  };
  timestamp: string; // ISO date string from backend
  likes: number;
  isLiked?: boolean;
  shares?: number;
  comments?: number;
  community?: string;
  isGlobal?: boolean;
}

// Backend Comment response type (snake_case)
export interface BackendComment {
  id: string;
  post_id?: string;
  text?: string;
  audio_url?: string | null;
  created_at: string;
  author: {
    id: string;
    username: string;
    avatar_url?: string;
    display_name?: string;
  };
  [key: string]: unknown;
}

// Frontend Comment type (camelCase)
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
  timestamp: string; // ISO date string from backend
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content?: string;
  text?: string; // Backend uses 'text'
  audio_url?: string | null;
  timestamp: string; // ISO date string from backend
  isRead?: boolean;
}

export interface Conversation {
  id: string;
  userId: string;
  lastMessage?: Message;
  unreadCount: number;
}

// Helper function to convert backend Post (snake_case) to frontend Post format (camelCase)
export function normalizePost(backendPost: BackendPost): Post {
  return {
    id: backendPost.id,
    author: {
      username: backendPost.author.username,
      avatar: backendPost.author.avatar_url || undefined, // Convert avatar_url to avatar
    },
    text: backendPost.text,
    content: backendPost.text, // Map text to content for frontend
    audio_url: backendPost.audio_url || null,
    timestamp: backendPost.created_at, // Map created_at to timestamp
    likes: backendPost.likes_count || 0, // Map likes_count to likes
    isLiked: backendPost.is_liked || false, // Map is_liked to isLiked
    shares: 0, // Not in backend response
    comments: 0, // Not in backend response
    community: undefined, // Backend doesn't return this yet
    isGlobal: true, // Default to true for feed posts (backend doesn't return this field)
  };
}

// Helper function to convert backend Comment (snake_case) to frontend Comment format (camelCase)
export function normalizeComment(backendComment: BackendComment): Comment {
  return {
    id: backendComment.id,
    postId: backendComment.post_id || backendComment.id, // Fallback if post_id is missing
    author: {
      username: backendComment.author.username,
      avatar: backendComment.author.avatar_url || undefined, // Convert avatar_url to avatar
    },
    content: backendComment.text, // Map text to content for frontend
    audio_url: backendComment.audio_url || null,
    timestamp: backendComment.created_at, // Map created_at to timestamp
  };
}

// Helper function to convert backend Message to frontend Message format
export function normalizeMessage(message: Message): Message {
  // Message is already in the right format from API, just ensure content is set
  return {
    ...message,
    content: message.content || message.text || '',
  };
}

