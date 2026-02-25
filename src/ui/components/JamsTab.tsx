// JamsTab.tsx — Hero landing page for live jam rooms
import { useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/SearchInput";
import { RoomFormDialog, type RoomFormData } from "@/components/RoomFormDialog";
import {
  Music,
  Users,
  Hash,
  Plus,
  Settings,
  Power,
  PowerOff,
  Lock,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useJams, useMyRoom, useCreateRoom, useUpdateRoom, useActivateRoom, useDeactivateRoom } from "@/hooks/useJams";
import { Avatar, AvatarFallback, AvatarImage, AvatarBadge } from "@/components/ui/avatar";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { RoomCard } from "@/components/RoomCard";
import { useFriends } from "@/hooks/useFriends";
import { useOnlineUsers, type PresenceStatus } from "@/hooks/useUsers";

interface JamsTabProps {
  onGuestAction?: () => void;
}

function getPresenceRingClass(status: PresenceStatus) {
  if (status === "busy") return "ring-red-500/30";
  if (status === "away") return "ring-amber-500/30";
  return "ring-green-500/30";
}

function getPresenceBadgeClass(status: PresenceStatus) {
  if (status === "busy") return "bg-red-500";
  if (status === "away") return "bg-amber-500";
  return "bg-green-500";
}

function JamsTab({ onGuestAction }: JamsTabProps) {
  const { isGuest, user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const { data: rooms = [], isLoading: roomsLoading } = useJams();
  const { data: friends = [] } = useFriends();
  const { data: onlineUsers = [] } = useOnlineUsers();
  const { data: myRoom, isLoading: myRoomLoading } = useMyRoom(user?.id);
  const createRoomMutation = useCreateRoom();
  const updateRoomMutation = useUpdateRoom();
  const activateRoomMutation = useActivateRoom();
  const deactivateRoomMutation = useDeactivateRoom();

  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isEditRoomOpen, setIsEditRoomOpen] = useState(false);

  const handleSearchChange = useCallback((query: string) => {
    const params: Record<string, string> = {};
    if (query) params.search = query;
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  const handleCreateRoom = (data: RoomFormData) => {
    if (isGuest || !user) {
      onGuestAction?.();
      return;
    }
    if (!data.name.trim()) return;

    createRoomMutation.mutate({
      userId: user.id,
      hostName: user.username,
      hostAvatar: user.avatar_url,
      roomData: {
        name: data.name.trim(),
        description: data.description.trim() || undefined,
        genre: data.genre.trim() || undefined,
        maxParticipants: data.maxParticipants,
        isPrivate: data.isPrivate,
      },
    }, {
      onSuccess: () => {
        setIsCreateRoomOpen(false);
      },
    });
  };

  const handleUpdateRoom = (data: RoomFormData) => {
    if (isGuest || !user || !myRoom) return;
    if (!data.name.trim()) return;

    updateRoomMutation.mutate({
      roomId: myRoom.id,
      userId: user.id,
      updates: {
        name: data.name.trim(),
        description: data.description.trim() || undefined,
        genre: data.genre.trim() || undefined,
        maxParticipants: data.maxParticipants,
        isPrivate: data.isPrivate,
      },
    }, {
      onSuccess: () => {
        setIsEditRoomOpen(false);
      },
    });
  };

  const handleToggleRoomStatus = () => {
    if (isGuest || !user || !myRoom) return;

    if (myRoom.isEnabled) {
      deactivateRoomMutation.mutate({
        roomId: myRoom.id,
        userId: user.id,
      });
    } else {
      activateRoomMutation.mutate({
        roomId: myRoom.id,
        userId: user.id,
      });
    }
  };

  const editInitialData: RoomFormData | undefined = myRoom
    ? {
      name: myRoom.name,
      description: myRoom.description || "",
      genre: myRoom.genre || "",
      maxParticipants: myRoom.maxParticipants,
      isPrivate: myRoom.isPrivate,
    }
    : undefined;

  // Filter rooms based on search query
  const filteredRooms = rooms.filter((room) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      room.name.toLowerCase().includes(query) ||
      room.description?.toLowerCase().includes(query) ||
      room.genre?.toLowerCase().includes(query) ||
      room.hostName.toLowerCase().includes(query)
    );
  });

  const handleRoomClick = (roomId: string) => {
    navigate(`/jam/${roomId}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Compact Header */}
      <div className="px-5 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
        <Music className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-heading font-semibold text-muted-foreground">Jams</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-5">

      {/* My Room Section */}
      {!isGuest && user && (
        <div className="mb-6">
          {myRoomLoading ? (
            <div className="p-4 rounded-lg glass-solid">
              <p className="text-sm text-muted-foreground">Loading your room...</p>
            </div>
          ) : myRoom ? (
            <div className={`p-5 rounded-xl glass-strong relative overflow-hidden ${myRoom.isEnabled
              ? "ring-1 ring-primary/30"
              : "ring-1 ring-border"
              }`}>
              {/* Active room radial glow */}
              {myRoom.isEnabled && (
                <div className="absolute inset-0 bg-gradient-primary-tr pointer-events-none" />
              )}
              <div className="flex items-start justify-between gap-4 relative">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-base font-heading font-semibold">My Room</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${myRoom.isEnabled
                      ? "bg-green-500/20 text-green-400"
                      : "bg-muted-foreground/20 text-muted-foreground"
                      }`}>
                      {myRoom.isEnabled ? "Active" : "Disabled"}
                    </span>
                    {myRoom.isPrivate && (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <div className="mb-3">
                    <h4 className="text-sm font-medium mb-1">{myRoom.name}</h4>
                    {myRoom.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {myRoom.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    {myRoom.genre && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                        {myRoom.genre}
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>
                        {myRoom.participants}/{myRoom.maxParticipants}
                      </span>
                    </div>
                  </div>
                  {!myRoom.isEnabled && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Your room is disabled and hidden from others. Activate it to make it visible.
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => myRoom.isEnabled && navigate(`/jam/${myRoom.id}`)}
                      disabled={!myRoom.isEnabled}
                      className={myRoom.isEnabled ? "glow-primary" : ""}
                    >
                      {myRoom.isEnabled ? "Enter Room" : "Room Disabled"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditRoomOpen(true)}
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Settings
                    </Button>
                    <Button
                      variant={myRoom.isEnabled ? "outline" : "default"}
                      size="sm"
                      onClick={handleToggleRoomStatus}
                      disabled={activateRoomMutation.isPending || deactivateRoomMutation.isPending}
                    >
                      {myRoom.isEnabled ? (
                        <>
                          <PowerOff className="h-3 w-3 mr-1" />
                          Disable
                        </>
                      ) : (
                        <>
                          <Power className="h-3 w-3 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 p-4 rounded-xl glass-solid border border-dashed border-border/50">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Music className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Create your room to start jamming</p>
                <p className="text-xs text-muted-foreground">Set up a room and invite friends</p>
              </div>
              <Button variant="default" size="sm" onClick={() => setIsCreateRoomOpen(true)} className="flex-shrink-0">
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Room Form Dialogs */}
      <RoomFormDialog
        open={isCreateRoomOpen}
        onOpenChange={setIsCreateRoomOpen}
        onSubmit={handleCreateRoom}
        isPending={createRoomMutation.isPending}
        mode="create"
      />
      <RoomFormDialog
        open={isEditRoomOpen}
        onOpenChange={setIsEditRoomOpen}
        onSubmit={handleUpdateRoom}
        isPending={updateRoomMutation.isPending}
        mode="edit"
        initialData={editInitialData}
      />

      {/* Friends Jamming Now */}
      {!isGuest && (() => {
        const onlineStatusById = new Map(
          onlineUsers.map((onlineUser) => [String(onlineUser.id), onlineUser.status])
        );
        const onlineFriends = friends.filter(
          (friend) => friend && onlineStatusById.has(String(friend.id))
        );
        const activeRooms = rooms.filter(r => r.isEnabled);
        if (onlineFriends.length === 0 || activeRooms.length === 0) return null;
        return (
          <div className="mb-6">
            <h3 className="text-sm font-heading font-semibold text-muted-foreground mb-3">
              Friends Jamming Now
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {onlineFriends.slice(0, 6).map((friend, index) => {
                if (!friend) return null;
                const friendStatus = onlineStatusById.get(String(friend.id)) ?? "online";
                // Assign friend to a room (round-robin for mock display)
                const friendRoom = activeRooms[index % activeRooms.length];
                return (
                  <button
                    key={friend.id}
                    onClick={() => navigate(`/jam/${friendRoom.id}`)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl glass-solid hover:glass-strong transition-all duration-200 cursor-pointer min-w-[80px] hover:ring-1 hover:ring-primary/20"
                  >
                    <Avatar size="default" className={`ring-2 ${getPresenceRingClass(friendStatus)}`}>
                      <AvatarImage src={friend.avatar_url || ""} alt={friend.username} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {friend.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                      <AvatarBadge className={getPresenceBadgeClass(friendStatus)} />
                    </Avatar>
                    <span className="text-xs font-medium truncate w-full text-center">
                      {friend.username}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 truncate w-full text-center">
                      in {friendRoom.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Search */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm pb-3 -mx-5 px-5">
        <SearchInput
          placeholder="Search jams..."
          value={searchQuery}
          onSearch={handleSearchChange}
        />
      </div>

      {/* Other Jams Grid */}
      <div className="mb-3">
        <h3 className="text-sm font-heading font-semibold text-muted-foreground mb-3">
          Live Rooms
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-stagger">
        {roomsLoading ? (
          <div className="col-span-full">
            <LoadingState message="Loading jams..." />
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Music}
              title={searchQuery ? "No jams found" : "No active jams"}
              description={searchQuery
                ? "Try adjusting your search"
                : "Create your room to start jamming!"}
            />
          </div>
        ) : (
          filteredRooms.map((room) => (
            <RoomCard key={room.id} room={room} onClick={handleRoomClick} />
          ))
        )}
      </div>
      </div>
    </div>
  );
}

export default JamsTab;
