// LoadingState.tsx — Centered loading indicator with spinner and glass container
import { Spinner } from "@/components/ui/spinner";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center py-16 animate-page-in">
      <div className="glass-solid rounded-xl px-8 py-6 flex flex-col items-center gap-3">
        <Spinner className="size-6 text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
