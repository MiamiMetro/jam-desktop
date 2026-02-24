// MainContent.tsx — Content area with React Router Outlet + persistent JamRoom
import { useEffect, useRef, useState, startTransition, lazy, Suspense } from "react";
import { useLocation, Outlet } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const JamRoom = lazy(() => import("@/pages/JamRoom"));

export default function MainContent() {
  const location = useLocation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isOnJamRoute = location.pathname.startsWith("/jam/");

  // Jam room persistence — keep JamRoom mounted when navigating away
  const jamRoomMatch = location.pathname.match(/^\/jam\/(.+)$/);
  const urlRoomId = jamRoomMatch ? jamRoomMatch[1] : null;

  const [persistedRoomId, setPersistedRoomId] = useState<string | null>(() => {
    return localStorage.getItem("currentJamRoomId");
  });

  const jamRoomId = urlRoomId || persistedRoomId;

  useEffect(() => {
    if (urlRoomId && urlRoomId !== persistedRoomId) {
      localStorage.setItem("currentJamRoomId", urlRoomId);
      startTransition(() => {
        setPersistedRoomId(urlRoomId);
      });
    }
  }, [urlRoomId, persistedRoomId]);

  useEffect(() => {
    const storedRoomId = localStorage.getItem("currentJamRoomId");
    if (storedRoomId !== persistedRoomId) {
      startTransition(() => {
        setPersistedRoomId(storedRoomId);
      });
    }
  }, [location.pathname]);

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
        {jamRoomId && (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ display: isOnJamRoute ? "block" : "none" }}
          >
            <JamRoom roomId={jamRoomId} />
          </div>
        )}
      </div>
    </Suspense>
  );
}
