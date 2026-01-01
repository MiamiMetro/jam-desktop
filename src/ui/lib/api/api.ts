// API endpoint functions
import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from './client';
import type { User, Post, Message, Conversation, BackendPost, BackendUser } from './types';
import { normalizePost, normalizeUser, normalizeMessage } from './types';

// Auth endpoints
export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  username: string;
  display_name?: string;
}

export interface AuthResponse {
  access_token: string;
  user?: User;
}

export const authApi = {
  login: (data: LoginDto): Promise<AuthResponse> => apiPost('/auth/login', data),
  register: (data: RegisterDto): Promise<AuthResponse> => apiPost('/auth/register', data),
  getMe: async (): Promise<User> => {
    const backendUser = await apiGet<BackendUser>('/auth/me');
    return normalizeUser(backendUser);
  },
};

// Posts endpoints
export interface CreatePostDto {
  text?: string;
  audio_url?: string | null;
}

export interface CreateCommentDto {
  content?: string;
  audio_url?: string | null;
}

export const postsApi = {
  getFeed: async (params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Post>> => {
    const response = await apiGet<PaginatedResponse<BackendPost>>('/posts/feed', params);
    return {
      ...response,
      data: response.data.map(normalizePost),
    };
  },
  
  getPost: async (postId: string): Promise<Post> => {
    const backendPost = await apiGet<BackendPost>(`/posts/${postId}`);
    return normalizePost(backendPost);
  },
  
  createPost: async (data: CreatePostDto): Promise<Post> => {
    const backendPost = await apiPost<BackendPost>('/posts', data);
    return normalizePost(backendPost);
  },
  
  deletePost: (postId: string): Promise<void> => 
    apiDelete(`/posts/${postId}`),
  
  toggleLike: async (postId: string): Promise<Post> => {
    const backendPost = await apiPost<BackendPost>(`/posts/${postId}/like`);
    return normalizePost(backendPost);
  },
  
  getPostLikes: async (postId: string): Promise<User[]> => {
    const backendUsers = await apiGet<BackendUser[]>(`/posts/${postId}/likes`);
    return backendUsers.map(normalizeUser);
  },
  
  getComments: async (postId: string, params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Post>> => {
    // Comments are now posts with parent_post_id, so we normalize them as posts
    const response = await apiGet<PaginatedResponse<BackendPost>>(`/posts/${postId}/comments`, params);
    return {
      ...response,
      data: response.data.map(normalizePost),
    };
  },
  
  createComment: async (postId: string, data: CreateCommentDto): Promise<Post> => {
    // Comments are now posts with parent_post_id, so we normalize as post
    const backendPost = await apiPost<BackendPost>(`/posts/${postId}/comments`, data);
    return normalizePost(backendPost);
  },
};

// Profiles endpoints
export interface UpdateProfileDto {
  username?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
}

export const profilesApi = {
  getProfile: async (username: string): Promise<User> => {
    const backendUser = await apiGet<BackendUser>(`/profiles/${username}`);
    return normalizeUser(backendUser);
  },
  
  getMyProfile: async (): Promise<User> => {
    const backendUser = await apiGet<BackendUser>('/profiles/me');
    return normalizeUser(backendUser);
  },
  
  updateMyProfile: async (data: UpdateProfileDto): Promise<User> => {
    const backendUser = await apiPatch<BackendUser>('/profiles/me', data);
    return normalizeUser(backendUser);
  },
  
  getUserPosts: async (username: string, params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Post>> => {
    const response = await apiGet<PaginatedResponse<BackendPost>>(`/profiles/${username}/posts`, params);
    return {
      ...response,
      data: response.data.map(normalizePost),
    };
  },
};

// Users endpoints
export const usersApi = {
  getUsers: async (params?: { limit?: number; offset?: number; search?: string }): Promise<PaginatedResponse<User>> => {
    const response = await apiGet<PaginatedResponse<BackendUser>>('/users', params);
    return {
      ...response,
      data: response.data.map(normalizeUser),
    };
  },
  
  getOnlineUsers: async (params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<User>> => {
    const response = await apiGet<PaginatedResponse<BackendUser>>('/users/online', params);
    return {
      ...response,
      data: response.data.map(normalizeUser),
    };
  },
};

// Messages endpoints
export interface SendMessageDto {
  recipient_id: string;
  text?: string;
  audio_url?: string | null;
}

export const messagesApi = {
  sendMessage: (data: SendMessageDto): Promise<Message> => 
    apiPost<Message>('/messages/send', data),
  
  getConversations: (params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Conversation>> => 
    apiGet<PaginatedResponse<Conversation>>('/messages/conversations', params),
  
  getMessages: async (userId: string, params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Message>> => {
    const response = await apiGet<PaginatedResponse<Message>>(`/messages/conversation/${userId}`, params);
    return {
      ...response,
      data: response.data.map(normalizeMessage),
    };
  },
  
  deleteMessage: (messageId: string): Promise<void> => 
    apiDelete(`/messages/${messageId}`),
};

// Friends endpoints
export const friendsApi = {
  getFriends: async (params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<User>> => {
    const response = await apiGet<PaginatedResponse<BackendUser>>('/friends', params);
    return {
      ...response,
      data: response.data.map(normalizeUser),
    };
  },
  
  getFriendRequests: async (params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<User>> => {
    const response = await apiGet<PaginatedResponse<BackendUser>>('/friends/requests', params);
    return {
      ...response,
      data: response.data.map(normalizeUser),
    };
  },
  
  requestFriend: (userId: string): Promise<void> => 
    apiPost(`/friends/${userId}/request`),
  
  acceptFriend: (userId: string): Promise<void> => 
    apiPost(`/friends/${userId}/accept`),
  
  deleteFriend: (userId: string): Promise<void> => 
    apiDelete(`/friends/${userId}`),
};

// Blocks endpoints
export const blocksApi = {
  getBlockedUsers: async (params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<User>> => {
    const response = await apiGet<PaginatedResponse<BackendUser>>('/blocks', params);
    return {
      ...response,
      data: response.data.map(normalizeUser),
    };
  },
  
  blockUser: (userId: string): Promise<void> => 
    apiPost(`/blocks/${userId}`),
  
  unblockUser: (userId: string): Promise<void> => 
    apiDelete(`/blocks/${userId}`),
};

