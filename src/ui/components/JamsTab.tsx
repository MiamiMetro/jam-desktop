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
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";

interface JamsTabProps {
  onGuestAction?: () => void;
}

function JamsTab({ onGuestAction }: JamsTabProps) {
  const { isGuest, user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const { data: rooms = [], isLoading: roomsLoading } = useJams();
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
    <div className="p-6">
      {/* Hero Header */}
      <div className="mb-6 -mx-6 -mt-6 px-6 pt-6 pb-5 bg-gradient-to-br from-primary/12 via-primary/5 to-transparent relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_80%_-20%,oklch(0.78_0.16_70/8%),transparent)] pointer-events-none" />
        <div className="relative animate-page-in">
          <h2 className="text-2xl font-heading font-bold mb-1">Jams</h2>
          <p className="text-sm text-muted-foreground">Live rooms where the music happens</p>
        </div>
      </div>

      {/* My Room Section */}
      {!isGuest && user && (
        <div className="mb-6">
          {myRoomLoading ? (
            <div className="p-4 rounded-lg glass">
              <p className="text-sm text-muted-foreground">Loading your room...</p>
            </div>
          ) : myRoom ? (
            <div className={`p-5 rounded-xl glass-strong relative overflow-hidden ${
              myRoom.isEnabled
                ? "ring-1 ring-primary/30"
                : "ring-1 ring-border"
            }`}>
              {/* Active room radial glow */}
              {myRoom.isEnabled && (
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.78_0.16_70/8%),transparent_60%)] pointer-events-none" />
              )}
              <div className="flex items-start justify-between gap-4 relative">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-base font-heading font-semibold">My Room</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      myRoom.isEnabled
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
            <div className="p-6 rounded-xl glass border border-dashed border-border/50">
              <div className="text-center">
                <Music className="h-10 w-10 mx-auto mb-3 text-primary/40 animate-float" />
                <p className="text-sm font-medium mb-1">You don't have a room yet</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Create your room to start jamming with others
                </p>
                <Button variant="default" size="sm" onClick={() => setIsCreateRoomOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create My Room
                </Button>
              </div>
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

      {/* Search */}
      <SearchInput
        placeholder="Search jams..."
        value={searchQuery}
        onSearch={handleSearchChange}
      />

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
            <div
              key={room.id}
              onClick={() => handleRoomClick(room.id)}
              className="p-4 rounded-xl glass hover:glass-strong cursor-pointer transition-all duration-200 group hover:ring-1 hover:ring-primary/20 hover:-translate-y-0.5 relative overflow-hidden"
            >
              {/* Active pulse indicator */}
              {room.isEnabled && (
                <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              )}
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <h3 className="text-sm font-semibold truncate">
                      {room.name}
                    </h3>
                    {room.isPrivate && (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  {room.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {room.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                    {room.genre && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                        {room.genre}
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>
                        {room.participants}/{room.maxParticipants}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Host: {room.hostName}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default JamsTab;
