import type { ComponentType } from "react";

interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="p-8 text-center text-muted-foreground">
      <Icon className="h-12 w-12 mx-auto mb-3 opacity-50" />
      <p className="text-sm">{title}</p>
      {description && (
        <p className="text-xs mt-1">{description}</p>
      )}
    </div>
  );
}

