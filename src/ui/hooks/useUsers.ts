import { useQuery } from '@tanstack/react-query';
import { fetchOnlineUsers, type User } from '@/lib/api/mock';

export const useOnlineUsers = () => {
  return useQuery<User[]>({
    queryKey: ['users', 'online'],
    queryFn: fetchOnlineUsers,
  });
};

