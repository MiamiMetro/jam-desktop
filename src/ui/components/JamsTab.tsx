import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Music,
  Users,
  Hash,
  Plus,
  Search,
  Settings,
  Power,
  PowerOff,
  Lock,
  Unlock,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useJams, useMyRoom, useCreateRoom, useUpdateRoom, useActivateRoom, useDeactivateRoom } from "@/hooks/useJams";

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
  const [jamSearchInput, setJamSearchInput] = useState(searchQuery);
  const [roomForm, setRoomForm] = useState({
    name: "",
    description: "",
    genre: "",
    maxParticipants: 8,
    isPrivate: false,
  });

  const handleCreateRoom = () => {
    if (isGuest || !user) {
      onGuestAction?.();
      return;
    }
    if (!roomForm.name.trim()) return;
    
    createRoomMutation.mutate({
      userId: user.id,
      hostName: user.username,
      hostAvatar: user.avatar,
      roomData: {
        name: roomForm.name.trim(),
        description: roomForm.description.trim() || undefined,
        genre: roomForm.genre.trim() || undefined,
        maxParticipants: roomForm.maxParticipants,
        isPrivate: roomForm.isPrivate,
      },
    }, {
      onSuccess: () => {
        setIsCreateRoomOpen(false);
        setRoomForm({
          name: "",
          description: "",
          genre: "",
          maxParticipants: 8,
          isPrivate: false,
        });
      },
    });
  };

  const handleUpdateRoom = () => {
    if (isGuest || !user || !myRoom) return;
    if (!roomForm.name.trim()) return;
    
    updateRoomMutation.mutate({
      roomId: myRoom.id,
      userId: user.id,
      updates: {
        name: roomForm.name.trim(),
        description: roomForm.description.trim() || undefined,
        genre: roomForm.genre.trim() || undefined,
        maxParticipants: roomForm.maxParticipants,
        isPrivate: roomForm.isPrivate,
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

  const openEditDialog = () => {
    if (!myRoom) return;
    setRoomForm({
      name: myRoom.name,
      description: myRoom.description || "",
      genre: myRoom.genre || "",
      maxParticipants: myRoom.maxParticipants,
      isPrivate: myRoom.isPrivate,
    });
    setIsEditRoomOpen(true);
  };

  const handleJamSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params: Record<string, string> = {};
    if (jamSearchInput) params.search = jamSearchInput;
    setSearchParams(params);
  };

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
    // Guests can enter rooms too (listening mode)
    navigate(`/jam/${roomId}`);
  };

  return (
    <div className="p-4">
      {/* Jams Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Jams</h2>
        </div>
      </div>

      {/* My Room Section */}
      {!isGuest && user && (
        <div className="mb-6">
          {myRoomLoading ? (
            <div className="p-4 rounded-lg border border-border bg-muted/30">
              <p className="text-sm text-muted-foreground">Loading your room...</p>
            </div>
          ) : myRoom ? (
            <div className={`p-4 rounded-lg border-2 ${
              myRoom.isEnabled 
                ? "border-primary/50 bg-primary/5" 
                : "border-muted bg-muted/30"
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-base font-semibold">My Room</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      myRoom.isEnabled
                        ? "bg-green-500/20 text-green-600 dark:text-green-400"
                        : "bg-muted-foreground/20 text-muted-foreground"
                    }`}>
                      {myRoom.isEnabled ? "Active" : "Disabled"}
                    </span>
                    {myRoom.isPrivate && (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                    {!myRoom.isPrivate && (
                      <Unlock className="h-3 w-3 text-muted-foreground" />
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
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    {myRoom.genre && (
                      <div className="flex items-center gap-1">
                        <Music className="h-3 w-3" />
                        <span>{myRoom.genre}</span>
                      </div>
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
                    >
                      {myRoom.isEnabled ? "Enter Room" : "Room Disabled"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openEditDialog}
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
            <div className="p-4 rounded-lg border border-dashed border-border bg-muted/30">
              <div className="text-center">
                <Music className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-sm font-medium mb-1">You don't have a room yet</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Create your room to start jamming with others
                </p>
                <AlertDialog open={isCreateRoomOpen} onOpenChange={setIsCreateRoomOpen}>
                  <AlertDialogTrigger render={
                    <Button variant="default" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Create My Room
                    </Button>
                  } />
                  <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Create Your Room</AlertDialogTitle>
                      <AlertDialogDescription>
                        Create your personal jam room. You can only have one room, but you can manage its settings anytime.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="room-name">Room Name</Label>
                        <Input
                          id="room-name"
                          placeholder="e.g., Chill Vibes"
                          value={roomForm.name}
                          onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="room-description">Description (Optional)</Label>
                        <Textarea
                          id="room-description"
                          placeholder="What's this room about?"
                          value={roomForm.description}
                          onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="room-genre">Genre (Optional)</Label>
                        <Input
                          id="room-genre"
                          placeholder="e.g., Lo-Fi, Rock, Electronic"
                          value={roomForm.genre}
                          onChange={(e) => setRoomForm({ ...roomForm, genre: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="room-max">Max Participants</Label>
                        <Input
                          id="room-max"
                          type="number"
                          min="2"
                          max="20"
                          value={roomForm.maxParticipants}
                          onChange={(e) => setRoomForm({ ...roomForm, maxParticipants: parseInt(e.target.value) || 8 })}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="room-private"
                          checked={roomForm.isPrivate}
                          onChange={(e) => setRoomForm({ ...roomForm, isPrivate: e.target.checked })}
                          className="rounded border-input"
                        />
                        <Label htmlFor="room-private" className="cursor-pointer">
                          Private Room (only people you invite can join)
                        </Label>
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleCreateRoom} 
                        disabled={!roomForm.name.trim() || createRoomMutation.isPending}
                      >
                        {createRoomMutation.isPending ? "Creating..." : "Create Room"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Room Dialog */}
      {myRoom && (
        <AlertDialog open={isEditRoomOpen} onOpenChange={setIsEditRoomOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Edit Room Settings</AlertDialogTitle>
              <AlertDialogDescription>
                Update your room settings. Changes will apply immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-room-name">Room Name</Label>
                <Input
                  id="edit-room-name"
                  placeholder="e.g., Chill Vibes"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-room-description">Description (Optional)</Label>
                <Textarea
                  id="edit-room-description"
                  placeholder="What's this room about?"
                  value={roomForm.description}
                  onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-room-genre">Genre (Optional)</Label>
                <Input
                  id="edit-room-genre"
                  placeholder="e.g., Lo-Fi, Rock, Electronic"
                  value={roomForm.genre}
                  onChange={(e) => setRoomForm({ ...roomForm, genre: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-room-max">Max Participants</Label>
                <Input
                  id="edit-room-max"
                  type="number"
                  min="2"
                  max="20"
                  value={roomForm.maxParticipants}
                  onChange={(e) => setRoomForm({ ...roomForm, maxParticipants: parseInt(e.target.value) || 8 })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-room-private"
                  checked={roomForm.isPrivate}
                  onChange={(e) => setRoomForm({ ...roomForm, isPrivate: e.target.checked })}
                  className="rounded border-input"
                />
                <Label htmlFor="edit-room-private" className="cursor-pointer">
                  Private Room (only people you invite can join)
                </Label>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleUpdateRoom} 
                disabled={!roomForm.name.trim() || updateRoomMutation.isPending}
              >
                {updateRoomMutation.isPending ? "Saving..." : "Save Changes"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Search */}
      <form onSubmit={handleJamSearch} className="mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search jams..."
              value={jamSearchInput}
              onChange={(e) => setJamSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit">Search</Button>
        </div>
      </form>

      {/* Other Jams Grid */}
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          Other Jams
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roomsLoading ? (
          <div className="col-span-full p-8 text-center text-muted-foreground">
            <p className="text-sm">Loading jams...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground">
            <Music className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {searchQuery ? "No jams found" : "No active jams"}
            </p>
            <p className="text-xs mt-1">
              {searchQuery 
                ? "Try adjusting your search"
                : "Create your room to start jamming!"}
            </p>
          </div>
        ) : (
          filteredRooms.map((room) => (
            <div
              key={room.id}
              onClick={() => handleRoomClick(room.id)}
              className="p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors group"
            >
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
                    {!room.isPrivate && (
                      <Unlock className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  {room.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {room.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                    {room.genre && (
                      <div className="flex items-center gap-1">
                        <Music className="h-3 w-3" />
                        <span>{room.genre}</span>
                      </div>
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
