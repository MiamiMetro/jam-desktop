import { useQuery } from '@tanstack/react-query';
import { fetchJams, fetchJam, type Room } from '@/lib/api/mock';

export const useJams = () => {
  return useQuery<Room[]>({
    queryKey: ['jams'],
    queryFn: fetchJams,
  });
};

export const useJam = (id: string) => {
  return useQuery<Room | null>({
    queryKey: ['jam', id],
    queryFn: () => fetchJam(id),
  });
};

