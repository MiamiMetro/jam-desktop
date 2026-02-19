// EmptyState.tsx — Empty state with glass background, muted icon, and optional action button
import type { ComponentType, ReactNode } from "react";

interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center py-16 animate-page-in">
      <div className="glass rounded-xl px-8 py-6 flex flex-col items-center gap-3 max-w-xs text-center">
        <Icon className="h-10 w-10 text-primary/40 animate-float" />
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground/70">{description}</p>
        )}
        {action && <div className="mt-1">{action}</div>}
      </div>
    </div>
  );
}
