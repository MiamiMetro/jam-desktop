// App.tsx — Root routing with layout route pattern + post modal overlay
import { lazy, useEffect, Suspense } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import { useDeepLink } from "@/hooks/useDeepLink";

const FeedTab = lazy(() => import("@/components/FeedTab"));
const JamsTab = lazy(() => import("@/components/JamsTab"));
const FriendsTab = lazy(() => import("@/components/FriendsTab"));
const CommunitiesTab = lazy(() => import("@/components/CommunitiesTab"));
const Profile = lazy(() => import("@/pages/Profile"));
const Settings = lazy(() => import("@/pages/Settings"));
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

function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
      <div className="rounded-2xl glass-strong px-10 py-8 flex flex-col items-center gap-3 max-w-sm">
        <div className="text-4xl font-heading font-bold text-muted-foreground">404</div>
        <h2 className="text-base font-heading font-semibold">Page not found</h2>
        <p className="text-sm text-muted-foreground">This page doesn't exist or has been moved.</p>
        <button
          onClick={() => navigate("/", { replace: true })}
          className="mt-1 text-sm text-primary hover:underline cursor-pointer"
        >
          Go home
        </button>
      </div>
    </div>
  );
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
          <Route path="/settings" element={<Settings />} />
          <Route path="/post/:id" element={<Post />} />
          <Route path="/jam/:id" element={<JamRouteSlot />} />
          <Route path="*" element={<NotFound />} />
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
