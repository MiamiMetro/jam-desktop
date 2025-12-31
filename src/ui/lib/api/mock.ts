// Mock API functions - simulate async API calls

export type User = {
  id: string;
  username: string;
  avatar?: string;
  status: string;
  statusMessage?: string;
};

export type Room = {
  id: string;
  name: string;
  description?: string;
  genre?: string;
  participants: number;
  maxParticipants: number;
  isPrivate: boolean;
  hostAvatar?: string;
  hostName: string;
  hostId: string; // ID of the room owner
  communityId?: string;
  isEnabled: boolean; // Whether room is active and visible
  lastActiveAt: Date; // Last time room had activity (participants or messages)
  createdAt: Date; // When room was created
  streamUrl?: string; // HLS stream URL (e.g., "https://example.com/hls/stream.m3u8")
};

export type Post = {
  id: string;
  author: {
    username: string;
    avatar?: string;
  };
  content?: string;
  audioFile?: {
    url: string;
    title: string;
    duration: number;
  };
  timestamp: Date;
  likes: number;
  isLiked: boolean;
  shares: number;
  comments: number;
  community?: string; // Community ID or name
  isGlobal?: boolean; // Flag for global discovery content
};

export type Comment = {
  id: string;
  postId: string;
  author: {
    username: string;
    avatar?: string;
  };
  content: string;
  audioFile?: {
    url: string;
    title: string;
    duration: number;
  };
  timestamp: Date;
};

export type Community = {
  id: string;
  name: string;
  description: string;
  category: string[];
  activeCount: number;
  totalMembers: number;
  isLive: boolean;
  recentPosts: Post[];
  recentJam?: Room;
};

// Mock data
const mockUsers: User[] = [
  { id: "1", username: "XeFOs", status: "Online", statusMessage: "Olala.", avatar: undefined },
  { id: "2", username: "Akuma chun", status: "In Game", statusMessage: "Jamming", avatar: undefined },
  { id: "3", username: "AnataBakka", status: "In Queue", statusMessage: "Waiting for jam", avatar: undefined },
  { id: "4", username: "TDTN Kira", status: "In Game", statusMessage: "Playing", avatar: undefined },
  { id: "5", username: "zebuto", status: "In Game", statusMessage: "Jamming", avatar: undefined },
  { id: "6", username: "DesertStark", status: "Away", statusMessage: "Mobile", avatar: undefined },
  { id: "7", username: "LEBOVIM", status: "Away", statusMessage: "Mobile", avatar: undefined },
  { id: "8", username: "MadsNado", status: "Away", statusMessage: "Mobile", avatar: undefined },
  { id: "9", username: "ThatGuyDan", status: "Away", statusMessage: "Mobile", avatar: undefined },
  { id: "10", username: "OhmyDOG", status: "Away", statusMessage: "Away", avatar: undefined },
];

// In-memory storage for user rooms (simulating database)
// In real app, this would be in a database
const userRooms = new Map<string, Room>();

// Helper to check if room should be auto-disabled (24 hours of inactivity)
const INACTIVITY_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

const shouldAutoDisable = (room: Room): boolean => {
  if (!room.isEnabled) return false; // Already disabled
  const timeSinceActive = Date.now() - room.lastActiveAt.getTime();
  return timeSinceActive > INACTIVITY_THRESHOLD_MS;
};

// Initialize with one example room
const mockRooms: Room[] = [
  {
    id: "1",
    name: "Chill Vibes",
    description: "Relaxing beats for the evening",
    genre: "Lo-Fi",
    participants: 3,
    maxParticipants: 8,
    isPrivate: false,
    hostName: "Tylobic",
    hostId: "99", // Example host ID
    communityId: "lofi",
    isEnabled: true,
    streamUrl: "http://jam.welor.fun:8080/hls/stream.m3u8", // Example HLS stream URL
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
];

const mockCommunities: Community[] = [
  {
    id: "lofi",
    name: "LoFi Beats",
    description: "A place for chill vibes and relaxed jamming",
    category: ["LoFi", "Chill", "Study"],
    activeCount: 23,
    totalMembers: 450,
    isLive: true,
    recentPosts: [],
    recentJam: mockRooms[0],
  },
  {
    id: "rock",
    name: "Rock & Roll",
    description: "A place for rockers to jam and collaborate",
    category: ["Rock", "Metal", "Alternative"],
    activeCount: 18,
    totalMembers: 320,
    isLive: true,
    recentPosts: [],
    recentJam: mockRooms[0],
  },
  {
    id: "electronic",
    name: "Electronic Music",
    description: "A place for EDM and electronic producers",
    category: ["Electronic", "EDM", "Techno"],
    activeCount: 31,
    totalMembers: 580,
    isLive: true,
    recentPosts: [],
    recentJam: mockRooms[0],
  },
  {
    id: "jazz",
    name: "Jazz Lounge",
    description: "A place for smooth jazz and improvisation",
    category: ["Jazz", "Smooth", "Improvisation"],
    activeCount: 12,
    totalMembers: 210,
    isLive: false,
    recentPosts: [],
    recentJam: mockRooms[0],
  },
  {
    id: "hiphop",
    name: "Hip Hop Cypher",
    description: "A place for freestyle and beats",
    category: ["Hip Hop", "Rap", "Beats"],
    activeCount: 27,
    totalMembers: 520,
    isLive: true,
    recentPosts: [],
    recentJam: mockRooms[0],
  },
  {
    id: "metal",
    name: "Metal Mayhem",
    description: "A place for heavy riffs and powerful drums",
    category: ["Metal", "Heavy", "Hardcore"],
    activeCount: 15,
    totalMembers: 280,
    isLive: true,
    recentPosts: [],
    recentJam: mockRooms[0],
  },
  {
    id: "indie",
    name: "Indie Vibes",
    description: "A place for alternative and indie rock",
    category: ["Indie", "Alternative", "Rock"],
    activeCount: 19,
    totalMembers: 340,
    isLive: false,
    recentPosts: [],
    recentJam: mockRooms[0],
  },
  {
    id: "classical",
    name: "Classical Harmony",
    description: "A place for orchestral and classical compositions",
    category: ["Classical", "Orchestral", "Symphony"],
    activeCount: 8,
    totalMembers: 150,
    isLive: false,
    recentPosts: [],
    recentJam: mockRooms[0],
  },
  {
    id: "rnb",
    name: "R&B Soul",
    description: "A place for smooth R&B and soulful melodies",
    category: ["R&B", "Soul", "Smooth"],
    activeCount: 14,
    totalMembers: 260,
    isLive: false,
    recentPosts: [],
    recentJam: mockRooms[0],
  },
  {
    id: "reggae",
    name: "Reggae Roots",
    description: "A place for island vibes and reggae beats",
    category: ["Reggae", "Island", "Roots"],
    activeCount: 11,
    totalMembers: 190,
    isLive: false,
    recentPosts: [],
    recentJam: mockRooms[0],
  },
];

const mockPosts: Post[] = [
  {
    id: "1",
    author: {
      username: "XeFOs",
    },
    content: "Just finished this new track! What do you think?",
    audioFile: {
      url: "#",
      title: "New Track - XeFOs",
      duration: 180,
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    likes: 24,
    isLiked: false,
    shares: 5,
    comments: 8,
    community: "rock",
  },
  {
    id: "2",
    author: {
      username: "Akuma chun",
    },
    content: "Late night jam session vibes 🎵",
    audioFile: {
      url: "#",
      title: "Late Night Jam",
      duration: 240,
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    likes: 18,
    isLiked: true,
    shares: 3,
    comments: 4,
    community: "electronic",
  },
  {
    id: "3",
    author: {
      username: "MusicProducer123",
    },
    content: "Check out this experimental beat I've been working on!",
    audioFile: {
      url: "#",
      title: "Experimental Beat",
      duration: 195,
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    likes: 156,
    isLiked: false,
    shares: 42,
    comments: 23,
    isGlobal: true,
    community: "electronic",
  },
  {
    id: "4",
    author: {
      username: "TDTN Kira",
    },
    content: "New collaboration with @zebuto dropping soon!",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    likes: 32,
    isLiked: false,
    shares: 12,
    comments: 15,
    community: "hiphop",
  },
  {
    id: "5",
    author: {
      username: "GlobalBeats",
    },
    content: "Weekly mix is live! Featuring the best tracks from this week.",
    audioFile: {
      url: "#",
      title: "Weekly Mix - Week 12",
      duration: 3600,
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    likes: 892,
    isLiked: true,
    shares: 234,
    comments: 89,
    isGlobal: true,
    community: "electronic",
  },
  {
    id: "6",
    author: {
      username: "JazzMaster",
    },
    content: "Smooth jazz session from last night",
    audioFile: {
      url: "#",
      title: "Jazz Session",
      duration: 420,
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1),
    likes: 45,
    isLiked: false,
    shares: 8,
    comments: 12,
    community: "jazz",
  },
  {
    id: "7",
    author: {
      username: "MetalHead",
    },
    content: "New metal track, check it out!",
    audioFile: {
      url: "#",
      title: "Metal Track",
      duration: 240,
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    likes: 67,
    isLiked: true,
    shares: 15,
    comments: 9,
    community: "metal",
  },
];

// Mock API functions
export const fetchPosts = async (): Promise<Post[]> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
  return [...mockPosts];
};

export const fetchCommunityPosts = async (communityId: string): Promise<Post[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockPosts.filter(post => post.community === communityId);
};

export const fetchGlobalPosts = async (): Promise<Post[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockPosts.filter(post => post.isGlobal === true);
};

export const fetchPost = async (id: string): Promise<Post | null> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockPosts.find(post => post.id === id) || null;
};

export const fetchCommunities = async (filters?: { category?: string; search?: string }): Promise<Community[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  let filtered = [...mockCommunities];
  
  if (filters?.category) {
    filtered = filtered.filter(comm => 
      comm.category.some(cat => cat.toLowerCase().includes(filters.category!.toLowerCase()))
    );
  }
  
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(comm => 
      comm.name.toLowerCase().includes(searchLower) ||
      comm.description.toLowerCase().includes(searchLower)
    );
  }
  
  return filtered;
};

export const fetchCommunity = async (id: string): Promise<Community | null> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockCommunities.find(comm => comm.id === id) || null;
};

export const fetchJoinedCommunities = async (): Promise<Community[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  // Mock: return first 3 communities as "joined"
  return mockCommunities.slice(0, 3);
};

export const fetchJams = async (): Promise<Room[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  // Combine mock rooms and user rooms, filter out disabled rooms
  const allRooms = [...mockRooms, ...Array.from(userRooms.values())];
  return allRooms.filter(room => {
    // Auto-disable inactive rooms
    if (shouldAutoDisable(room)) {
      room.isEnabled = false;
    }
    // Only return enabled rooms for public listing
    return room.isEnabled;
  });
};

export const fetchJam = async (id: string): Promise<Room | null> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  // Check both mock rooms and user rooms
  const room = mockRooms.find(room => room.id === id) || userRooms.get(id);
  if (!room) return null;
  
  // Auto-disable if inactive
  if (shouldAutoDisable(room)) {
    room.isEnabled = false;
  }
  
  return room;
};

// Get user's own room (if they have one)
export const getMyRoom = async (userId: string): Promise<Room | null> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const room = Array.from(userRooms.values()).find(r => r.hostId === userId);
  if (!room) return null;
  
  // Auto-disable if inactive
  if (shouldAutoDisable(room)) {
    room.isEnabled = false;
  }
  
  return room;
};

// Create a new room for a user (only one room per user)
export const createRoom = async (
  userId: string,
  hostName: string,
  hostAvatar: string | undefined,
  roomData: {
    name: string;
    description?: string;
    genre?: string;
    maxParticipants: number;
    isPrivate: boolean;
  }
): Promise<Room> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Check if user already has a room
  const existingRoom = Array.from(userRooms.values()).find(r => r.hostId === userId);
  if (existingRoom) {
    throw new Error("User already has a room. Update existing room instead.");
  }
  
  const newRoom: Room = {
    id: `room-${Date.now()}`,
    name: roomData.name,
    description: roomData.description,
    genre: roomData.genre,
    participants: 1, // Host is first participant
    maxParticipants: roomData.maxParticipants,
    isPrivate: roomData.isPrivate,
    hostName,
    hostAvatar,
    hostId: userId,
    isEnabled: true,
    lastActiveAt: new Date(),
    createdAt: new Date(),
    streamUrl: `https://example.com/hls/${userId}/stream.m3u8`, // Generate HLS stream URL
  };
  
  userRooms.set(newRoom.id, newRoom);
  return newRoom;
};

// Update room settings
export const updateRoom = async (
  roomId: string,
  userId: string,
  updates: {
    name?: string;
    description?: string;
    genre?: string;
    maxParticipants?: number;
    isPrivate?: boolean;
  }
): Promise<Room> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const room = userRooms.get(roomId) || mockRooms.find(r => r.id === roomId);
  if (!room) {
    throw new Error("Room not found");
  }
  
  if (room.hostId !== userId) {
    throw new Error("Only room host can update room settings");
  }
  
  // Update fields
  if (updates.name !== undefined) room.name = updates.name;
  if (updates.description !== undefined) room.description = updates.description;
  if (updates.genre !== undefined) room.genre = updates.genre;
  if (updates.maxParticipants !== undefined) room.maxParticipants = updates.maxParticipants;
  if (updates.isPrivate !== undefined) room.isPrivate = updates.isPrivate;
  
  // Update in storage
  if (userRooms.has(roomId)) {
    userRooms.set(roomId, room);
  }
  
  return room;
};

// Activate a disabled room
export const activateRoom = async (roomId: string, userId: string): Promise<Room> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const room = userRooms.get(roomId) || mockRooms.find(r => r.id === roomId);
  if (!room) {
    throw new Error("Room not found");
  }
  
  if (room.hostId !== userId) {
    throw new Error("Only room host can activate room");
  }
  
  room.isEnabled = true;
  room.lastActiveAt = new Date();
  
  if (userRooms.has(roomId)) {
    userRooms.set(roomId, room);
  }
  
  return room;
};

// Deactivate a room
export const deactivateRoom = async (roomId: string, userId: string): Promise<Room> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const room = userRooms.get(roomId) || mockRooms.find(r => r.id === roomId);
  if (!room) {
    throw new Error("Room not found");
  }
  
  if (room.hostId !== userId) {
    throw new Error("Only room host can deactivate room");
  }
  
  room.isEnabled = false;
  
  if (userRooms.has(roomId)) {
    userRooms.set(roomId, room);
  }
  
  return room;
};

// Update room activity (called when user enters room or sends message)
export const updateRoomActivity = async (roomId: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const room = userRooms.get(roomId) || mockRooms.find(r => r.id === roomId);
  if (room) {
    room.lastActiveAt = new Date();
    // Auto-enable if it was disabled
    if (!room.isEnabled) {
      room.isEnabled = true;
    }
    if (userRooms.has(roomId)) {
      userRooms.set(roomId, room);
    }
  }
};

export const fetchOnlineUsers = async (): Promise<User[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockUsers.filter(user => 
    user.status === "Online" || user.status === "In Game" || user.status === "In Queue"
  );
};

export const fetchUser = async (id: string): Promise<User | null> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockUsers.find(user => user.id === id) || null;
};

export const fetchAllUsers = async (): Promise<User[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return [...mockUsers];
};

export type Message = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
};

export type Conversation = {
  id: string;
  userId: string;
  lastMessage?: Message;
  unreadCount: number;
};

// Mock messages
const mockMessages: Message[] = [
  {
    id: "1",
    senderId: "2",
    receiverId: "1",
    content: "Hey! Want to jam together?",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    isRead: true,
  },
  {
    id: "2",
    senderId: "1",
    receiverId: "2",
    content: "Sure! What are you thinking?",
    timestamp: new Date(Date.now() - 1000 * 60 * 25),
    isRead: true,
  },
  {
    id: "3",
    senderId: "2",
    receiverId: "1",
    content: "Maybe some electronic vibes?",
    timestamp: new Date(Date.now() - 1000 * 60 * 20),
    isRead: true,
  },
  {
    id: "4",
    senderId: "3",
    receiverId: "1",
    content: "Check out my new track!",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    isRead: false,
  },
];

export const fetchConversations = async (userId: string): Promise<Conversation[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  // Get unique conversation partners
  const partnerIds = new Set<string>();
  mockMessages.forEach(msg => {
    if (msg.senderId === userId) partnerIds.add(msg.receiverId);
    if (msg.receiverId === userId) partnerIds.add(msg.senderId);
  });
  
  return Array.from(partnerIds).map(partnerId => {
    const conversationMessages = mockMessages
      .filter(msg => 
        (msg.senderId === userId && msg.receiverId === partnerId) ||
        (msg.senderId === partnerId && msg.receiverId === userId)
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    const unreadCount = conversationMessages.filter(
      msg => msg.receiverId === userId && !msg.isRead
    ).length;
    
    return {
      id: partnerId,
      userId: partnerId,
      lastMessage: conversationMessages[0],
      unreadCount,
    };
  }).sort((a, b) => {
    // Sort by last message timestamp
    const aTime = a.lastMessage?.timestamp.getTime() || 0;
    const bTime = b.lastMessage?.timestamp.getTime() || 0;
    return bTime - aTime;
  });
};

export const fetchMessages = async (userId: string, partnerId: string): Promise<Message[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockMessages
    .filter(msg => 
      (msg.senderId === userId && msg.receiverId === partnerId) ||
      (msg.senderId === partnerId && msg.receiverId === userId)
    )
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
};

export const sendMessage = async (senderId: string, receiverId: string, content: string): Promise<Message> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  const newMessage: Message = {
    id: Date.now().toString(),
    senderId,
    receiverId,
    content,
    timestamp: new Date(),
    isRead: false,
  };
  mockMessages.push(newMessage);
  return newMessage;
};

// Mock comments storage
const mockComments: Comment[] = [
  {
    id: "1",
    postId: "1",
    author: { username: "Akuma chun" },
    content: "This is amazing! Great work!",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: "2",
    postId: "1",
    author: { username: "AnataBakka" },
    content: "Love the vibes here!",
    timestamp: new Date(Date.now() - 1000 * 60 * 20),
  },
];

export const fetchComments = async (postId: string): Promise<Comment[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockComments
    .filter(comment => comment.postId === postId)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
};

export const createComment = async (postId: string, userId: string, content: string, audioFile?: File): Promise<Comment> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  const user = mockUsers.find(u => u.id === userId);
  if (!user) {
    throw new Error("User not found");
  }
  
  // If audio file provided, create audio metadata
  let audioFileData: { url: string; title: string; duration: number } | undefined;
  if (audioFile) {
    // In a real app, you'd upload the file and get a URL
    // For now, we'll create a blob URL
    const audioUrl = URL.createObjectURL(audioFile);
    const audio = new Audio(audioUrl);
    
    // Wait for metadata to load
    await new Promise<void>((resolve) => {
      audio.addEventListener("loadedmetadata", () => {
        audioFileData = {
          url: audioUrl,
          title: audioFile.name || "Voice Recording",
          duration: audio.duration,
        };
        resolve();
      });
      audio.load();
    });
  }
  
  const newComment: Comment = {
    id: Date.now().toString(),
    postId,
    author: {
      username: user.username,
      avatar: user.avatar,
    },
    content,
    audioFile: audioFileData,
    timestamp: new Date(),
  };
  mockComments.push(newComment);
  
  // Update post comment count
  const post = mockPosts.find(p => p.id === postId);
  if (post) {
    post.comments += 1;
  }
  
  return newComment;
};

