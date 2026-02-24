import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Music,
  Star,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";
import { useProfileCatalog, useUpdateProfile, useUser } from "@/hooks/useUsers";
import { useR2Upload } from "@/hooks/useR2Upload";
import { useUserPosts, useToggleLike, type FrontendPost } from "@/hooks/usePosts";
import { useFriends, useRequestFriend, useSentFriendRequests, useDeleteFriend } from "@/hooks/useFriends";
import { EmptyState } from "@/components/EmptyState";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { PostCard } from "@/components/PostCard";
import { formatTimeAgo } from "@/lib/postUtils";
import type { User } from "@/lib/api/types";

type ProfileDraft = {
  display_name: string;
  bio: string;
  avatar_url: string;
  banner_url: string;
  instruments: string[];
  genres: string[];
};

function Profile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser, isGuest, setUser } = useAuthStore();
  const { data: profileUser, isLoading } = useUser(username || "");
  const { data: catalog } = useProfileCatalog();
  const { uploadFile, isUploading } = useR2Upload();
  const {
    data: userPosts = [],
    fetchNextPage: fetchMorePosts,
    hasNextPage: hasMorePosts,
    isFetchingNextPage: isLoadingMorePosts,
  } = useUserPosts(profileUser?.username || "");
  const {
    data: profileUserFriends = [],
    fetchNextPage: fetchMoreFriends,
    hasNextPage: hasMoreFriends,
    isFetchingNextPage: isLoadingMoreFriends,
  } = useFriends(undefined, profileUser?.id);
  const { data: currentUserFriends = [] } = useFriends();

  const requestFriendMutation = useRequestFriend();
  const deleteFriendMutation = useDeleteFriend();
  const toggleLikeMutation = useToggleLike();
  const updateProfileMutation = useUpdateProfile();
  const { hasPendingRequest } = useSentFriendRequests();

  const [activeTab, setActiveTab] = useState<"posts" | "friends">("posts");
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editBannerUrl, setEditBannerUrl] = useState("");
  const [editInstruments, setEditInstruments] = useState<string[]>([]);
  const [editGenres, setEditGenres] = useState<string[]>([]);
  const [customInstrument, setCustomInstrument] = useState("");
  const [customGenre, setCustomGenre] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [previewDraft, setPreviewDraft] = useState<ProfileDraft | null>(null);
  const [stopPreviewAnimPhase, setStopPreviewAnimPhase] = useState<"hidden" | "enter" | "idle">("idle");
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingBannerFile, setPendingBannerFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!profileUser) return;
    setEditDisplayName(profileUser.display_name ?? "");
    setEditBio(profileUser.bio ?? "");
    setEditAvatarUrl(profileUser.avatar_url ?? "");
    setEditBannerUrl(profileUser.banner_url ?? "");
    setEditInstruments(profileUser.instruments ?? []);
    setEditGenres(profileUser.genres ?? []);
  }, [profileUser?.id, profileUser?.display_name, profileUser?.bio, profileUser?.avatar_url, profileUser?.banner_url, profileUser?.instruments, profileUser?.genres]);

  const isOwnProfile = currentUser?.username === profileUser?.username;
  const isPreviewing = isOwnProfile && previewDraft !== null;
  const showFriendActionRow = !isOwnProfile && !isGuest;
  const isFriend = currentUserFriends.some((friend: User) => friend.id === profileUser?.id);
  const hasSentRequest = profileUser?.id ? hasPendingRequest(profileUser.id) : false;

  useEffect(() => {
    if (!isPreviewing) {
      setStopPreviewAnimPhase("idle");
      return;
    }
    setStopPreviewAnimPhase("hidden");
    const raf = window.requestAnimationFrame(() => setStopPreviewAnimPhase("enter"));
    const timer = window.setTimeout(() => setStopPreviewAnimPhase("idle"), 220);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [isPreviewing]);

  const mutualFriends = !isOwnProfile
    ? currentUserFriends.filter((f: User) => profileUserFriends.some((pf: User) => pf.id === f.id))
    : [];

  const visibleDisplayName = previewDraft?.display_name ?? profileUser?.display_name ?? "";
  const visibleBio = previewDraft?.bio ?? profileUser?.bio ?? "";
  const visibleAvatarUrl = previewDraft?.avatar_url ?? profileUser?.avatar_url ?? "";
  const visibleBannerUrl = previewDraft?.banner_url ?? profileUser?.banner_url ?? "";
  const visibleInstruments: string[] = previewDraft?.instruments ?? profileUser?.instruments ?? [];
  const visibleGenres: string[] = previewDraft?.genres ?? profileUser?.genres ?? [];

  const sortedCatalogInstruments = useMemo(
    () => [...(catalog.instruments ?? [])].sort((a, b) => a.localeCompare(b)),
    [catalog.instruments]
  );
  const sortedCatalogGenres = useMemo(
    () => [...(catalog.genres ?? [])].sort((a, b) => a.localeCompare(b)),
    [catalog.genres]
  );

  const activityPosts = useMemo(() => {
    if (!isPreviewing || !isOwnProfile || !profileUser?.username) {
      return userPosts;
    }

    return userPosts.map((post) => {
      const isCurrentUserPost =
        post.author.username.toLowerCase() === profileUser.username.toLowerCase();

      if (!isCurrentUserPost) return post;

      return {
        ...post,
        author: {
          ...post.author,
          avatar: visibleAvatarUrl || undefined,
        },
      };
    });
  }, [isPreviewing, isOwnProfile, profileUser?.username, userPosts, visibleAvatarUrl]);

  const handleAddFriend = async () => {
    if (isGuest || !profileUser?.id) return;
    try {
      await requestFriendMutation.mutateAsync(profileUser.id);
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
  };

  const handleCancelRequest = async () => {
    if (isGuest || !profileUser?.id) return;
    try {
      await deleteFriendMutation.mutateAsync(profileUser.id);
    } catch (error) {
      console.error("Error canceling friend request:", error);
    }
  };

  const handleUnfriend = async () => {
    if (isGuest || !profileUser?.id) return;
    try {
      await deleteFriendMutation.mutateAsync(profileUser.id);
    } catch (error) {
      console.error("Error unfriending:", error);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (isGuest) return;
    try {
      await toggleLikeMutation.mutateAsync(postId);
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const toggleTag = (
    value: string,
    current: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const normalized = value.trim();
    if (!normalized) return;
    const exists = current.some((item) => item.toLowerCase() === normalized.toLowerCase());
    if (exists) {
      setter(current.filter((item) => item.toLowerCase() !== normalized.toLowerCase()));
      return;
    }
    if (current.length >= 8) return;
    setter([...current, normalized]);
  };

  const addCustomTag = (
    value: string,
    current: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    clear: () => void
  ) => {
    const normalized = value.trim().replace(/\s+/g, " ");
    if (!normalized) return;
    if (current.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
      clear();
      return;
    }
    if (current.length >= 8) return;
    setter([...current, normalized]);
    clear();
  };

  const handlePickImage = (kind: "avatar" | "banner", file: File) => {
    const objectUrl = URL.createObjectURL(file);
    if (kind === "avatar") {
      setPendingAvatarFile(file);
      setEditAvatarUrl(objectUrl);
      return;
    }
    setPendingBannerFile(file);
    setEditBannerUrl(objectUrl);
  };

  const resetEditDraft = () => {
    if (!profileUser) return;
    setEditDisplayName(profileUser.display_name ?? "");
    setEditBio(profileUser.bio ?? "");
    setEditAvatarUrl(profileUser.avatar_url ?? "");
    setEditBannerUrl(profileUser.banner_url ?? "");
    setEditInstruments(profileUser.instruments ?? []);
    setEditGenres(profileUser.genres ?? []);
    setPendingAvatarFile(null);
    setPendingBannerFile(null);
    setEditError(null);
  };

  const handlePreviewProfile = () => {
    if (!isOwnProfile) return;
    setEditError(null);
    setPreviewDraft({
      display_name: editDisplayName.trim(),
      bio: editBio,
      avatar_url: editAvatarUrl.trim(),
      banner_url: editBannerUrl.trim(),
      instruments: editInstruments,
      genres: editGenres,
    });
    setIsEditOpen(false);
  };

  const handleStopPreview = () => {
    setPreviewDraft(null);
    setIsEditOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!isOwnProfile) return;
    setEditError(null);
    try {
      let finalAvatarUrl = editAvatarUrl.trim();
      let finalBannerUrl = editBannerUrl.trim();

      if (pendingAvatarFile) {
        const uploadedAvatar = await uploadFile("avatar", pendingAvatarFile);
        finalAvatarUrl = uploadedAvatar.url;
      }
      if (pendingBannerFile) {
        const uploadedBanner = await uploadFile("banner", pendingBannerFile);
        finalBannerUrl = uploadedBanner.url;
      }

      const updated = await updateProfileMutation.mutateAsync({
        display_name: editDisplayName.trim() || undefined,
        bio: editBio,
        avatar_url: finalAvatarUrl,
        banner_url: finalBannerUrl,
        instruments: editInstruments,
        genres: editGenres,
      });
      setUser(updated);
      setPreviewDraft(null);
      setPendingAvatarFile(null);
      setPendingBannerFile(null);
      setEditDisplayName(updated.display_name ?? "");
      setEditBio(updated.bio ?? "");
      setEditAvatarUrl(updated.avatar_url ?? "");
      setEditBannerUrl(updated.banner_url ?? "");
      setEditInstruments(updated.instruments ?? []);
      setEditGenres(updated.genres ?? []);
      setIsEditOpen(false);
    } catch (error: any) {
      setEditError(error?.message || "Failed to save profile.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="h-36 animate-shimmer flex-shrink-0" />
        <div className="flex-1 flex min-h-0">
          <div className="w-[320px] min-w-[320px] border-r border-border p-5">
            <div className="-mt-14 h-24 w-24 rounded-full animate-shimmer ring-2 ring-background mb-4" />
            <div className="h-6 w-36 rounded animate-shimmer mb-2" />
            <div className="h-4 w-48 rounded animate-shimmer mb-4" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex border-b border-border px-5 py-3 gap-4 flex-shrink-0">
              <div className="h-4 w-20 rounded animate-shimmer" />
              <div className="h-4 w-16 rounded animate-shimmer" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="p-6">
        <EmptyState
          icon={UserPlus}
          title="User not found"
          action={<Button variant="outline" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-3.5 w-3.5 mr-1.5" />Go Back</Button>}
        />
      </div>
    );
  }

  const bannerStyle = visibleBannerUrl
    ? { backgroundImage: `url(${visibleBannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : undefined;

  return (
    <div className="flex flex-col h-full">
      <div className="relative h-36 border-b border-border overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary/30 via-primary/15 to-primary/5" style={bannerStyle}>
        <div className="absolute inset-0 bg-black/15" />
        <div className="absolute inset-0 bg-gradient-primary-tl" />
        <div className="absolute inset-0 bg-gradient-primary-br" />
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 left-3 z-10 glass-solid hover:glass-strong"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {isPreviewing && (
          <Button
            variant="outline"
            size="sm"
            className={`absolute top-3 right-3 z-10 glass-solid hover:glass-strong transition-all duration-200 ${
              stopPreviewAnimPhase === "hidden"
                ? "opacity-0 -translate-y-1 scale-95"
                : "opacity-100 translate-y-0 scale-100"
            }`}
            onClick={handleStopPreview}
          >
            Stop Preview
          </Button>
        )}
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-[320px] min-w-[320px] border-r border-border p-5">
          <div className="-mt-14 relative z-10 h-24 w-24 rounded-full border-4 border-background overflow-hidden ring-2 ring-primary/30 shadow-glow-primary-lg mb-4">
            <Avatar className="h-full w-full">
              <AvatarImage src={visibleAvatarUrl || ""} alt={profileUser.username} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold h-full w-full">
                {profileUser.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-xl font-heading font-bold truncate">{profileUser.username}</h1>
              {isOwnProfile && !isPreviewing && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  <Star className="h-3 w-3" />
                  You
                </span>
              )}
            </div>
          {isOwnProfile && !isPreviewing && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                resetEditDraft();
                setIsEditOpen(true);
              }}
            >
              Edit Profile
            </Button>
          )}
          </div>

          {visibleDisplayName && visibleDisplayName !== profileUser.username && (
            <p className="text-sm text-muted-foreground mb-2">{visibleDisplayName}</p>
          )}

          <p className="text-sm text-muted-foreground mb-3">
            {visibleBio.trim() || "No bio yet."}
          </p>

          <div className={`flex items-center text-sm pb-4 border-b border-border/50 ${showFriendActionRow ? "mb-4" : "mb-0"}`}>
            <button
              onClick={() => setActiveTab("posts")}
              className={`flex items-center gap-1.5 transition-colors cursor-pointer pb-1 border-b-2 ${
                activeTab === "posts"
                  ? "text-foreground border-b-primary"
                  : "text-muted-foreground hover:text-foreground border-b-transparent"
              }`}
            >
              <span className="font-semibold text-primary">{userPosts.length}</span>
              <span>Posts</span>
            </button>
            <span className="mx-3 text-border">&middot;</span>
            <button
              onClick={() => setActiveTab("friends")}
              className={`flex items-center gap-1.5 transition-colors cursor-pointer pb-1 border-b-2 ${
                activeTab === "friends"
                  ? "text-foreground border-b-primary"
                  : "text-muted-foreground hover:text-foreground border-b-transparent"
              }`}
            >
              <span className="font-semibold text-primary">{profileUserFriends.length}</span>
              <span>Friends</span>
            </button>
          </div>

          {!isOwnProfile && mutualFriends.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <AvatarGroup>
                {mutualFriends.slice(0, 3).map((friend: User) => (
                  <Avatar key={friend.id} size="xs" className="h-5 w-5">
                    <AvatarImage src={friend.avatar_url || ""} alt={friend.username} />
                    <AvatarFallback className="bg-muted text-muted-foreground text-[8px]">
                      {friend.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </AvatarGroup>
              <span className="text-xs text-muted-foreground">
                {mutualFriends.length} mutual friend{mutualFriends.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {showFriendActionRow && (
            <div className="mb-4">
              {isFriend ? (
                <Button onClick={handleUnfriend} size="sm" variant="outline" className="w-full">
                  <UserMinus className="h-4 w-4 mr-2" />
                  Unfriend
                </Button>
              ) : hasSentRequest ? (
                <Button onClick={handleCancelRequest} size="sm" variant="outline" className="w-full">
                  <UserMinus className="h-4 w-4 mr-2" />
                  Cancel Request
                </Button>
              ) : (
                <Button onClick={handleAddFriend} size="sm" className="w-full glow-primary">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Friend
                </Button>
              )}
            </div>
          )}

          <div className={`pt-4 ${showFriendActionRow ? "border-t border-border/50" : ""}`}>
            <div className="flex items-center gap-2 mb-3">
              <Music className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Musician</span>
            </div>
            {visibleInstruments.length === 0 && visibleGenres.length === 0 ? (
              <p className="text-xs text-muted-foreground">No musician profile yet.</p>
            ) : (
              <div className="space-y-2">
                {visibleInstruments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {visibleInstruments.map((instrument: string) => (
                      <span key={instrument} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {instrument}
                      </span>
                    ))}
                  </div>
                )}
                {visibleGenres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {visibleGenres.map((genre: string) => (
                      <span key={genre} className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium">
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {profileUser.created_at && (
            <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              <span>Member since {new Date(profileUser.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex border-b border-border flex-shrink-0">
            <button
              onClick={() => setActiveTab("posts")}
              className={`px-5 py-3 text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "posts"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Activities
            </button>
            <button
              onClick={() => setActiveTab("friends")}
              className={`px-5 py-3 text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "friends"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Friends
              <span className="ml-1.5 text-xs text-muted-foreground">({profileUserFriends.length})</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === "posts" ? (
              <>
                {activityPosts.length === 0 ? (
                  <EmptyState icon={Music} title="No recent activities" />
                ) : (
                  <div className="divide-y divide-border/50">
                    {activityPosts.map((post: FrontendPost) => (
                      <div key={post.id} className="hover:bg-foreground/[0.03] transition-colors">
                        <PostCard
                          post={post}
                          communityName={null}
                          isPlaying={playingAudioId === post.id}
                          isGuest={isGuest}
                          onAuthorClick={(u) => navigate(`/profile/${u}`)}
                          onPostClick={(pid) => navigate(`/post/${pid}`, { state: { backgroundLocation: location } })}
                          onLike={handleLikePost}
                          onPlayPause={() => setPlayingAudioId(playingAudioId === post.id ? null : post.id)}
                          formatTimeAgo={formatTimeAgo}
                        />
                      </div>
                    ))}
                  </div>
                )}
                {activityPosts.length > 0 && (
                  <LoadMoreButton
                    hasNextPage={hasMorePosts}
                    isFetchingNextPage={isLoadingMorePosts}
                    fetchNextPage={fetchMorePosts}
                  />
                )}
              </>
            ) : (
              <>
                {profileUserFriends.length === 0 ? (
                  <EmptyState icon={UserPlus} title="No friends yet" />
                ) : (
                  <div className="divide-y divide-border/50">
                    {profileUserFriends.map((friend: User) => (
                      <div
                        key={friend.id}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-foreground/[0.03] transition-colors cursor-pointer"
                        onClick={() => navigate(`/profile/${friend.username}`)}
                      >
                        <Avatar size="sm" className="h-10 w-10 ring-1 ring-border">
                          <AvatarImage src={friend.avatar_url || ""} alt={friend.username} />
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                            {friend.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{friend.username}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )}
                <LoadMoreButton
                  hasNextPage={hasMoreFriends}
                  isFetchingNextPage={isLoadingMoreFriends}
                  fetchNextPage={fetchMoreFriends}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto surface-elevated">
          <DialogHeader className="space-y-0">
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Banner</p>
              <div
                className="h-28 w-full rounded-lg border border-border glass-solid bg-cover bg-center"
                style={editBannerUrl ? { backgroundImage: `url(${editBannerUrl})` } : undefined}
              />
              <div className="flex items-center gap-2">
                <input
                  ref={bannerInputRef}
                  id="profile-banner-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePickImage("banner", file);
                    e.currentTarget.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => bannerInputRef.current?.click()}
                >
                  Select Banner
                </Button>
                {editBannerUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditBannerUrl("");
                      setPendingBannerFile(null);
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Avatar</p>
              <div className="flex items-center gap-3">
                <Avatar size="lg">
                  <AvatarImage src={editAvatarUrl || ""} alt={profileUser.username} />
                  <AvatarFallback>{profileUser.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <input
                  ref={avatarInputRef}
                  id="profile-avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePickImage("avatar", file);
                    e.currentTarget.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  Select Avatar
                </Button>
                {editAvatarUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditAvatarUrl("");
                      setPendingAvatarFile(null);
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Username</label>
              <div className="flex items-center gap-2">
                <Input
                  value={profileUser.username}
                  readOnly
                  disabled
                  className="opacity-100 bg-muted/50 border-transparent"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 px-3 text-xs"
                  onClick={() => navigate("/settings")}
                >
                  Change Username
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Display Name</label>
              <Input
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                maxLength={50}
                className="bg-muted/50 border-transparent focus:bg-background focus:border-border"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Bio</label>
              <Textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                maxLength={500}
                rows={4}
                className="bg-muted/50 border-transparent focus:bg-background focus:border-border"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Instruments ({editInstruments.length}/8)</p>
              <div className="flex flex-wrap gap-1.5">
                {editInstruments.map((instrument: string) => (
                  <button
                    key={instrument}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs"
                    onClick={() => toggleTag(instrument, editInstruments, setEditInstruments)}
                    type="button"
                  >
                    {instrument}
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sortedCatalogInstruments.map((instrument: string) => {
                  const selected = editInstruments.some((item) => item.toLowerCase() === instrument.toLowerCase());
                  return (
                    <button
                      key={instrument}
                      type="button"
                      onClick={() => toggleTag(instrument, editInstruments, setEditInstruments)}
                      disabled={!selected && editInstruments.length >= 8}
                      className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                        selected
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-background border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {instrument}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={customInstrument}
                  onChange={(e) => setCustomInstrument(e.target.value)}
                  placeholder="Add custom instrument"
                  maxLength={24}
                  className="bg-muted/50 border-transparent focus:bg-background focus:border-border"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addCustomTag(customInstrument, editInstruments, setEditInstruments, () => setCustomInstrument(""))}
                  disabled={!customInstrument.trim() || editInstruments.length >= 8}
                >
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Genres ({editGenres.length}/8)</p>
              <div className="flex flex-wrap gap-1.5">
                {editGenres.map((genre: string) => (
                  <button
                    key={genre}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-foreground text-xs"
                    onClick={() => toggleTag(genre, editGenres, setEditGenres)}
                    type="button"
                  >
                    {genre}
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sortedCatalogGenres.map((genre: string) => {
                  const selected = editGenres.some((item) => item.toLowerCase() === genre.toLowerCase());
                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => toggleTag(genre, editGenres, setEditGenres)}
                      disabled={!selected && editGenres.length >= 8}
                      className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                        selected
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-background border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={customGenre}
                  onChange={(e) => setCustomGenre(e.target.value)}
                  placeholder="Add custom genre"
                  maxLength={24}
                  className="bg-muted/50 border-transparent focus:bg-background focus:border-border"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addCustomTag(customGenre, editGenres, setEditGenres, () => setCustomGenre(""))}
                  disabled={!customGenre.trim() || editGenres.length >= 8}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          {editError && <p className="text-sm text-destructive">{editError}</p>}

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                resetEditDraft();
                setIsEditOpen(false);
              }}
              disabled={updateProfileMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="button" variant="outline" onClick={handlePreviewProfile} disabled={updateProfileMutation.isPending}>
              Preview
            </Button>
            <Button type="button" onClick={handleSaveProfile} disabled={updateProfileMutation.isPending || isUploading}>
              {isUploading ? "Uploading..." : updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Profile;
