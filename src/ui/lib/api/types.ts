// Shared types for the application

// User type used throughout the app
export interface User {
  id: string;
  username: string;
  avatar?: string;
  display_name?: string;
  bio?: string;
  status?: string;
  statusMessage?: string;
}

// Post type used in components
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

// Comment type
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

// Message type
export interface Message {
  id: string;
  senderId?: string;
  receiverId?: string;
  content?: string;
  audio_url?: string | null;
  timestamp?: string;
  isRead?: boolean;
}

// Conversation type
export interface Conversation {
  id: string;
  userId: string;
  lastMessage?: Message;
  unreadCount: number;
}
