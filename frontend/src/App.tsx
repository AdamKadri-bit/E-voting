import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginGov from "./pages/LoginGov";
import SignupGov from "./pages/SignupGov";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./pages/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginGov />} />
        <Route path="/signup" element={<SignupGov />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<div style={{ padding: 26 }}>404</div>} />
      </Routes>
    </BrowserRouter>
  );
}