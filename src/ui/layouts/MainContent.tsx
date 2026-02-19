// MainContent.tsx — Main content area with route-based rendering
import { useEffect, useRef, useState, startTransition, lazy, Suspense, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { useJam } from "@/hooks/useJams";

const FeedTab = lazy(() => import("@/components/FeedTab"));
const JamsTab = lazy(() => import("@/components/JamsTab"));
const FriendsTab = lazy(() => import("@/components/FriendsTab"));
const CommunitiesTab = lazy(() => import("@/components/CommunitiesTab"));
const Profile = lazy(() => import("@/pages/Profile"));
const Post = lazy(() => import("@/pages/Post"));
const JamRoom = lazy(() => import("@/pages/JamRoom"));

export default function MainContent() {
  const location = useLocation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Jam room persistence (same logic from MainPage)
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
        {/* Regular pages */}
        <div
          ref={scrollContainerRef}
          className="absolute inset-0 overflow-y-auto"
          style={{ display: location.pathname.startsWith("/jam/") ? "none" : "block" }}
        >
          {location.pathname === "/feed" && <FeedTab />}
          {location.pathname === "/jams" && <JamsTab />}
          {location.pathname === "/friends" && <FriendsTab />}
          {(location.pathname.startsWith("/community/") || location.pathname === "/communities") && <CommunitiesTab />}
          {location.pathname.startsWith("/profile/") && <Profile />}
          {location.pathname.startsWith("/post/") && <Post />}
        </div>
        {/* JamRoom — kept mounted when active */}
        {jamRoomId && (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ display: location.pathname.startsWith("/jam/") ? "block" : "none" }}
          >
            <JamRoom roomId={jamRoomId} />
          </div>
        )}
      </div>
    </Suspense>
  );
}
