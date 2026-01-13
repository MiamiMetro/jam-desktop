import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft,
  Music,
  Play,
  Pause,
  Heart,
  MessageCircle,
  Share2,
  Hash as HashIcon,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { usePost, useComments, useCreateComment, useToggleLike, useToggleCommentLike, type FrontendComment } from "@/hooks/usePosts";
import { useCommunities } from "@/hooks/useCommunities";
import { formatTimeAgo, formatDuration } from "@/lib/postUtils";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { CommentAudioPlayer } from "@/components/CommentAudioPlayer";
import { ComposePost } from "@/components/ComposePost";

function Post() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isGuest } = useAuthStore();
  const { data: post, isLoading } = usePost(id || "");
  const commentsQuery = useComments(id || "");
  const comments = (commentsQuery.data || []) as FrontendComment[];
  const { isLoading: commentsLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = commentsQuery;
  
  // Infinite scroll: detect when user scrolls near bottom of comments
  const { ref: loadMoreCommentsRef, inView } = useInView({
    threshold: 0,
    rootMargin: '200px',
  });
  
  // Auto-load next page when scroll reaches trigger point
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && !commentsLoading) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, commentsLoading, fetchNextPage]);
  const createCommentMutation = useCreateComment();
  const toggleLikeMutation = useToggleLike();
  const toggleCommentLikeMutation = useToggleCommentLike();
  const { data: communities = [] } = useCommunities();
  
  // Audio player for post audio
  const postAudioUrl = post?.audioFile?.url;
  const postAudioPlayer = useAudioPlayer(postAudioUrl);
  
  // Track which comment audio is playing
  const [playingCommentId, setPlayingCommentId] = useState<string | null>(null);
  
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

  const handleSubmitComment = (content: string, audioFile: File | null) => {
    if (!id || (!content.trim() && !audioFile) || isGuest) return;
    
    createCommentMutation.mutate(
      { postId: id, content: content.trim() || "", audioFile: audioFile || undefined },
      {
        onSuccess: () => {
          // State is managed by ComposePost, so we don't need to reset it here
        },
      }
    );
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

  const communityName = getCommunityName(post.community);

  return (
    <div className="p-4">
      {/* Back Button */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Post Content */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-background border border-border rounded-lg p-6">
          <div className="flex gap-3">
            <button
              onClick={() => handleAuthorClick(post.author.username)}
              className="flex-shrink-0 cursor-pointer p-0 border-0 bg-transparent hover:opacity-80 transition-opacity self-start"
            >
              <Avatar size="default">
                <AvatarImage src={post.author.avatar || ""} alt={post.author.username} />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {post.author.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <button
                  onClick={() => handleAuthorClick(post.author.username)}
                  className="font-semibold text-base hover:underline cursor-pointer"
                >
                  {post.author.username}
                </button>
                {post.isGlobal ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                    Discover
                  </span>
                ) : communityName ? (
                  <button
                    onClick={() => post.community && handleCommunityClick(post.community)}
                    className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-muted/80 transition-colors flex items-center gap-1"
                  >
                    <HashIcon className="h-3 w-3" />
                    From {communityName}
                  </button>
                ) : null}
                <span className="text-sm text-muted-foreground">
                  • {formatTimeAgo(post.timestamp)}
                </span>
              </div>
              {post.content && (
                <p className="text-base mb-4 whitespace-pre-wrap">{post.content}</p>
              )}
              {post.audioFile && (
                <div className="mb-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-12 w-12 rounded-full"
                      onClick={() => {
                        if (isGuest) return;
                        postAudioPlayer.togglePlayPause();
                      }}
                    >
                      {postAudioPlayer.isPlaying ? (
                        <Pause className="h-6 w-6" />
                      ) : (
                        <Play className="h-6 w-6" />
                      )}
                    </Button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Music className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <span className="text-base font-medium truncate">
                          {post.audioFile.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted-foreground/20 rounded-full overflow-hidden cursor-pointer"
                          onClick={(e) => {
                            if (isGuest) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const percentage = (x / rect.width) * 100;
                            postAudioPlayer.seek(percentage);
                          }}
                        >
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${postAudioPlayer.progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatDuration(post.audioFile.duration)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-6 pt-4 border-t border-border">
                <button
                  onClick={handleLikePost}
                  className={`flex items-center gap-2 text-base transition-colors cursor-pointer ${
                    post.isLiked
                      ? "text-red-500 hover:text-red-600"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Heart className={`h-5 w-5 ${post.isLiked ? "fill-current" : ""}`} />
                  <span>{post.likes}</span>
                </button>
                <button 
                  className="flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>{post.comments}</span>
                </button>
                <button className="flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <Share2 className="h-5 w-5" />
                  <span>{post.shares}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-6 bg-background border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Comments ({comments.length})</h3>
          
          {/* Comment Form */}
          {!isGuest && (
            <div className="mb-6 pb-6">
              <ComposePost
                placeholder="Write a comment..."
                onSubmit={handleSubmitComment}
                submitButtonText="Post Comment"
                textareaRows={3}
                textareaMinHeight="80px"
                maxLength={1000}
                wrapperClassName="border-b border-border pb-4"
                inputId="comment-audio-upload"
                isSubmitting={createCommentMutation.isPending}
              />
            </div>
          )}

          {/* Comments List */}
          {commentsLoading ? (
            <LoadingState message="Loading comments..." />
          ) : comments.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="No comments yet"
              description="Be the first to comment!"
            />
          ) : (
            <>
              <div className="space-y-4">
                {comments.map((comment) => {
                return (
                  <div key={comment.id} className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/profile/${comment.author.username}`)}
                      className="flex-shrink-0 p-0 m-0 border-0 bg-transparent cursor-pointer hover:opacity-80 transition-opacity self-start"
                      aria-label={`Go to ${comment.author.username}'s profile`}
                    >
                      <Avatar size="default" className="pointer-events-none">
                        <AvatarImage src={comment.author.avatar || ""} alt={comment.author.username} />
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          {comment.author.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() => navigate(`/profile/${comment.author.username}`)}
                          className="font-semibold text-sm hover:underline cursor-pointer"
                        >
                          {comment.author.username}
                        </button>
                        <span className="text-xs text-muted-foreground">
                          • {formatTimeAgo(comment.timestamp)}
                        </span>
                      </div>
                      {comment.content && (
                        <p className="text-sm whitespace-pre-wrap mb-2">{comment.content}</p>
                      )}
                      {comment.audioFile && (
                        <CommentAudioPlayer
                          audioFile={comment.audioFile}
                          isActive={playingCommentId === comment.id}
                          onActivate={() => setPlayingCommentId(comment.id)}
                        />
                      )}
                      {/* Like button for comment - comments are now posts so they can be liked */}
                      <div className="flex items-center gap-4 mt-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLikeComment(comment.id);
                          }}
                          className={`flex items-center gap-1 text-xs transition-colors cursor-pointer ${
                            comment.isLiked
                              ? "text-red-500 hover:text-red-600"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Heart className={`h-3.5 w-3.5 ${comment.isLiked ? "fill-current" : ""}`} />
                          <span>{comment.likes || 0}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
              {/* Infinite scroll trigger - invisible element at bottom */}
              {hasNextPage && (
                <div ref={loadMoreCommentsRef} className="mt-4 py-4 text-center">
                  {isFetchingNextPage && (
                    <div className="text-sm text-muted-foreground">
                      Loading more comments...
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Post;

