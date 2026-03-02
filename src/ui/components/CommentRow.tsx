// CommentRow.tsx — Single comment with inline reply compose and threaded replies
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Trash2, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AudioPlayer } from "@/components/AudioPlayer";
import { AutoLinkedText } from "@/components/AutoLinkedText";
import { ComposePost } from "@/components/ComposePost";
import { Spinner } from "@/components/ui/spinner";
import { Timestamp } from "@/components/Timestamp";
import { formatTimeAgo } from "@/lib/postUtils";
import { useReplies, useCreateReply, type FrontendComment } from "@/hooks/usePosts";

interface CommentRowProps {
  comment: FrontendComment;
  isGuest: boolean;
  currentUsername?: string;
  postId: string;
  onLikeComment: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
  isReply?: boolean;
  /** Called by reply rows to open the compose box at the parent thread level */
  onReply?: (replyingToUsername: string) => void;
}

export function CommentRow({
  comment,
  isGuest,
  currentUsername,
  postId,
  onLikeComment,
  onDeleteComment,
  isReply = false,
  onReply,
}: CommentRowProps) {
  const navigate = useNavigate();
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [replyComposing, setReplyComposing] = useState(false);
  // Tracks which @username to mention — defaults to the comment author, changes when replying to a reply
  const [replyingToUsername, setReplyingToUsername] = useState(comment.author.username);

  const repliesQuery = useReplies(!isReply && repliesExpanded ? comment.id : null);
  const createReplyMutation = useCreateReply();

  const isOwn = !isGuest && currentUsername === comment.author.username;
  const repliesCount = comment.repliesCount ?? 0;

  const handleSubmitReply = async (content: string, audioFile: File | null) => {
    await createReplyMutation.mutateAsync({
      parentId: comment.id,
      content: content.trim() || "",
      audioFile: audioFile || null,
    });
    setReplyComposing(false);
    setRepliesExpanded(true);
  };

  const openReplyCompose = (username: string) => {
    setReplyingToUsername(username);
    setReplyComposing(true);
    setRepliesExpanded(true);
  };

  return (
    <div>
      {/* Comment row */}
      <div className={`flex gap-3 px-6 py-3 hover:bg-muted/10 transition-all group ${isReply ? "py-2" : ""}`}>
        {comment.isDeleted ? (
          <p className="text-sm italic text-muted-foreground/60 py-1">
            ♪ this comment was removed
            <span className="not-italic ml-2 text-xs text-muted-foreground/40">
              • <Timestamp date={comment.timestamp}>{formatTimeAgo(comment.timestamp)}</Timestamp>
            </span>
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => navigate(`/profile/${comment.author.username}`)}
              className="shrink-0 p-0 m-0 border-0 bg-transparent cursor-pointer hover:opacity-80 transition-opacity self-start"
              aria-label={`Go to ${comment.author.username}'s profile`}
            >
              <Avatar size="sm" className="pointer-events-none ring-1 ring-border">
                <AvatarImage src={comment.author.avatar || ""} alt={comment.author.username} />
                <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                  {comment.author.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <button
                  onClick={() => navigate(`/profile/${comment.author.username}`)}
                  className="font-semibold text-xs hover:underline cursor-pointer"
                >
                  {comment.author.username}
                </button>
                <Timestamp date={comment.timestamp} className="text-[11px] text-muted-foreground">
                  {formatTimeAgo(comment.timestamp)}
                </Timestamp>
              </div>
              {comment.content && (
                <AutoLinkedText
                  text={comment.content}
                  className="text-sm whitespace-pre-wrap wrap-break-word leading-relaxed"
                  linkClassName="text-blue-500 hover:text-blue-600 underline"
                />
              )}
              {comment.audioFile && (
                <AudioPlayer
                  postId={comment.id}
                  audioFile={comment.audioFile}
                  authorName={comment.author.username}
                  variant="comment"
                />
              )}
              <div className="flex items-center gap-4 mt-1.5">
                {/* Like */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLikeComment(comment.id);
                  }}
                  className={`flex items-center gap-1 text-xs transition-all cursor-pointer active:scale-90 ${
                    comment.isLiked
                      ? "text-red-500 hover:text-red-600"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Heart className={`h-3 w-3 ${comment.isLiked ? "fill-current" : ""}`} />
                  <span>{comment.likes || 0}</span>
                </button>

                {/* Reply button */}
                {!isGuest && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isReply) {
                        // Bubble up to parent thread's compose
                        onReply?.(comment.author.username);
                      } else {
                        openReplyCompose(comment.author.username);
                      }
                    }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <MessageCircle className="h-3 w-3" />
                    Reply
                  </button>
                )}

                {/* View/Hide replies — top-level only */}
                {!isReply && repliesCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setRepliesExpanded((v) => !v)}
                    className="text-xs text-primary hover:underline cursor-pointer"
                  >
                    {repliesExpanded
                      ? "Hide replies"
                      : `View ${repliesCount} ${repliesCount === 1 ? "reply" : "replies"}`}
                  </button>
                )}

                {/* Delete */}
                {isOwn && (
                  <button
                    type="button"
                    onClick={() => onDeleteComment(comment.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                    title="Delete comment"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* Show "View N replies" even for deleted comments */}
        {comment.isDeleted && !isReply && repliesCount > 0 && (
          <button
            type="button"
            onClick={() => setRepliesExpanded((v) => !v)}
            className="self-center text-xs text-primary hover:underline cursor-pointer shrink-0"
          >
            {repliesExpanded
              ? "Hide replies"
              : `View ${repliesCount} ${repliesCount === 1 ? "reply" : "replies"}`}
          </button>
        )}
      </div>

      {/* Inline reply compose — lives at top-level only */}
      {replyComposing && !isGuest && !isReply && (
        <div className="pl-12 pr-6 pb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">
              Replying to @{replyingToUsername}
            </span>
            <button
              type="button"
              onClick={() => setReplyComposing(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <ComposePost
            key={replyingToUsername}
            placeholder={`Reply to @${replyingToUsername}...`}
            initialContent={`@${replyingToUsername} `}
            onSubmit={handleSubmitReply}
            submitButtonText="Reply"
            textareaRows={2}
            textareaMinHeight="60px"
            maxLength={1000}
            wrapperClassName="glass-solid rounded-lg p-3"
            inputId={`reply-audio-${comment.id}`}
            isSubmitting={createReplyMutation.isPending}
          />
        </div>
      )}

      {/* Reply thread */}
      {!isReply && repliesExpanded && (
        <div className="ml-9 pl-4 border-l-2 border-border/30">
          {repliesQuery.isLoading ? (
            <div className="flex items-center gap-2 px-6 py-3 text-xs text-muted-foreground">
              <Spinner className="size-3 text-primary" />
              Loading replies...
            </div>
          ) : (
            <>
              {repliesQuery.data.map((reply) => (
                <CommentRow
                  key={reply.id}
                  comment={reply}
                  isGuest={isGuest}
                  currentUsername={currentUsername}
                  postId={postId}
                  onLikeComment={onLikeComment}
                  onDeleteComment={onDeleteComment}
                  isReply={true}
                  onReply={openReplyCompose}
                />
              ))}
              {repliesQuery.hasNextPage && (
                <button
                  type="button"
                  onClick={repliesQuery.fetchNextPage}
                  disabled={repliesQuery.isFetchingNextPage}
                  className="px-6 py-2 text-xs text-primary hover:underline cursor-pointer disabled:opacity-50"
                >
                  {repliesQuery.isFetchingNextPage ? "Loading..." : "Load more replies"}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
