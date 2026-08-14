import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginGov from "./pages/LoginGov";
import SignupGov from "./pages/SignupGov";
import Dashboard from "./pages/Dashboard";
import ElectionsPage from "./pages/ElectionsPage";
import BallotPage from "./pages/BallotPage";
import ReceiptPage from "./pages/ReceiptPage";
import VerifyVotePage from "./pages/VerifyVotePage";
import VoterVerificationPage from "./pages/VoterVerificationPage";
import ProtectedRoute from "./pages/ProtectedRoute";

import AdminRoute from "./pages/admin/AdminRoute";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminElections from "./pages/admin/AdminElections";
import AdminElectionDetail from "./pages/admin/AdminElectionDetail";
import AdminResults from "./pages/admin/AdminResults";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginGov />} />
        <Route path="/signup" element={<SignupGov />} />

        {/* Dashboard is the main/landing page; it renders a guest view
            (with Sign in / Sign up) when there is no active session. */}
        <Route path="/dashboard" element={<Dashboard />} />

        <Route
          path="/verify-voter"
          element={
            <ProtectedRoute>
              <VoterVerificationPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/elections"
          element={
            <ProtectedRoute>
              <ElectionsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/elections/:electionId/ballot"
          element={
            <ProtectedRoute>
              <BallotPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/receipt/:hash"
          element={
            <ProtectedRoute>
              <ReceiptPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/verify"
          element={
            <ProtectedRoute>
              <VerifyVotePage />
            </ProtectedRoute>
          }
        />

        {/* Admin panel (role-guarded on both client and server) */}
        <Route path="/admin" element={<AdminRoute><AdminOverview /></AdminRoute>} />
        <Route path="/admin/elections" element={<AdminRoute><AdminElections /></AdminRoute>} />
        <Route
          path="/admin/elections/:electionId"
          element={<AdminRoute><AdminElectionDetail /></AdminRoute>}
        />
        <Route path="/admin/results" element={<AdminRoute><AdminResults /></AdminRoute>} />
      </Routes>
    </BrowserRouter>
  );
}