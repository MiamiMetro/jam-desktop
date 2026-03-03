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
  LayoutGrid,
  List,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useActiveRooms, useMyRoom, useCreateRoom, useUpdateRoom, useActivateRoom, useDeactivateRoom, useFriendsInRooms } from "@/hooks/useRooms";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { RoomCard } from "@/components/RoomCard";

interface JamsTabProps {
  onGuestAction?: () => void;
}

function JamsTab({ onGuestAction }: JamsTabProps) {
  const { isGuest, user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const { data: rooms = [], isLoading: roomsLoading } = useActiveRooms(undefined, searchQuery || undefined);
  const { data: myRoom, isLoading: myRoomLoading } = useMyRoom();
  const { data: friendsInRooms = [] } = useFriendsInRooms();
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const activateRoom = useActivateRoom();
  const deactivateRoom = useDeactivateRoom();

  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isEditRoomOpen, setIsEditRoomOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isToggling, setIsToggling] = useState(false);

  const handleSearchChange = useCallback((query: string) => {
    const params: Record<string, string> = {};
    if (query) params.search = query;
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  const handleCreateRoom = async (data: RoomFormData) => {
    if (isGuest || !user) {
      onGuestAction?.();
      return;
    }
    if (!data.name.trim()) return;

    try {
      await createRoom({
        handle: data.handle.trim(),
        name: data.name.trim(),
        description: data.description.trim() || undefined,
        genre: data.genre.trim() || undefined,
        maxPerformers: data.maxPerformers,
        isPrivate: data.isPrivate,
      });
      setIsCreateRoomOpen(false);
    } catch (error) {
      console.error("Failed to create room:", error);
    }
  };

  const handleUpdateRoom = async (data: RoomFormData) => {
    if (isGuest || !user || !myRoom) return;
    if (!data.name.trim()) return;

    try {
      await updateRoom({
        roomId: myRoom.id as any,
        name: data.name.trim(),
        description: data.description.trim() || undefined,
        genre: data.genre.trim() || undefined,
        maxPerformers: data.maxPerformers,
        isPrivate: data.isPrivate,
      });
      setIsEditRoomOpen(false);
    } catch (error) {
      console.error("Failed to update room:", error);
    }
  };

  const handleToggleRoomStatus = async () => {
    if (isGuest || !user || !myRoom) return;
    setIsToggling(true);
    try {
      if (myRoom.is_active) {
        await deactivateRoom({ roomId: myRoom.id as any });
      } else {
        await activateRoom({ roomId: myRoom.id as any });
      }
    } catch (error) {
      console.error("Failed to toggle room:", error);
    } finally {
      setIsToggling(false);
    }
  };

  const editInitialData: RoomFormData | undefined = myRoom
    ? {
      handle: myRoom.handle,
      name: myRoom.name,
      description: myRoom.description || "",
      genre: myRoom.genre || "",
      maxPerformers: myRoom.max_performers,
      isPrivate: myRoom.is_private,
    }
    : undefined;

  const handleRoomClick = (handle: string) => {
    navigate(`/jam/${handle}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Compact Header */}
      <div className="page-header px-5 py-3 border-b border-border flex items-center gap-2 shrink-0">
        <Music className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-muted-foreground">Jams</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-3 pt-4">

      {/* My Room Section */}
      {!isGuest && user && myRoom && (
        <div className="mb-4">
          {myRoom ? (
            <div className={`p-4 rounded-lg glass-strong relative overflow-hidden ${myRoom.is_active
              ? "ring-1 ring-primary/30"
              : "ring-1 ring-border"
              }`}>
              {/* Active room radial glow */}
              {myRoom.is_active && (
                <div className="absolute inset-0 bg-gradient-primary-tr pointer-events-none" />
              )}
              <div className="flex items-start justify-between gap-4 relative">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-base font-semibold">My Room</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${myRoom.is_active
                      ? "bg-green-500/20 text-green-400"
                      : "bg-muted-foreground/20 text-muted-foreground"
                      }`}>
                      {myRoom.is_active ? "Active" : "Disabled"}
                    </span>
                    {myRoom.is_private && (
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
                        {myRoom.participant_count}
                      </span>
                    </div>
                  </div>
                  {!myRoom.is_active && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Your room is disabled and hidden from others. Activate it to make it visible.
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => myRoom.is_active && navigate(`/jam/${myRoom.handle}`)}
                      disabled={!myRoom.is_active}
                      className={myRoom.is_active ? "glow-primary" : ""}
                    >
                      {myRoom.is_active ? "Enter Room" : "Room Disabled"}
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
                      variant={myRoom.is_active ? "outline" : "default"}
                      size="sm"
                      onClick={handleToggleRoomStatus}
                      disabled={isToggling}
                    >
                      {myRoom.is_active ? (
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
          ) : null}
        </div>
      )}

      {/* Room Form Dialogs */}
      <RoomFormDialog
        open={isCreateRoomOpen}
        onOpenChange={setIsCreateRoomOpen}
        onSubmit={handleCreateRoom}
        mode="create"
      />
      <RoomFormDialog
        open={isEditRoomOpen}
        onOpenChange={setIsEditRoomOpen}
        onSubmit={handleUpdateRoom}
        mode="edit"
        initialData={editInitialData}
      />

      {/* Friends Jamming Now */}
      {!isGuest && friendsInRooms.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Friends Jamming Now
          </h3>
          <div className="flex flex-wrap gap-2">
            {friendsInRooms.slice(0, 6).map((item) => (
              <button
                key={item.friend.id}
                onClick={() => navigate(`/jam/${item.room_handle}`)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg glass-solid hover:glass-strong transition-all duration-200 cursor-pointer hover:ring-1 hover:ring-primary/20"
              >
                <Avatar size="xs" className="h-5 w-5 ring-1.5 ring-green-500/30">
                  <AvatarImage src={item.friend.avatar_url || ""} alt={item.friend.username} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-[8px]">
                    {item.friend.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium">{item.friend.username}</span>
                <span className="text-[10px] text-muted-foreground">in {item.room_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm pb-3 -mx-5 px-5">
        <div className="flex items-center gap-3">
          <SearchInput
            placeholder="Search jams..."
            value={searchQuery}
            onSearch={handleSearchChange}
            className="flex-1"
          />
          <div className="flex items-center gap-0.5 p-0.5 rounded-md glass-solid shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded transition-colors cursor-pointer ${viewMode === "grid" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded transition-colors cursor-pointer ${viewMode === "list" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
          {!isGuest && user && !myRoom && !myRoomLoading && (
            <Button variant="default" size="sm" className="shrink-0" onClick={() => setIsCreateRoomOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create Room
            </Button>
          )}
        </div>
      </div>

      {/* Other Jams Grid */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          Live Rooms
        </h3>
      </div>
      {roomsLoading ? (
        <LoadingState message="Loading jams..." />
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={Music}
          title={searchQuery ? "No jams found" : "No active jams"}
          description={searchQuery
            ? "Try adjusting your search"
            : "Create your room to start jamming!"}
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-stagger">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} onClick={handleRoomClick} />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} onClick={handleRoomClick} variant="list" />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

export default JamsTab;
