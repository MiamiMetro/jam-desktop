import { useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Heart,
  MessageCircle,
  Share2,
  Check,
  Hash as HashIcon,
  Trash2,
} from "lucide-react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Timestamp } from "@/components/Timestamp";
import { AutoLinkedText } from "@/components/AutoLinkedText";

import type { FrontendPost } from '@/hooks/usePosts';
import { getCommunityColors } from '@/lib/communityColors';

interface PostCardProps {
  post: FrontendPost;
  isGuest?: boolean;
  currentUsername?: string;
  onAuthorClick?: (username: string) => void;
  onCommunityClick?: (handle: string) => void;
  onPostClick?: (postId: string) => void;
  onLike?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  formatTimeAgo: (date: Date) => string;
}

export function PostCard({
  post,
  isGuest = false,
  currentUsername,
  onAuthorClick,
  onCommunityClick,
  onPostClick,
  onLike,
  onDelete,
  formatTimeAgo,
}: PostCardProps) {
  const communityColors = getCommunityColors(post.communityThemeColor);
  const isOwn = !isGuest && !!currentUsername && currentUsername === post.author.username;
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const base = import.meta.env.VITE_SITE_URL || window.location.origin;
    const url = `${base}/post/${post.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [post.id]);

  if (post.isDeleted) {
    return (
      <div className="px-5 py-4 border-l-2 border-l-transparent">
        <p className="text-sm italic text-muted-foreground/60">
          ♪ this post was removed
          <span className="not-italic ml-2 text-xs text-muted-foreground/40">
            • <Timestamp date={post.timestamp} className="inline">{formatTimeAgo(post.timestamp)}</Timestamp>
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="group p-5 border-l-2 border-l-transparent hover:border-l-primary/40 hover:bg-muted/15 transition-all duration-200">
      <div className="flex gap-3">
        <button
          onClick={() => onAuthorClick?.(post.author.username)}
          className="shrink-0 cursor-pointer p-0 m-0 border-0 bg-transparent hover:opacity-80 transition-opacity self-start"
          aria-label={`Go to ${post.author.username}'s profile`}
        >
          <Avatar size="lg" className="pointer-events-none ring-1 ring-border">
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
            {post.communityHandle ? (
              <button
                onClick={(e) => { e.stopPropagation(); onCommunityClick?.(post.communityHandle!); }}
                className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors ${communityColors.badgeBg} ${communityColors.text}`}
              >
                <HashIcon className="h-3 w-3" />
                {post.communityHandle}
              </button>
            ) : null}
            <Timestamp date={post.timestamp} className="text-xs text-muted-foreground">
              • {formatTimeAgo(post.timestamp)}
            </Timestamp>
            {isOwn && onDelete && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(post.id); }}
                className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded"
                title="Delete post"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {post.content && (
            <AutoLinkedText
              text={post.content}
              className="text-sm mb-3 whitespace-pre-wrap wrap-break-word block"
              linkClassName="text-blue-500 hover:text-blue-600 underline"
            />
          )}
          {post.audioFile && (
            <AudioPlayer
              postId={post.id}
              audioFile={post.audioFile}
              authorName={post.author.username}
              isGuest={isGuest}
              variant="post"
            />
          )}
          <div className="flex items-center gap-6 mt-3 pt-3 border-t border-border/30">
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
            <Tooltip open={copied || undefined}>
              <TooltipTrigger
                onClick={handleShare}
                className={`flex items-center gap-2 text-sm transition-colors cursor-pointer ${
                  copied ? "text-green-500" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                {copied && <span>Copied!</span>}
              </TooltipTrigger>
              {copied && <TooltipContent>Link copied!</TooltipContent>}
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

