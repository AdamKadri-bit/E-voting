import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginGov from "./pages/LoginGov";
import SignupGov from "./pages/SignupGov";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginGov />} />
        <Route path="/signup" element={<SignupGov />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<div style={{ padding: 26 }}>404</div>} />
      </Routes>
    </BrowserRouter>
  );
}
