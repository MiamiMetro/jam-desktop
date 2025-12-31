import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import MainPage from "@/pages/MainPage";

const CoverExample = lazy(() => import("@/components/preview").then(module => ({ default: module.CoverExample })));

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/feed" replace />} />
      <Route path="/feed" element={<MainPage />} />
      <Route path="/jams" element={<MainPage />} />
      <Route path="/communities" element={<MainPage />} />
      <Route path="/community/:id" element={<MainPage />} />
      {/* Debug routes - accessible via direct URL but not shown in UI */}
      <Route
        path="/preview"
        element={
          <Suspense fallback={<div className="flex items-center justify-center p-8">Loading...</div>}>
            <CoverExample />
          </Suspense>
        }
      />
    </Routes>
  );
}

export default App;
