import { useQuery, usePaginatedQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuthStore } from "@/stores/authStore";
import { useConvexAuthStore } from "./useConvexAuth";
import { useProfileStore } from "./useEnsureProfile";

// Re-export from single source of truth
export { ROOM_GENRES } from "../../../convex/rooms";
export type { RoomGenre } from "../../../convex/rooms";

// ============================================
// Query Hooks
// ============================================

export function useRoom(handle: string | undefined) {
  const data = useQuery(
    api.rooms.getByHandle,
    handle ? { handle } : "skip"
  );
  return {
    data: data ?? null,
    isLoading: data === undefined && !!handle,
  };
}

export function useMyRoom() {
  const { isGuest } = useAuthStore();
  const { isAuthSet } = useConvexAuthStore();
  const { isProfileReady } = useProfileStore();
  const canQuery = !isGuest && isAuthSet && isProfileReady;

  const data = useQuery(api.rooms.getMyRoom, canQuery ? {} : "skip");
  return {
    data: data ?? null,
    isLoading: data === undefined && canQuery,
  };
}

export function useActiveRooms(genre?: string, search?: string) {
  const result = usePaginatedQuery(
    api.rooms.listActivePaginated,
    { genre, search },
    { initialNumItems: 20 }
  );

  return {
    data: result.results,
    isLoading: result.status === "LoadingFirstPage",
    hasNextPage: result.status === "CanLoadMore",
    isFetchingNextPage: result.status === "LoadingMore",
    fetchNextPage: () => result.loadMore(20),
  };
}

export function useRoomParticipants(roomId: string | undefined) {
  const data = useQuery(
    api.rooms.getParticipants,
    roomId ? { roomId: roomId as Id<"rooms"> } : "skip"
  );
  return {
    data: data?.participants ?? [],
    totalCount: data?.total_count ?? 0,
    isLoading: data === undefined && !!roomId,
  };
}

export function useFriendsInRooms() {
  const { isGuest } = useAuthStore();
  const { isAuthSet } = useConvexAuthStore();
  const { isProfileReady } = useProfileStore();
  const canQuery = !isGuest && isAuthSet && isProfileReady;

  const data = useQuery(api.rooms.getFriendsInRooms, canQuery ? {} : "skip");
  return {
    data: data ?? [],
    isLoading: data === undefined && canQuery,
  };
}

// ============================================
// Room Chat Hooks
// ============================================

export function useRoomMessages(roomId: string | undefined) {
  const data = useQuery(
    api.roomMessages.getLatest,
    roomId ? { roomId: roomId as Id<"rooms"> } : "skip"
  );
  return {
    data: data ?? [],
    isLoading: data === undefined && !!roomId,
  };
}

export function useSendRoomMessage() {
  return useMutation(api.roomMessages.send);
}

// ============================================
// Mutation Hooks
// ============================================

export function useCreateRoom() {
  return useMutation(api.rooms.create);
}

export function useUpdateRoom() {
  return useMutation(api.rooms.update);
}

export function useActivateRoom() {
  return useMutation(api.rooms.activate);
}

export function useDeactivateRoom() {
  return useMutation(api.rooms.deactivate);
}

export function useRoomHeartbeat() {
  return useMutation(api.presence.roomHeartbeat);
}

export function useGuestRoomHeartbeat() {
  return useMutation(api.presence.guestRoomHeartbeat);
}

export function useDisconnectPresence() {
  return useMutation(api.presence.disconnect);
}

export function useDeleteRoom() {
  return useMutation(api.rooms.deleteRoom);
}

export function useSetStreamUrl() {
  return useMutation(api.rooms.setStreamUrl);
}

export function useUpdateRoomStatus() {
  return useMutation(api.rooms.updateRoomStatus);
}
