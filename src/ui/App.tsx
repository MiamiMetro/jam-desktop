import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import { useDeepLink } from "@/hooks/useDeepLink";

function App() {
  useDeepLink();

  // Clear jam room ID on app startup
  useEffect(() => {
    localStorage.removeItem("currentJamRoomId");
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/jams" replace />} />
      <Route path="/feed" element={<AppLayout />} />
      <Route path="/jams" element={<AppLayout />} />
      <Route path="/friends" element={<AppLayout />} />
      <Route path="/communities" element={<AppLayout />} />
      <Route path="/community/:id" element={<AppLayout />} />
      <Route path="/profile/:username" element={<AppLayout />} />
      <Route path="/post/:id" element={<AppLayout />} />
      <Route path="/jam/:id" element={<AppLayout />} />
    </Routes>
  );
}

export default App;
