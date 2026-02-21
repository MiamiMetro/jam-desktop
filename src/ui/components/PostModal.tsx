// PostModal.tsx — Modal overlay for post detail when opened from feed
import { useEffect, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";

const Post = lazy(() => import("@/pages/Post"));

export default function PostModal() {
  const navigate = useNavigate();

  const handleClose = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  // Block scroll on everything behind the modal
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const modal = document.querySelector("[data-post-modal]");
      if (modal && !modal.contains(e.target as Node)) {
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={handleClose}
      />

      {/* Modal */}
      <div data-post-modal className="relative w-full max-w-2xl h-[85vh] bg-background rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-64">
              <Spinner className="size-6" />
            </div>
          }
        >
          <Post />
        </Suspense>
      </div>
    </div>
  );
}
