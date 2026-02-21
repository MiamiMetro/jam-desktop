// RoomCard.tsx — Reusable room card for jam room listings
import { Hash, Users, Lock } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import type { Room } from "@/hooks/useJams";

interface RoomCardProps {
  room: Room;
  onClick?: (roomId: string) => void;
}

export function RoomCard({ room, onClick }: RoomCardProps) {
  return (
    <div
      onClick={() => onClick?.(room.id)}
      className="p-4 rounded-xl glass hover:glass-strong cursor-pointer transition-all duration-200 group hover:ring-1 hover:ring-primary/20 relative overflow-hidden"
    >
      {/* Active pulse indicator */}
      {room.isEnabled && (
        <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-green-400 animate-pulse" />
      )}
      <div className="flex items-center gap-2 mb-2">
        <Hash className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <h3 className="text-sm font-heading font-semibold truncate">
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
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
        {room.genre && (
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
            {room.genre}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {room.participants}/{room.maxParticipants}
        </span>
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-border/30">
        <Avatar size="xs" className="h-5 w-5">
          <AvatarImage src={room.hostAvatar || ""} alt={room.hostName} />
          <AvatarFallback className="bg-muted text-muted-foreground text-[8px]">
            {room.hostName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs text-muted-foreground flex-1 truncate">{room.hostName}</span>
        {room.mockParticipants && room.mockParticipants.length > 0 && (
          <AvatarGroup>
            {room.mockParticipants.slice(0, 3).map(p => (
              <Avatar key={p.userId} size="xs" className="h-5 w-5 ring-1 ring-background">
                <AvatarImage src={p.avatar || ""} alt={p.username} />
                <AvatarFallback className="bg-muted text-muted-foreground text-[7px]">
                  {p.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </AvatarGroup>
        )}
      </div>
    </div>
  );
}
