import { useQuery } from '@tanstack/react-query';
import { fetchCommunities, fetchCommunity, fetchJoinedCommunities, type Community } from '@/lib/api/mock';

export const useCommunities = (filters?: { category?: string; search?: string }) => {
  return useQuery<Community[]>({
    queryKey: ['communities', filters],
    queryFn: () => fetchCommunities(filters),
  });
};

export const useCommunity = (id: string) => {
  return useQuery<Community | null>({
    queryKey: ['community', id],
    queryFn: () => fetchCommunity(id),
  });
};

export const useJoinedCommunities = () => {
  return useQuery<Community[]>({
    queryKey: ['communities', 'joined'],
    queryFn: fetchJoinedCommunities,
  });
};

