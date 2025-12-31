import { Routes, Route, Navigate } from "react-router-dom";
import MainPage from "@/pages/MainPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/feed" replace />} />
      <Route path="/feed" element={<MainPage />} />
      <Route path="/jams" element={<MainPage />} />
      <Route path="/communities" element={<MainPage />} />
      <Route path="/community/:id" element={<MainPage />} />
      <Route path="/profile/:id" element={<MainPage />} />
      <Route path="/post/:id" element={<MainPage />} />
      <Route path="/jam/:id" element={<MainPage />} />
    </Routes>
  );
}

export default App;
