import { useState, useEffect } from 'react';

// Community type - keeping local since Convex backend doesn't have communities yet
export type Community = {
  id: string;
  name: string;
  description: string;
  category: string[];
  activeCount: number;
  totalMembers: number;
  isLive: boolean;
  recentPosts: any[];
  recentJam?: any;
};

// Mock communities data
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
  },
];

export const useCommunities = (filters?: { category?: string; search?: string }) => {
  const [data, setData] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate async fetch
    const timer = setTimeout(() => {
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
      
      setData(filtered);
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [filters?.category, filters?.search]);

  return { data, isLoading, error: null };
};

export const useCommunity = (id: string) => {
  const [data, setData] = useState<Community | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      const community = mockCommunities.find(comm => comm.id === id) || null;
      setData(community);
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [id]);

  return { data, isLoading, error: null };
};

export const useJoinedCommunities = () => {
  const [data, setData] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Mock: return first 3 communities as "joined"
      setData(mockCommunities.slice(0, 3));
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return { data, isLoading, error: null };
};
