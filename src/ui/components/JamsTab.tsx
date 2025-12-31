import { useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  MoreVertical,
  Plus,
  Search,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useJams } from "@/hooks/useJams";

interface JamsTabProps {
  onGuestAction?: () => void;
}

function JamsTab({ onGuestAction }: JamsTabProps) {
  const { isGuest } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const { data: rooms = [], isLoading: roomsLoading } = useJams();
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [jamSearchInput, setJamSearchInput] = useState(searchQuery);
  const [newRoom, setNewRoom] = useState({
    name: "",
    description: "",
    genre: "",
    maxParticipants: 8,
    isPrivate: false,
  });

  const handleCreateRoom = () => {
    if (isGuest) {
      onGuestAction?.();
      return;
    }
    if (!newRoom.name.trim()) return;
    // TODO: Implement actual room creation with API
    setIsCreateRoomOpen(false);
    setNewRoom({
      name: "",
      description: "",
      genre: "",
      maxParticipants: 8,
      isPrivate: false,
    });
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

  return (
    <div className="p-4">
      {/* Jams Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Jams</h2>
          <AlertDialog open={isCreateRoomOpen} onOpenChange={setIsCreateRoomOpen}>
          <AlertDialogTrigger render={
            <Button 
              variant="default" 
              size="sm"
              onClick={(e) => {
                if (isGuest) {
                  e.preventDefault();
                  onGuestAction?.();
                } else {
                  setIsCreateRoomOpen(true);
                }
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Jam
            </Button>
          } />
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Create New Jam</AlertDialogTitle>
              <AlertDialogDescription>
                Start a new jamming session. Invite others to join and make music together.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="room-name">Room Name</Label>
                <Input
                  id="room-name"
                  placeholder="e.g., Chill Vibes"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-description">Description (Optional)</Label>
                <Textarea
                  id="room-description"
                  placeholder="What's this room about?"
                  value={newRoom.description}
                  onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-genre">Genre (Optional)</Label>
                <Input
                  id="room-genre"
                  placeholder="e.g., Lo-Fi, Rock, Electronic"
                  value={newRoom.genre}
                  onChange={(e) => setNewRoom({ ...newRoom, genre: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-max">Max Participants</Label>
                <Input
                  id="room-max"
                  type="number"
                  min="2"
                  max="20"
                  value={newRoom.maxParticipants}
                  onChange={(e) => setNewRoom({ ...newRoom, maxParticipants: parseInt(e.target.value) || 8 })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="room-private"
                  checked={newRoom.isPrivate}
                  onChange={(e) => setNewRoom({ ...newRoom, isPrivate: e.target.checked })}
                  className="rounded border-input"
                />
                <Label htmlFor="room-private" className="cursor-pointer">
                  Private Room
                </Label>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleCreateRoom} disabled={!newRoom.name.trim()}>
                Create Room
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

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
      </div>

      {/* Jams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roomsLoading ? (
          <div className="col-span-full p-8 text-center text-muted-foreground">
            <p className="text-sm">Loading jams...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground">
            <Music className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {searchQuery ? "No jams found" : "No jams yet"}
            </p>
            <p className="text-xs mt-1">
              {searchQuery 
                ? "Try adjusting your search"
                : "Create a jam to start jamming!"}
            </p>
          </div>
        ) : (
          filteredRooms.map((room) => (
            <div
              key={room.id}
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
                      <span className="text-xs text-muted-foreground">🔒</span>
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
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default JamsTab;

