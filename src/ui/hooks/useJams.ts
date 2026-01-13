import { useState, useEffect, useCallback } from 'react';

// Room type - keeping local since Convex backend doesn't have jams yet
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
  hostId: string;
  communityId?: string;
  isEnabled: boolean;
  lastActiveAt: Date;
  createdAt: Date;
  streamUrl?: string;
};

// In-memory storage for user rooms
const userRooms = new Map<string, Room>();

// Mock rooms
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
    hostId: "99",
    communityId: "lofi",
    isEnabled: true,
    streamUrl: "http://193.187.132.179:8080/hls/stream.m3u8",
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 30),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
];

export const useJams = () => {
  const [data, setData] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      const allRooms = [...mockRooms, ...Array.from(userRooms.values())];
      setData(allRooms.filter(room => room.isEnabled));
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return { data, isLoading, error: null };
};

export const useJam = (id: string) => {
  const [data, setData] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      const room = mockRooms.find(room => room.id === id) || userRooms.get(id) || null;
      setData(room);
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [id]);

  return { data, isLoading, error: null };
};

export const useMyRoom = (userId: string | undefined) => {
  const [data, setData] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      const room = Array.from(userRooms.values()).find(r => r.hostId === userId) || null;
      setData(room);
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [userId]);

  return { data, isLoading, error: null };
};

export const useCreateRoom = () => {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async ({
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
  }) => {
    setIsPending(true);
    try {
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
        participants: 1,
        maxParticipants: roomData.maxParticipants,
        isPrivate: roomData.isPrivate,
        hostName,
        hostAvatar,
        hostId: userId,
        isEnabled: true,
        lastActiveAt: new Date(),
        createdAt: new Date(),
        streamUrl: `https://example.com/hls/${userId}/stream.m3u8`,
      };

      userRooms.set(newRoom.id, newRoom);
      return newRoom;
    } finally {
      setIsPending(false);
    }
  }, []);

  const mutate = useCallback((
    variables: Parameters<typeof mutateAsync>[0],
    options?: { onSuccess?: (data: Room) => void; onError?: (error: Error) => void }
  ) => {
    mutateAsync(variables)
      .then((data) => options?.onSuccess?.(data))
      .catch((error) => options?.onError?.(error));
  }, [mutateAsync]);

  return { mutate, mutateAsync, isPending };
};

export const useUpdateRoom = () => {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async ({
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
  }) => {
    setIsPending(true);
    try {
      const room = userRooms.get(roomId) || mockRooms.find(r => r.id === roomId);
      if (!room) throw new Error("Room not found");
      if (room.hostId !== userId) throw new Error("Only room host can update room settings");

      if (updates.name !== undefined) room.name = updates.name;
      if (updates.description !== undefined) room.description = updates.description;
      if (updates.genre !== undefined) room.genre = updates.genre;
      if (updates.maxParticipants !== undefined) room.maxParticipants = updates.maxParticipants;
      if (updates.isPrivate !== undefined) room.isPrivate = updates.isPrivate;

      if (userRooms.has(roomId)) {
        userRooms.set(roomId, room);
      }

      return room;
    } finally {
      setIsPending(false);
    }
  }, []);

  const mutate = useCallback((
    variables: Parameters<typeof mutateAsync>[0],
    options?: { onSuccess?: (data: Room) => void; onError?: (error: Error) => void }
  ) => {
    mutateAsync(variables)
      .then((data) => options?.onSuccess?.(data))
      .catch((error) => options?.onError?.(error));
  }, [mutateAsync]);

  return { mutate, mutateAsync, isPending };
};

export const useActivateRoom = () => {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async ({ roomId, userId }: { roomId: string; userId: string }) => {
    setIsPending(true);
    try {
      const room = userRooms.get(roomId) || mockRooms.find(r => r.id === roomId);
      if (!room) throw new Error("Room not found");
      if (room.hostId !== userId) throw new Error("Only room host can activate room");

      room.isEnabled = true;
      room.lastActiveAt = new Date();

      if (userRooms.has(roomId)) {
        userRooms.set(roomId, room);
      }

      return room;
    } finally {
      setIsPending(false);
    }
  }, []);

  const mutate = useCallback((
    variables: Parameters<typeof mutateAsync>[0],
    options?: { onSuccess?: (data: Room) => void; onError?: (error: Error) => void }
  ) => {
    mutateAsync(variables)
      .then((data) => options?.onSuccess?.(data))
      .catch((error) => options?.onError?.(error));
  }, [mutateAsync]);

  return { mutate, mutateAsync, isPending };
};

export const useDeactivateRoom = () => {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async ({ roomId, userId }: { roomId: string; userId: string }) => {
    setIsPending(true);
    try {
      const room = userRooms.get(roomId) || mockRooms.find(r => r.id === roomId);
      if (!room) throw new Error("Room not found");
      if (room.hostId !== userId) throw new Error("Only room host can deactivate room");

      room.isEnabled = false;

      if (userRooms.has(roomId)) {
        userRooms.set(roomId, room);
      }

      return room;
    } finally {
      setIsPending(false);
    }
  }, []);

  const mutate = useCallback((
    variables: Parameters<typeof mutateAsync>[0],
    options?: { onSuccess?: (data: Room) => void; onError?: (error: Error) => void }
  ) => {
    mutateAsync(variables)
      .then((data) => options?.onSuccess?.(data))
      .catch((error) => options?.onError?.(error));
  }, [mutateAsync]);

  return { mutate, mutateAsync, isPending };
};

export const useUpdateRoomActivity = () => {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async (roomId: string) => {
    setIsPending(true);
    try {
      const room = userRooms.get(roomId) || mockRooms.find(r => r.id === roomId);
      if (room) {
        room.lastActiveAt = new Date();
        if (!room.isEnabled) room.isEnabled = true;
        if (userRooms.has(roomId)) {
          userRooms.set(roomId, room);
        }
      }
    } finally {
      setIsPending(false);
    }
  }, []);

  const mutate = useCallback((
    roomId: string,
    options?: { onSuccess?: () => void; onError?: (error: Error) => void }
  ) => {
    mutateAsync(roomId)
      .then(() => options?.onSuccess?.())
      .catch((error) => options?.onError?.(error));
  }, [mutateAsync]);

  return { mutate, mutateAsync, isPending };
};
