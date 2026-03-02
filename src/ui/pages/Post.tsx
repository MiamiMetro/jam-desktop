// Post.tsx — Post detail page with single column layout, comments below
import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Check,
  Hash as HashIcon,
  Trash2,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { usePost, useComments, useCreateComment, useToggleLike, useToggleCommentLike, usePostLikes, useDeleteComment, useDeletePost, type FrontendComment } from "@/hooks/usePosts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { useCommunities } from "@/hooks/useCommunities";
import { formatTimeAgo } from "@/lib/postUtils";
import { Timestamp } from "@/components/Timestamp";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { AudioPlayer } from "@/components/AudioPlayer";
import { ComposePost } from "@/components/ComposePost";
import { AutoLinkedText } from "@/components/AutoLinkedText";

function Post() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isGuest, user } = useAuthStore();
  const { data: post, isLoading } = usePost(id || "");
  const commentsQuery = useComments(id || "");
  const comments = (commentsQuery.data || []) as FrontendComment[];
  const { isLoading: commentsLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = commentsQuery;

  const createCommentMutation = useCreateComment();
  const toggleLikeMutation = useToggleLike();
  const toggleCommentLikeMutation = useToggleCommentLike();
  const deleteCommentMutation = useDeleteComment();
  const deletePostMutation = useDeletePost();
  const { data: communities = [] } = useCommunities();

  const [copied, setCopied] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);
  const likersQuery = usePostLikes(likersOpen ? (id ?? null) : null);
  const likers = likersQuery.data;

  const handleShare = useCallback(() => {
    const base = import.meta.env.VITE_SITE_URL || window.location.origin;
    const url = `${base}/post/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [id]);

  const handleAuthorClick = (username: string) => {
    navigate(`/profile/${username}`);
  };

  const handleCommunityClick = (communityId: string) => {
    navigate(`/community/${communityId}`);
  };

  const handleLikePost = async () => {
    if (isGuest || !id) return;
    try {
      await toggleLikeMutation.mutateAsync(id);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (isGuest) return;
    try {
      await toggleCommentLikeMutation.mutateAsync(commentId);
    } catch (error) {
      console.error('Error toggling comment like:', error);
    }
  };

  const handleSubmitComment = async (content: string, audioFile: File | null) => {
    if (!id || (!content.trim() && !audioFile) || isGuest) return;
    await createCommentMutation.mutateAsync({
      postId: id,
      content: content.trim() || "",
      audioFile: audioFile || undefined,
    });
  };

  const getCommunityName = (communityId?: string) => {
    if (!communityId) return null;
    const community = communities.find(c => c.id === communityId);
    return community?.name || communityId;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingState message="Loading post..." />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-6">
        <EmptyState icon={MessageCircle} title="Post not found" />
      </div>
    );
  }

  if (post.isDeleted) {
    return (
      <div className="flex flex-col h-full">
        <div className="page-header caption-safe px-5 py-3 border-b border-border flex items-center gap-2 shrink-0">
          <button className="no-drag cursor-pointer text-muted-foreground hover:text-foreground transition-colors" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-semibold text-muted-foreground">Post by {post.author.username}</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-base italic text-muted-foreground/60">
            ♪ this post was removed
            <span className="not-italic ml-2 text-sm text-muted-foreground/40">
              • <Timestamp date={post.timestamp}>{formatTimeAgo(post.timestamp)}</Timestamp>
            </span>
          </p>
        </div>
      </div>
    );
  }

  const communityName = getCommunityName(post.community);

  return (
    <div className="flex flex-col h-full">
      {/* Compact Header Bar */}
      <div className="page-header caption-safe px-5 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
        <button
          className="no-drag cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        {post && (
          <h2 className="text-sm font-semibold text-muted-foreground">
            Post by {post.author.username}
          </h2>
        )}
      </div>

      {/* Scrollable content — centered */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full">
        {/* Post content */}
        <div className="p-6">
          <div className="flex gap-4">
            <button
              onClick={() => handleAuthorClick(post.author.username)}
              className="flex-shrink-0 cursor-pointer p-0 border-0 bg-transparent hover:opacity-80 transition-opacity self-start"
            >
              <Avatar size="lg" className="ring-2 ring-border">
                <AvatarImage src={post.author.avatar || ""} alt={post.author.username} />
                <AvatarFallback className="bg-muted text-muted-foreground text-lg">
                  {post.author.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <button
                  onClick={() => handleAuthorClick(post.author.username)}
                  className="font-heading font-bold text-lg hover:underline cursor-pointer"
                >
                  {post.author.username}
                </button>
                {post.isGlobal ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    Global
                  </span>
                ) : communityName ? (
                  <button
                    onClick={() => post.community && handleCommunityClick(post.community)}
                    className="text-xs px-2 py-0.5 rounded-full glass-solid hover:bg-foreground/[0.06] transition-colors flex items-center gap-1"
                  >
                    <HashIcon className="h-3 w-3" />
                    {communityName}
                  </button>
                ) : null}
                <Timestamp date={post.timestamp} className="text-xs text-muted-foreground">
                  • {formatTimeAgo(post.timestamp)}
                </Timestamp>
              </div>
            </div>
          </div>

          {post.content && (
            <div className="text-base mt-4 leading-relaxed">
              <AutoLinkedText text={post.content} className="whitespace-pre-wrap wrap-break-word block mb-4" linkClassName="text-blue-500 hover:text-blue-600 underline" />
            </div>
          )}

          {/* Audio player */}
          {post.audioFile && (
            <div className="pt-2 border-t border-border/20">
              <AudioPlayer
                postId={post.id}
                audioFile={post.audioFile}
                authorName={post.author.username}
                isGuest={isGuest}
                variant="post"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-6 mt-5 pt-4 border-t border-border/30">
            <div className="flex items-center gap-1">
              <button
                onClick={handleLikePost}
                className={`flex items-center gap-2 text-sm transition-all cursor-pointer active:scale-90 ${
                  post.isLiked
                    ? "text-red-500 hover:text-red-600"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Heart className={`h-5 w-5 transition-transform ${post.isLiked ? "fill-current" : ""}`} />
              </button>
              <button
                onClick={() => post.likes > 0 && setLikersOpen(true)}
                className={`text-sm transition-colors ${post.likes > 0 ? "hover:underline cursor-pointer" : "cursor-default"} ${post.isLiked ? "text-red-500" : "text-muted-foreground"}`}
              >
                {post.likes}
              </button>
            </div>
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="h-5 w-5" />
              <span>{post.comments}</span>
            </span>
            <button
              onClick={handleShare}
              className={`flex items-center gap-2 text-sm transition-colors cursor-pointer ${
                copied ? "text-green-500" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {copied ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
              {copied && <span>Copied!</span>}
            </button>
            {!isGuest && user?.username === post.author.username && (
              <button
                onClick={() => deletePostMutation.mutate(post.id)}
                className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                title="Delete post"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <div className="border-t border-border">
          <div className="px-6 py-3 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-primary" />
            <h3 className="text-sm font-heading font-semibold">Comments</h3>
            <span className="text-xs text-muted-foreground">({comments.length})</span>
          </div>

          {!isGuest && (
            <div className="px-6 pb-4">
              <ComposePost
                placeholder="Write a comment..."
                onSubmit={handleSubmitComment}
                submitButtonText="Comment"
                textareaRows={2}
                textareaMinHeight="60px"
                maxLength={1000}
                wrapperClassName="glass-solid rounded-lg p-3"
                inputId="comment-audio-upload"
                isSubmitting={createCommentMutation.isPending}
              />
            </div>
          )}

          {commentsLoading ? (
            <LoadingState message="Loading comments..." />
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center px-6">
              <MessageCircle className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No comments yet</p>
              <p className="text-xs text-muted-foreground/60">Be the first to comment!</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border/30">
                {comments.map((comment) => {
                  const isOwn = !isGuest && user?.username === comment.author.username;
                  return (
                  <div key={comment.id} className="flex gap-3 px-6 py-3 hover:bg-muted/10 transition-all group">
                    {comment.isDeleted ? (
                      <p className="text-sm italic text-muted-foreground/60 py-1">
                        ♪ this note was removed
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
                            <AutoLinkedText text={comment.content} className="text-sm whitespace-pre-wrap wrap-break-word leading-relaxed" linkClassName="text-blue-500 hover:text-blue-600 underline" />
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
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLikeComment(comment.id);
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
                            {isOwn && (
                              <button
                                type="button"
                                onClick={() => deleteCommentMutation.mutate(comment.id)}
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
                  </div>
                  );
                })}
              </div>
              <div className="p-4">
                <LoadMoreButton
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  fetchNextPage={fetchNextPage}
                />
              </div>
            </>
          )}
        </div>
        </div>
      </div>

      {/* Likers Dialog */}
      <Dialog open={likersOpen} onOpenChange={setLikersOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Liked by</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
            {likersQuery.isLoading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
            ) : likers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No likes yet</p>
            ) : (
              likers.map((liker) => (
                <button
                  key={liker.id}
                  onClick={() => { setLikersOpen(false); navigate(`/profile/${liker.username}`); }}
                  className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <Avatar size="sm">
                    <AvatarImage src={liker.avatar_url || ""} alt={liker.username} />
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                      {liker.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    {liker.display_name && (
                      <div className="text-sm font-semibold truncate">{liker.display_name}</div>
                    )}
                    <div className="text-xs text-muted-foreground truncate">@{liker.username}</div>
                  </div>
                </button>
              ))
            )}
            {likersQuery.hasNextPage && (
              <div className="pt-1">
                <LoadMoreButton
                  hasNextPage={likersQuery.hasNextPage}
                  isFetchingNextPage={likersQuery.isFetchingNextPage}
                  fetchNextPage={likersQuery.fetchNextPage}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Post;
