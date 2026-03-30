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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
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
      </Routes>
    </BrowserRouter>
  );
}