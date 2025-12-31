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
  communityId?: string;
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
  { id: "1", username: "XeFOs", status: "Online", statusMessage: "Olala.", avatar: null },
  { id: "2", username: "Akuma chun", status: "In Game", statusMessage: "Jamming", avatar: null },
  { id: "3", username: "AnataBakka", status: "In Queue", statusMessage: "Waiting for jam", avatar: null },
  { id: "4", username: "TDTN Kira", status: "In Game", statusMessage: "Playing", avatar: null },
  { id: "5", username: "zebuto", status: "In Game", statusMessage: "Jamming", avatar: null },
  { id: "6", username: "DesertStark", status: "Away", statusMessage: "Mobile", avatar: null },
  { id: "7", username: "LEBOVIM", status: "Away", statusMessage: "Mobile", avatar: null },
  { id: "8", username: "MadsNado", status: "Away", statusMessage: "Mobile", avatar: null },
  { id: "9", username: "ThatGuyDan", status: "Away", statusMessage: "Mobile", avatar: null },
  { id: "10", username: "OhmyDOG", status: "Away", statusMessage: "Away", avatar: null },
];

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
    communityId: "lofi",
  },
  {
    id: "2",
    name: "Rock Jam Session",
    description: "Let's rock out!",
    genre: "Rock",
    participants: 5,
    maxParticipants: 6,
    isPrivate: false,
    hostName: "XeFOs",
    communityId: "rock",
  },
  {
    id: "3",
    name: "Electronic Dreams",
    description: "EDM and electronic music",
    genre: "Electronic",
    participants: 2,
    maxParticipants: 10,
    isPrivate: false,
    hostName: "Akuma chun",
    communityId: "electronic",
  },
  {
    id: "4",
    name: "Jazz Lounge",
    description: "Smooth jazz and improvisation",
    genre: "Jazz",
    participants: 4,
    maxParticipants: 8,
    isPrivate: false,
    hostName: "zebuto",
    communityId: "jazz",
  },
  {
    id: "5",
    name: "Hip Hop Cypher",
    description: "Freestyle and beats",
    genre: "Hip Hop",
    participants: 6,
    maxParticipants: 12,
    isPrivate: false,
    hostName: "TDTN Kira",
    communityId: "hiphop",
  },
  {
    id: "6",
    name: "Acoustic Sessions",
    description: "Intimate acoustic performances",
    genre: "Acoustic",
    participants: 2,
    maxParticipants: 6,
    isPrivate: true,
    hostName: "AnataBakka",
  },
  {
    id: "7",
    name: "Metal Mayhem",
    description: "Heavy riffs and powerful drums",
    genre: "Metal",
    participants: 7,
    maxParticipants: 10,
    isPrivate: false,
    hostName: "DesertStark",
    communityId: "metal",
  },
  {
    id: "8",
    name: "Indie Vibes",
    description: "Alternative and indie rock",
    genre: "Indie",
    participants: 3,
    maxParticipants: 8,
    isPrivate: false,
    hostName: "LEBOVIM",
    communityId: "indie",
  },
  {
    id: "9",
    name: "Classical Harmony",
    description: "Orchestral and classical compositions",
    genre: "Classical",
    participants: 1,
    maxParticipants: 5,
    isPrivate: false,
    hostName: "MadsNado",
    communityId: "classical",
  },
  {
    id: "10",
    name: "R&B Soul",
    description: "Smooth R&B and soulful melodies",
    genre: "R&B",
    participants: 4,
    maxParticipants: 8,
    isPrivate: false,
    hostName: "ThatGuyDan",
    communityId: "rnb",
  },
  {
    id: "11",
    name: "Reggae Roots",
    description: "Island vibes and reggae beats",
    genre: "Reggae",
    participants: 5,
    maxParticipants: 10,
    isPrivate: false,
    hostName: "OhmyDOG",
    communityId: "reggae",
  },
  {
    id: "12",
    name: "Country Roads",
    description: "Country and folk music",
    genre: "Country",
    participants: 2,
    maxParticipants: 6,
    isPrivate: false,
    hostName: "XeFOs",
    communityId: "country",
  },
  {
    id: "13",
    name: "Techno Underground",
    description: "Deep techno and underground sounds",
    genre: "Techno",
    participants: 8,
    maxParticipants: 15,
    isPrivate: false,
    hostName: "Akuma chun",
    communityId: "techno",
  },
  {
    id: "14",
    name: "Blues Brothers",
    description: "Classic blues and soul",
    genre: "Blues",
    participants: 3,
    maxParticipants: 7,
    isPrivate: false,
    hostName: "Tylobic",
    communityId: "blues",
  },
  {
    id: "15",
    name: "Pop Hits",
    description: "Latest pop hits and covers",
    genre: "Pop",
    participants: 6,
    maxParticipants: 12,
    isPrivate: false,
    hostName: "zebuto",
    communityId: "pop",
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
    recentJam: mockRooms[1],
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
    recentJam: mockRooms[2],
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
    recentJam: mockRooms[3],
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
    recentJam: mockRooms[4],
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
    recentJam: mockRooms[6],
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
    recentJam: mockRooms[7],
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
    recentJam: mockRooms[8],
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
    recentJam: mockRooms[9],
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
    recentJam: mockRooms[10],
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
  return [...mockRooms];
};

export const fetchJam = async (id: string): Promise<Room | null> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockRooms.find(room => room.id === id) || null;
};

export const fetchOnlineUsers = async (): Promise<User[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockUsers.filter(user => 
    user.status === "Online" || user.status === "In Game" || user.status === "In Queue"
  );
};

