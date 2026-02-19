// RoomFormDialog.tsx — Shared create/edit room dialog with glass styling
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Lock } from "lucide-react";

export interface RoomFormData {
  name: string;
  description: string;
  genre: string;
  maxParticipants: number;
  isPrivate: boolean;
}

const EMPTY_FORM: RoomFormData = {
  name: "",
  description: "",
  genre: "",
  maxParticipants: 8,
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

export function RoomFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
  mode,
  initialData,
}: RoomFormDialogProps) {
  const [form, setForm] = useState<RoomFormData>(initialData ?? EMPTY_FORM);

  useEffect(() => {
    if (open) {
      setForm(initialData ?? EMPTY_FORM);
    }
  }, [open, initialData]);

  const isCreate = mode === "create";
  const title = isCreate ? "Create Your Room" : "Edit Room Settings";
  const description = isCreate
    ? "Create your personal jam room. You can only have one room, but you can manage its settings anytime."
    : "Update your room settings. Changes will apply immediately.";
  const submitLabel = isCreate
    ? isPending ? "Creating..." : "Create Room"
    : isPending ? "Saving..." : "Save Changes";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading">{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="room-name">Room Name</Label>
            <Input
              id="room-name"
              placeholder="e.g., Chill Vibes"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="room-description">Description (Optional)</Label>
            <Textarea
              id="room-description"
              placeholder="What's this room about?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="room-genre">Genre (Optional)</Label>
            <Input
              id="room-genre"
              placeholder="e.g., Lo-Fi, Rock, Electronic"
              value={form.genre}
              onChange={(e) => setForm({ ...form, genre: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="room-max">Max Participants</Label>
            <Input
              id="room-max"
              type="number"
              min="2"
              max="20"
              value={form.maxParticipants}
              onChange={(e) => setForm({ ...form, maxParticipants: parseInt(e.target.value) || 8 })}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg glass px-4 py-3">
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <Label htmlFor="room-private" className="cursor-pointer text-sm">
                Private Room
              </Label>
            </div>
            <Switch
              id="room-private"
              checked={form.isPrivate}
              onCheckedChange={(checked: boolean) => setForm({ ...form, isPrivate: checked })}
              size="sm"
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onSubmit(form)}
            disabled={!form.name.trim() || isPending}
          >
            {submitLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
