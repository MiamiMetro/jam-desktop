// MainContent.tsx — Content area with React Router Outlet + persistent JamRoom
import { useEffect, useRef, lazy, Suspense } from "react";
import { useLocation, Outlet } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useUIStore } from "@/stores/uiStore";

const JamRoom = lazy(() => import("@/pages/JamRoom"));

export default function MainContent() {
  const location = useLocation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isOnJamRoute = location.pathname.startsWith("/jam/");

  // Jam room persistence — keep JamRoom mounted when navigating away
  const jamRoomMatch = location.pathname.match(/^\/jam\/(.+)$/);
  const urlRoomHandle = jamRoomMatch ? jamRoomMatch[1] : null;

  const currentJamRoomHandle = useUIStore((s) => s.currentJamRoomHandle);
  const setCurrentJamRoomHandle = useUIStore((s) => s.setCurrentJamRoomHandle);

  const jamRoomHandle = urlRoomHandle || currentJamRoomHandle;

  // Only set the store when ENTERING a room (URL changes to a new room handle).
  // Don't re-set when store was explicitly cleared by leave handler.
  const prevUrlRoomHandle = useRef<string | null>(null);
  useEffect(() => {
    if (urlRoomHandle && urlRoomHandle !== prevUrlRoomHandle.current) {
      setCurrentJamRoomHandle(urlRoomHandle);
    }
    prevUrlRoomHandle.current = urlRoomHandle;
  }, [urlRoomHandle, setCurrentJamRoomHandle]);

  useScrollRestoration(scrollContainerRef as React.RefObject<HTMLElement>);

  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <Spinner className="size-6" />
        </div>
      }
    >
      <div className="flex-1 relative">
        {/* Regular pages — rendered via React Router Outlet with page transition */}
        <div
          ref={scrollContainerRef}
          className="absolute inset-0 overflow-y-auto"
          style={{ display: isOnJamRoute ? "none" : "block" }}
        >
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </div>

        {/* JamRoom — kept mounted when active, hidden when on other pages */}
        {jamRoomHandle && (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ display: isOnJamRoute ? "block" : "none" }}
          >
            <JamRoom roomHandle={jamRoomHandle} />
          </div>
        )}
      </div>
    </Suspense>
  );
}
