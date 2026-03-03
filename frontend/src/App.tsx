import { BrowserRouter, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/public/LandingPage";
import LoginGov from "./pages/LoginGov";
import SignupGov from "./pages/SignupGov";
import Dashboard from "./pages/Dashboard";
import AdminLoginPage from "./pages/AdminLoginPage";
import VoterDashboard from "./pages/voter/VoterDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import VerificationPage from "./pages/public/VerificationPage";
import SystemStatusPage from "./pages/public/SystemStatusPage";
import NotificationContainer from "./components/common/NotificationContainer";

export default function App() {
  return (
    <>
      <NotificationContainer />
      <BrowserRouter>
        <Routes>
        {/* Landing & Auth Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginGov />} />
        <Route path="/signup" element={<SignupGov />} />

        {/* User Routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/voter/dashboard" element={<VoterDashboard />} />

        {/* Admin Routes */}
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/*" element={<AdminDashboard />} />

        {/* Verification & Status Routes */}
        <Route path="/verify" element={<VerificationPage />} />
        <Route path="/system-status" element={<SystemStatusPage />} />

        {/* 404 */}
        <Route path="*" element={<div style={{ padding: 26 }}>404 - Page Not Found</div>} />
      </Routes>
    </BrowserRouter>
    </>
  );
}
