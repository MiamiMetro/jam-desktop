import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateCommunity, useCommunityCreatedCount } from "@/hooks/useCommunities";
import { COMMUNITY_THEME_COLOR_KEYS, COMMUNITY_TAGS, getCommunityColors } from "@/lib/communityColors";

interface CreateCommunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toHandle(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}

export function CreateCommunityDialog({ open, onOpenChange }: CreateCommunityDialogProps) {
  const navigate = useNavigate();
  const createMutation = useCreateCommunity();
  const createdCount = useCommunityCreatedCount();

  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");
  const [themeColor, setThemeColor] = useState<string>("purple");
  const [tags, setTags] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingBannerFile, setPendingBannerFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  const atLimit = createdCount >= 3;

  const handleNameChange = (value: string) => {
    setName(value);
    setHandle(toHandle(value));
  };

  const handlePickImage = (kind: "avatar" | "banner", file: File) => {
    const objectUrl = URL.createObjectURL(file);
    if (kind === "avatar") {
      setPendingAvatarFile(file);
      setAvatarUrl(objectUrl);
    } else {
      setPendingBannerFile(file);
      setBannerUrl(objectUrl);
    }
  };

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 5 ? [...prev, tag] : prev
    );
  };

  const handleSubmit = async () => {
    if (!name.trim() || !handle.trim()) return;
    setError(null);
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        handle: handle.trim(),
        description: description.trim() || undefined,
        themeColor,
        tags,
        avatarFile: pendingAvatarFile,
        bannerFile: pendingBannerFile,
      });
      onOpenChange(false);
      navigate(`/community/${handle.trim()}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create community.");
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setName("");
      setHandle("");
      setDescription("");
      setThemeColor("purple");
      setTags([]);
      setAvatarUrl("");
      setBannerUrl("");
      setPendingAvatarFile(null);
      setPendingBannerFile(null);
      setError(null);
    }
    onOpenChange(val);
  };

  const colors = getCommunityColors(themeColor);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden surface-elevated">
        <DialogHeader className="space-y-0">
          <DialogTitle>Create Community</DialogTitle>
        </DialogHeader>

        {atLimit && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            You've reached the limit of 3 owned communities.
          </p>
        )}

        <div className="space-y-4 w-full min-w-0">
          {/* Banner */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Banner</p>
            <div
              className="h-24 w-full rounded-lg border border-border glass-solid bg-cover bg-center"
              style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
            />
            <div className="flex items-center gap-2">
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePickImage("banner", file);
                  e.currentTarget.value = "";
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => bannerInputRef.current?.click()}>
                Select Banner
              </Button>
              {bannerUrl && (
                <Button type="button" size="sm" variant="ghost" onClick={() => { setBannerUrl(""); setPendingBannerFile(null); }}>
                  Remove
                </Button>
              )}
            </div>
          </div>

          {/* Avatar */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Avatar</p>
            <div className="flex items-center gap-3">
              <Avatar size="lg" className={`ring-2 ${colors.ring}`}>
                <AvatarImage src={avatarUrl || ""} alt={name || "Community"} />
                <AvatarFallback className={`${colors.avatarBg} ${colors.text} font-bold`}>
                  {name ? name.substring(0, 2).toUpperCase() : "JM"}
                </AvatarFallback>
              </Avatar>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePickImage("avatar", file);
                  e.currentTarget.value = "";
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()}>
                Select Avatar
              </Button>
              {avatarUrl && (
                <Button type="button" size="sm" variant="ghost" onClick={() => { setAvatarUrl(""); setPendingAvatarFile(null); }}>
                  Remove
                </Button>
              )}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Name *</label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              maxLength={50}
              placeholder="Community name"
              className="bg-muted/50 border-transparent focus:bg-background focus:border-border"
            />
          </div>

          {/* Handle */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Handle *</label>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground">#</span>
              <Input
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30))}
                maxLength={30}
                placeholder="handle"
                className="bg-muted/50 border-transparent focus:bg-background focus:border-border"
              />
            </div>
            <p className="text-xs text-muted-foreground/60">Used in URLs: /community/{handle || "handle"}</p>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="What's this community about?"
              className="bg-muted/50 border-transparent focus:bg-background focus:border-border"
            />
          </div>

          {/* Theme Color */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Theme Color</p>
            <div className="flex flex-wrap gap-2">
              {COMMUNITY_THEME_COLOR_KEYS.map((key) => {
                const c = getCommunityColors(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setThemeColor(key)}
                    className={`h-7 w-7 rounded-full transition-all ${c.avatarBg} ${
                      themeColor === key ? `ring-2 ring-offset-2 ring-offset-background ${c.ring}` : ""
                    }`}
                    title={key}
                  />
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Tags ({tags.length}/5)</p>
            <div className="flex flex-wrap gap-1.5">
              {COMMUNITY_TAGS.map((tag) => {
                const selected = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    disabled={!selected && tags.length >= 5}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      selected
                        ? `${colors.badgeBg} ${colors.text} border-current/20`
                        : "bg-background border-border text-muted-foreground hover:text-foreground disabled:opacity-40"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="glow-primary"
              disabled={!name.trim() || !handle.trim() || createMutation.isPending || atLimit}
              onClick={handleSubmit}
            >
              {createMutation.isPending ? "Creating..." : "Create Community"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
