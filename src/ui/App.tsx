// App.tsx — Root routing with layout route pattern + post modal overlay
import { lazy, useEffect, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import { useDeepLink } from "@/hooks/useDeepLink";

const FeedTab = lazy(() => import("@/components/FeedTab"));
const JamsTab = lazy(() => import("@/components/JamsTab"));
const FriendsTab = lazy(() => import("@/components/FriendsTab"));
const CommunitiesTab = lazy(() => import("@/components/CommunitiesTab"));
const Profile = lazy(() => import("@/pages/Profile"));
const Post = lazy(() => import("@/pages/Post"));
const PostModal = lazy(() => import("@/components/PostModal"));

// Redirect from "/" — check if there's a saved return path from auth flow
function RootRedirect() {
  const returnPath = sessionStorage.getItem("auth_return_path");
  return <Navigate to={returnPath || "/jams"} replace />;
}

// Empty placeholder for /jam/:id route — JamRoom is rendered separately for persistence
function JamRouteSlot() {
  return null;
}

function App() {
  useDeepLink();
  const location = useLocation();
  const backgroundLocation = (location.state as any)?.backgroundLocation;

  // Clear jam room ID on app startup
  useEffect(() => {
    localStorage.removeItem("currentJamRoomId");
  }, []);

  return (
    <>
      <Routes location={backgroundLocation || location}>
        <Route path="/" element={<RootRedirect />} />
        <Route element={<AppLayout />}>
          <Route path="/feed" element={<FeedTab />} />
          <Route path="/jams" element={<JamsTab />} />
          <Route path="/friends" element={<FriendsTab />} />
          <Route path="/communities" element={<CommunitiesTab />} />
          <Route path="/community/:id" element={<CommunitiesTab />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/post/:id" element={<Post />} />
          <Route path="/jam/:id" element={<JamRouteSlot />} />
        </Route>
      </Routes>

      {/* Post modal — rendered on top when navigating from feed */}
      {backgroundLocation && (
        <Suspense fallback={null}>
          <Routes>
            <Route path="/post/:id" element={<PostModal />} />
          </Routes>
        </Suspense>
      )}
    </>
  );
}

export default App;
