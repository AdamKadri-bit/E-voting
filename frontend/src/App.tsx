import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginGov from "./pages/LoginGov";
import SignupGov from "./pages/SignupGov";
import Dashboard from "./pages/Dashboard";
import ElectionsPage from "./pages/ElectionsPage";
import BallotPage from "./pages/BallotPage";
import ReceiptPage from "./pages/ReceiptPage";
import E2eReceiptPage from "./pages/E2eReceiptPage";
import VerifyVotePage from "./pages/VerifyVotePage";
import VerifierPage from "./pages/VerifierPage";
import VoterVerificationPage from "./pages/VoterVerificationPage";
import VoterStatusPage from "./pages/VoterStatusPage";
import ProfilePage from "./pages/ProfilePage";
import BoardIndexPage from "./pages/BoardIndexPage";
import BoardPage from "./pages/BoardPage";
import ElectionPublicPage from "./pages/ElectionPublicPage";
import TrusteeHomePage from "./pages/trustee/TrusteeHomePage";
import KeyCeremonyPage from "./pages/trustee/KeyCeremonyPage";
import DecryptionPage from "./pages/trustee/DecryptionPage";
import ProtectedRoute from "./pages/ProtectedRoute";

import AdminRoute from "./pages/admin/AdminRoute";
import AdminLogin from "./pages/admin/AdminLogin";
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

        {/* Mandatory resident/diaspora step right after sign-in. */}
        <Route path="/voter-status" element={<ProtectedRoute skipStatusGate><VoterStatusPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute skipStatusGate><ProfilePage /></ProtectedRoute>} />

        <Route path="/verify-voter" element={<ProtectedRoute><VoterVerificationPage /></ProtectedRoute>} />
        <Route path="/elections" element={<ProtectedRoute><ElectionsPage /></ProtectedRoute>} />
        <Route path="/elections/:electionId/ballot" element={<ProtectedRoute><BallotPage /></ProtectedRoute>} />
        <Route path="/elections/:electionId/receipt/:code" element={<ProtectedRoute><E2eReceiptPage /></ProtectedRoute>} />

        {/* Historical receipts from the legacy ballot system. */}
        <Route path="/receipt/:hash" element={<ProtectedRoute><ReceiptPage /></ProtectedRoute>} />
        <Route path="/verify/receipt" element={<ProtectedRoute><VerifyVotePage /></ProtectedRoute>} />

        {/* Public: anyone can check the election. */}
        <Route path="/verify" element={<VerifierPage />} />
        <Route path="/board" element={<BoardIndexPage />} />
        <Route path="/board/:electionId" element={<BoardPage />} />
        <Route path="/results/:electionId" element={<ElectionPublicPage />} />

        {/* Trustees (any signed-in account holding a trustee seat). */}
        <Route path="/trustee" element={<ProtectedRoute skipStatusGate><TrusteeHomePage /></ProtectedRoute>} />
        <Route path="/trustee/elections/:electionId/keys" element={<ProtectedRoute skipStatusGate><KeyCeremonyPage /></ProtectedRoute>} />
        <Route path="/trustee/elections/:electionId/decrypt" element={<ProtectedRoute skipStatusGate><DecryptionPage /></ProtectedRoute>} />

        {/* Admin panel (role-guarded on both client and server) */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminRoute><AdminOverview /></AdminRoute>} />
        <Route path="/admin/elections" element={<AdminRoute><AdminElections /></AdminRoute>} />
        <Route path="/admin/elections/:electionId" element={<AdminRoute><AdminElectionDetail /></AdminRoute>} />
        <Route path="/admin/results" element={<AdminRoute><AdminResults /></AdminRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
