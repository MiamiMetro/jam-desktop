import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
          <div className="rounded-2xl glass-strong px-10 py-8 flex flex-col items-center gap-3 max-w-sm">
            <div className="text-3xl">:(</div>
            <h2 className="text-base font-heading font-semibold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This page couldn't be loaded. It may not exist or something unexpected happened.
            </p>
            <button
              onClick={() => { window.location.href = window.location.origin; }}
              className="mt-1 text-sm text-primary hover:underline cursor-pointer"
            >
              Go home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
