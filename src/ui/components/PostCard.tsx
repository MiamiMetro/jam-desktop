import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Heart,
  MessageCircle,
  Share2,
  Hash as HashIcon,
} from "lucide-react";
import { PostAudioPlayer } from "@/components/PostAudioPlayer";
import { AutoLinkedText } from "@/components/AutoLinkedText";

import type { FrontendPost } from '@/hooks/usePosts';

interface PostCardProps {
  post: FrontendPost;
  communityName?: string | null;
  isPlaying?: boolean;
  isGuest?: boolean;
  onAuthorClick?: (username: string) => void;
  onCommunityClick?: (communityId: string) => void;
  onPostClick?: (postId: string) => void;
  onLike?: (postId: string) => void;
  onPlayPause?: () => void;
  onGuestAction?: () => void;
  formatTimeAgo: (date: Date) => string;
  formatDuration: (seconds: number) => string;
}

export function PostCard({
  post,
  communityName,
  isPlaying = false,
  isGuest = false,
  onAuthorClick,
  onCommunityClick,
  onPostClick,
  onLike,
  onPlayPause,
  onGuestAction: _onGuestAction,
  formatTimeAgo,
  formatDuration: _formatDuration,
}: PostCardProps) {
  return (
    <div className="p-5 hover:bg-muted/20 transition-all duration-200">
      <div className="flex gap-3">
        <button
          onClick={() => onAuthorClick?.(post.author.username)}
          className="flex-shrink-0 cursor-pointer p-0 m-0 border-0 bg-transparent hover:opacity-80 transition-opacity self-start"
          aria-label={`Go to ${post.author.username}'s profile`}
        >
          <Avatar size="default" className="pointer-events-none ring-1 ring-border">
            <AvatarImage src={post.author.avatar || ""} alt={post.author.username} />
            <AvatarFallback className="bg-muted text-muted-foreground">
              {post.author.username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <button
              onClick={() => onAuthorClick?.(post.author.username)}
              className="font-heading font-semibold text-sm hover:underline cursor-pointer"
            >
              {post.author.username}
            </button>
            {post.isGlobal ? (
              <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                Discover
              </span>
            ) : communityName ? (
              <button
                onClick={() => post.community && onCommunityClick?.(post.community)}
                className="text-xs px-2 py-0.5 rounded bg-primary/8 text-primary/80 hover:bg-primary/12 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <HashIcon className="h-3 w-3" />
                From {communityName}
              </button>
            ) : null}
            <span className="text-xs text-muted-foreground">
              • {formatTimeAgo(post.timestamp)}
            </span>
          </div>
          {post.content && (
            <AutoLinkedText
              text={post.content}
              className="text-sm mb-3 whitespace-pre-wrap block"
              linkClassName="text-blue-500 hover:text-blue-600 underline"
            />
          )}
          {post.audioFile && (
            <PostAudioPlayer
              audioFile={post.audioFile}
              isActive={isPlaying}
              onActivate={() => onPlayPause?.()}
              isGuest={isGuest}
            />
          )}
          <div className="flex items-center gap-6 mt-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onLike) {
                  onLike(post.id);
                }
              }}
              className={`flex items-center gap-2 text-sm transition-all cursor-pointer active:scale-90 ${
                post.isLiked
                  ? "text-red-500 hover:text-red-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Heart className={`h-4 w-4 ${post.isLiked ? "fill-current" : ""} pointer-events-none`} />
              <span className="pointer-events-none">{post.likes}</span>
            </button>
            <button 
              onClick={() => onPostClick?.(post.id)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{post.comments}</span>
            </button>
            <button 
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Share2 className="h-4 w-4" />
              <span>{post.shares}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

