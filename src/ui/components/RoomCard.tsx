// RoomCard.tsx — Reusable room card for jam room listings
import { Hash, Users, Lock } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import type { Room } from "@/hooks/useJams";

interface RoomCardProps {
  room: Room;
  onClick?: (roomId: string) => void;
  variant?: "grid" | "list";
}

export function RoomCard({ room, onClick, variant = "grid" }: RoomCardProps) {
  const isFull = room.participants >= room.maxParticipants;
  const hasParticipants = room.participants > 0;
  const isActive = room.isEnabled && hasParticipants;

  if (variant === "list") {
    return (
      <div
        onClick={() => onClick?.(room.id)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 relative overflow-hidden ${
          isFull
            ? "glass-solid opacity-60 hover:opacity-80"
            : isActive
              ? "glass-strong ring-1 ring-primary/20 hover:ring-primary/40"
              : "glass-solid hover:glass-strong hover:ring-1 hover:ring-primary/20"
        }`}
      >
        <div className="relative flex items-center gap-3 flex-1 min-w-0">
          <Hash className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-semibold truncate flex-shrink min-w-0">{room.name}</span>
          {room.isPrivate && <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
          {room.genre && (
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium flex-shrink-0">
              {room.genre}
            </span>
          )}
          {isFull && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted-foreground/20 text-muted-foreground font-medium flex-shrink-0">
              Full
            </span>
          )}
          <div className="flex-1" />
          <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
            <Users className="h-3 w-3" />
            {room.participants}/{room.maxParticipants}
          </span>
          <Avatar size="xs" className="h-5 w-5 flex-shrink-0">
            <AvatarImage src={room.hostAvatar || ""} alt={room.hostName} />
            <AvatarFallback className="bg-muted text-muted-foreground text-[8px]">
              {room.hostName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {room.isEnabled && (
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onClick?.(room.id)}
      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 group relative overflow-hidden ${
        isFull
          ? "glass-solid opacity-60 hover:opacity-80"
          : isActive
            ? "glass-strong ring-1 ring-primary/20 hover:ring-primary/40 hover:-translate-y-px hover:shadow-md"
            : "glass-solid hover:glass-strong hover:ring-1 hover:ring-primary/20 hover:-translate-y-px hover:shadow-md"
      }`}
    >
      {/* Active glow */}
      {/* Active pulse indicator */}
      {room.isEnabled && (
        <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-green-400 animate-pulse" />
      )}
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Hash className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <h3 className="text-sm font-semibold truncate">
            {room.name}
          </h3>
          {room.isPrivate && (
            <Lock className="h-3 w-3 text-muted-foreground" />
          )}
          {isFull && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted-foreground/20 text-muted-foreground font-medium ml-auto">
              Full
            </span>
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
    </div>
  );
}
