import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchJams, 
  fetchJam, 
  getMyRoom,
  createRoom,
  updateRoom,
  activateRoom,
  deactivateRoom,
  updateRoomActivity,
  type Room 
} from '@/lib/api/mock';

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

export const useMyRoom = (userId: string | undefined) => {
  return useQuery<Room | null>({
    queryKey: ['myRoom', userId],
    queryFn: () => userId ? getMyRoom(userId) : Promise.resolve(null),
    enabled: !!userId,
  });
};

export const useCreateRoom = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      userId,
      hostName,
      hostAvatar,
      roomData,
    }: {
      userId: string;
      hostName: string;
      hostAvatar?: string;
      roomData: {
        name: string;
        description?: string;
        genre?: string;
        maxParticipants: number;
        isPrivate: boolean;
      };
    }) => createRoom(userId, hostName, hostAvatar, roomData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jams'] });
      queryClient.invalidateQueries({ queryKey: ['myRoom'] });
    },
  });
};

export const useUpdateRoom = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      roomId,
      userId,
      updates,
    }: {
      roomId: string;
      userId: string;
      updates: {
        name?: string;
        description?: string;
        genre?: string;
        maxParticipants?: number;
        isPrivate?: boolean;
      };
    }) => updateRoom(roomId, userId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['jams'] });
      queryClient.invalidateQueries({ queryKey: ['jam', variables.roomId] });
      queryClient.invalidateQueries({ queryKey: ['myRoom'] });
    },
  });
};

export const useActivateRoom = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roomId, userId }: { roomId: string; userId: string }) =>
      activateRoom(roomId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['jams'] });
      queryClient.invalidateQueries({ queryKey: ['jam', variables.roomId] });
      queryClient.invalidateQueries({ queryKey: ['myRoom'] });
    },
  });
};

export const useDeactivateRoom = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roomId, userId }: { roomId: string; userId: string }) =>
      deactivateRoom(roomId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['jams'] });
      queryClient.invalidateQueries({ queryKey: ['jam', variables.roomId] });
      queryClient.invalidateQueries({ queryKey: ['myRoom'] });
    },
  });
};

export const useUpdateRoomActivity = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (roomId: string) => updateRoomActivity(roomId),
    onSuccess: (_, roomId) => {
      queryClient.invalidateQueries({ queryKey: ['jam', roomId] });
      queryClient.invalidateQueries({ queryKey: ['myRoom'] });
      queryClient.invalidateQueries({ queryKey: ['jams'] });
    },
  });
};

