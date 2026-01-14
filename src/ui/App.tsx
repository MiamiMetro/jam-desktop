import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MainPage from "@/pages/MainPage";
import { useEnsureProfile } from "./hooks/useEnsureProfile";

function App() {
  // This hook auto-creates account + profile after signup
  useEnsureProfile();

  useEffect(() => {
    localStorage.removeItem("currentJamRoomId");
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/feed" replace />} />
      <Route path="/feed" element={<MainPage />} />
      <Route path="/jams" element={<MainPage />} />
      <Route path="/communities" element={<MainPage />} />
      <Route path="/community/:id" element={<MainPage />} />
      <Route path="/profile/:username" element={<MainPage />} />
      <Route path="/post/:id" element={<MainPage />} />
      <Route path="/jam/:id" element={<MainPage />} />
    </Routes>
  );
}

export default App;
