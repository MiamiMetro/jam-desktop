interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="p-8 text-center text-muted-foreground">
      <p className="text-sm">{message}</p>
    </div>
  );
}

