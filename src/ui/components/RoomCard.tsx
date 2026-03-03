// RoomCard.tsx — Reusable room card for jam room listings
import { Hash, Users, Lock } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface RoomCardRoom {
  id: string;
  handle: string;
  name: string;
  description: string;
  genre: string | null;
  participant_count: number;
  is_private: boolean;
  is_active: boolean;
  host: { id: string; username: string; display_name: string; avatar_url: string } | null;
}

interface RoomCardProps {
  room: RoomCardRoom;
  onClick?: (handle: string) => void;
  variant?: "grid" | "list";
}

export function RoomCard({ room, onClick, variant = "grid" }: RoomCardProps) {
  const hasParticipants = room.participant_count > 0;
  const isActive = room.is_active && hasParticipants;

  const hostName = room.host?.username ?? "Unknown";
  const hostAvatar = room.host?.avatar_url ?? "";

  if (variant === "list") {
    return (
      <div
        onClick={() => onClick?.(room.handle)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 relative overflow-hidden ${
          isActive
            ? "glass-strong ring-1 ring-primary/20 hover:ring-primary/40"
            : "glass-solid hover:glass-strong hover:ring-1 hover:ring-primary/20"
        }`}
      >
        <div className="relative flex items-center gap-3 flex-1 min-w-0">
          <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm font-semibold truncate flex-shrink min-w-0">{room.name}</span>
          {room.is_private && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
          {room.genre && (
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium shrink-0">
              {room.genre}
            </span>
          )}
          <div className="flex-1" />
          <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Users className="h-3 w-3" />
            {room.participant_count}
          </span>
          <Avatar size="xs" className="h-5 w-5 shrink-0">
            <AvatarImage src={hostAvatar} alt={hostName} />
            <AvatarFallback className="bg-muted text-muted-foreground text-[8px]">
              {hostName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {room.is_active && (
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse shrink-0" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onClick?.(room.handle)}
      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 group relative overflow-hidden ${
        isActive
          ? "glass-strong ring-1 ring-primary/20 hover:ring-primary/40"
          : "glass-solid hover:glass-strong hover:ring-1 hover:ring-primary/20"
      }`}
    >
      {/* Active pulse indicator */}
      {room.is_active && (
        <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-green-400 animate-pulse" />
      )}
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <h3 className="text-sm font-semibold truncate">
            {room.name}
          </h3>
          {room.is_private && (
            <Lock className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
        {room.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {room.description}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          {room.genre && (
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
              {room.genre}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {room.participant_count}
          </span>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-border/30">
          <Avatar size="xs" className="h-5 w-5">
            <AvatarImage src={hostAvatar} alt={hostName} />
            <AvatarFallback className="bg-muted text-muted-foreground text-[8px]">
              {hostName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground flex-1 truncate">{hostName}</span>
        </div>
      </div>
    </div>
  );
}
