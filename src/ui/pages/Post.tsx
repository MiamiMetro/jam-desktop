import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
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
  Mic,
  Trash2,
  Upload,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { usePost, useComments, useCreateComment, useToggleLike, type FrontendComment, type FrontendPost } from "@/hooks/usePosts";
import { useCommunities } from "@/hooks/useCommunities";
import { formatTimeAgo, formatDuration } from "@/lib/postUtils";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { CommentAudioPlayer } from "@/components/CommentAudioPlayer";

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
  const { data: communities = [] } = useCommunities();
  const [commentContent, setCommentContent] = useState("");
  const MAX_COMMENT_LENGTH = 1000; // Same as posts
  
  // Audio player for post audio
  const postAudioUrl = post?.audioFile?.url;
  const postAudioPlayer = useAudioPlayer(postAudioUrl);
  
  // Track which comment audio is playing
  const [playingCommentId, setPlayingCommentId] = useState<string | null>(null);
  const [commentAudioFile, setCommentAudioFile] = useState<File | null>(null);
  
  const {
    isRecording: isRecordingComment,
    recordedAudio: recordedCommentAudio,
    recordingTime: commentRecordingTime,
    startRecording: startCommentRecording,
    stopRecording: stopCommentRecording,
    deleteRecording: deleteCommentRecording,
    getAudioFile: getCommentAudioFile,
  } = useAudioRecorder();
  
  // Audio player for recorded comment audio preview
  const recordedCommentAudioPlayer = useAudioPlayer(recordedCommentAudio?.url);
  
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
      await toggleLikeMutation.mutateAsync(commentId);
    } catch (error) {
      console.error('Error toggling comment like:', error);
    }
  };

  const handleSubmitComment = () => {
    if (!id || (!commentContent.trim() && !commentAudioFile && !recordedCommentAudio) || isGuest) return;
    
    const audioFile = recordedCommentAudio ? getCommentAudioFile() : commentAudioFile;
    
    createCommentMutation.mutate(
      { postId: id, content: commentContent.trim() || "", audioFile: audioFile || undefined },
      {
        onSuccess: () => {
          setCommentContent("");
          setCommentAudioFile(null);
          if (recordedCommentAudio) {
            deleteCommentRecording();
          }
        },
      }
    );
  };

  const handleCommentUploadAudio = (file: File) => {
    if (recordedCommentAudio) {
      deleteCommentRecording();
    }
    setCommentAudioFile(file);
  };

  const handleDeleteCommentUploadedAudio = () => {
    setCommentAudioFile(null);
  };

  const handleStartCommentRecording = () => {
    if (commentAudioFile) {
      setCommentAudioFile(null);
    }
    startCommentRecording();
  };

  const handleStopCommentRecording = () => {
    stopCommentRecording();
  };

  const handleDeleteCommentRecording = () => {
    deleteCommentRecording();
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
            <div className="mb-6 pb-6 border-b border-border">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => user && navigate(`/profile/${user.username}`)}
                  className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <Avatar size="default" className="pointer-events-none">
                    <AvatarImage src={user?.avatar || ""} alt={user?.username || "You"} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.username?.substring(0, 2).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </button>
                <div className="flex-1 space-y-3 min-w-0">
                  <Textarea
                    placeholder="Write a comment..."
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    className="min-h-[80px] resize-none border-border w-full overflow-wrap-anywhere"
                    rows={3}
                    maxLength={MAX_COMMENT_LENGTH}
                    wrap="soft"
                  />
                  
                  {/* Recorded Audio Preview */}
                  {recordedCommentAudio && (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full"
                        onClick={() => recordedCommentAudioPlayer.togglePlayPause()}
                      >
                        {recordedCommentAudioPlayer.isPlaying ? (
                          <Pause className="h-5 w-5" />
                        ) : (
                          <Play className="h-5 w-5" />
                        )}
                      </Button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Music className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm font-medium truncate">Voice Recording</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div 
                            className="flex-1 h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden cursor-pointer"
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = e.clientX - rect.left;
                              const percentage = (x / rect.width) * 100;
                              recordedCommentAudioPlayer.seek(percentage);
                            }}
                          >
                            <div 
                              className="h-full bg-primary transition-all"
                              style={{ width: `${recordedCommentAudioPlayer.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(recordedCommentAudio.duration)}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="h-6 w-6"
                        onClick={handleDeleteCommentRecording}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {/* Uploaded Audio Preview */}
                  {commentAudioFile && !recordedCommentAudio && (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Music className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm flex-1 truncate">{commentAudioFile.name}</span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="h-6 w-6"
                        onClick={handleDeleteCommentUploadedAudio}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Only show buttons when no audio is selected */}
                      {!commentAudioFile && !recordedCommentAudio && (
                        <>
                          {/* Upload Audio Button */}
                          <label htmlFor="comment-audio-upload" className="cursor-pointer">
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              className="text-muted-foreground hover:text-foreground"
                              disabled={isRecordingComment}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Audio
                            </Button>
                            <input
                              id="comment-audio-upload"
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleCommentUploadAudio(file);
                                }
                              }}
                            />
                          </label>
                          
                          {/* Microphone Button */}
                          <Button
                            variant={isRecordingComment ? "default" : "ghost"}
                            size="sm"
                            type="button"
                            onClick={isRecordingComment ? handleStopCommentRecording : handleStartCommentRecording}
                            className={isRecordingComment ? "bg-red-500 hover:bg-red-600 text-white" : "text-muted-foreground hover:text-foreground"}
                          >
                            <Mic className="h-4 w-4 mr-2" />
                            {isRecordingComment ? "Stop" : "Record"}
                            {isRecordingComment && (
                              <span className="ml-2 text-xs">
                                {formatDuration(commentRecordingTime)}
                              </span>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                    <Button
                      onClick={handleSubmitComment}
                      disabled={(!commentContent.trim() && !commentAudioFile && !recordedCommentAudio) || createCommentMutation.isPending || isRecordingComment}
                      size="sm"
                    >
                      {createCommentMutation.isPending ? "Posting..." : "Post Comment"}
                    </Button>
                  </div>
                </div>
              </div>
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
                      className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
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
              {hasNextPage && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isFetchingNextPage ? 'Loading more comments...' : 'Load more comments'}
                  </button>
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

