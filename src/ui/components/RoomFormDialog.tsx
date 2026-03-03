// RoomFormDialog.tsx — Shared create/edit room dialog with glass styling
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Globe, Lock, Minus, Plus } from "lucide-react";
import { ROOM_GENRES } from "@/hooks/useRooms";

export interface RoomFormData {
  handle: string;
  name: string;
  description: string;
  genre: string;
  maxPerformers: number;
  isPrivate: boolean;
}

const EMPTY_FORM: RoomFormData = {
  handle: "",
  name: "",
  description: "",
  genre: "",
  maxPerformers: 5,
  isPrivate: false,
};

interface RoomFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: RoomFormData) => void;
  isPending?: boolean;
  mode: "create" | "edit";
  initialData?: RoomFormData;
}

function RoomFormBody({
  initialData,
  onSubmit,
  isPending,
  isCreate,
}: {
  initialData: RoomFormData;
  onSubmit: (data: RoomFormData) => void;
  isPending: boolean;
  isCreate: boolean;
}) {
  const [form, setForm] = useState<RoomFormData>(initialData);

  const submitLabel = isCreate
    ? isPending ? "Creating..." : "Create Room"
    : isPending ? "Saving..." : "Save Changes";

  return (
    <>
      <div className="space-y-4 py-2">
        {isCreate && (
          <div className="space-y-1.5">
            <Label htmlFor="room-handle" className="text-xs font-medium text-muted-foreground">Handle</Label>
            <div className="flex items-center gap-0">
              <span className="px-3 py-2 text-xs text-muted-foreground bg-muted/30 border border-r-0 border-transparent rounded-l-md">jam/</span>
              <Input
                id="room-handle"
                placeholder="chill-vibes"
                value={form.handle}
                onChange={(e) => setForm({ ...form, handle: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                className="bg-muted/50 border-transparent focus:bg-background focus:border-border rounded-l-none"
              />
            </div>
            <p className="text-[11px] text-muted-foreground/60">Permanent URL handle. Letters, numbers, hyphens, underscores.</p>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="room-name" className="text-xs font-medium text-muted-foreground">Room Name</Label>
          <Input
            id="room-name"
            placeholder="e.g., Chill Vibes"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="bg-muted/50 border-transparent focus:bg-background focus:border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="room-description" className="text-xs font-medium text-muted-foreground">Description <span className="text-muted-foreground/50">(Optional)</span></Label>
          <Textarea
            id="room-description"
            placeholder="What's this room about?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="bg-muted/50 border-transparent focus:bg-background focus:border-border resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Genre <span className="text-muted-foreground/50">(Optional)</span></Label>
          <div className="flex gap-1.5 flex-wrap">
            {ROOM_GENRES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setForm({ ...form, genre: form.genre === g ? "" : g })}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                  form.genre === g
                    ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                    : "glass-solid text-muted-foreground hover:text-foreground hover:ring-1 hover:ring-primary/20"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Max Performers</Label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, maxPerformers: Math.max(2, form.maxPerformers - 1) })}
              className="h-9 w-9 flex items-center justify-center rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-8 text-center text-sm font-medium tabular-nums">{form.maxPerformers}</span>
            <button
              type="button"
              onClick={() => setForm({ ...form, maxPerformers: Math.min(7, form.maxPerformers + 1) })}
              className="h-9 w-9 flex items-center justify-center rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setForm({ ...form, isPrivate: false })}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer ${
              !form.isPrivate
                ? "glass-strong ring-1 ring-primary/30 text-foreground"
                : "glass-solid text-muted-foreground hover:text-foreground hover:ring-1 hover:ring-border"
            }`}
          >
            <Globe className={`h-4 w-4 flex-shrink-0 ${!form.isPrivate ? "text-primary" : ""}`} />
            <div className="text-left">
              <p className="text-sm font-medium">Public</p>
              <p className="text-[11px] text-muted-foreground/60">Anyone can join</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, isPrivate: true })}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer ${
              form.isPrivate
                ? "glass-strong ring-1 ring-primary/30 text-foreground"
                : "glass-solid text-muted-foreground hover:text-foreground hover:ring-1 hover:ring-border"
            }`}
          >
            <Lock className={`h-4 w-4 flex-shrink-0 ${form.isPrivate ? "text-primary" : ""}`} />
            <div className="text-left">
              <p className="text-sm font-medium">Private</p>
              <p className="text-[11px] text-muted-foreground/60">Friends only</p>
            </div>
          </button>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <DialogClose render={<Button variant="outline" />}>
          Cancel
        </DialogClose>
        <Button
          onClick={() => onSubmit(form)}
          disabled={!form.name.trim() || (isCreate && !form.handle.trim()) || isPending}
        >
          {submitLabel}
        </Button>
      </div>
    </>
  );
}

export function RoomFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
  mode,
  initialData,
}: RoomFormDialogProps) {
  const isCreate = mode === "create";
  const title = isCreate ? "Create Your Room" : "Edit Room Settings";
  const description = isCreate
    ? "Create your personal jam room. You can only have one room, but you can manage its settings anytime."
    : "Update your room settings. Changes will apply immediately.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <RoomFormBody
          initialData={initialData ?? EMPTY_FORM}
          onSubmit={onSubmit}
          isPending={isPending}
          isCreate={isCreate}
        />
      </DialogContent>
    </Dialog>
  );
}
