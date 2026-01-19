import { Button } from "./ui/button";

interface LoadMoreButtonProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

export function LoadMoreButton({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: LoadMoreButtonProps) {
  if (!hasNextPage) {
    return (
      // <div className="flex justify-center py-4" role="status" aria-live="polite">
      //   No more items to load
      // </div>
      null
    );
  }

  return (
    <div className="flex justify-center py-4">
      <Button
        onClick={fetchNextPage}
        disabled={isFetchingNextPage}
        variant="default"
        size="default"
      >
        {isFetchingNextPage ? "Loading..." : "Load More"}
      </Button>
    </div>
  );
}
