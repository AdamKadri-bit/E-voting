import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import LoginGov from "./pages/LoginGov";
import SignupGov from "./pages/SignupGov";
import Dashboard from "./pages/Dashboard";
import ElectionsPage from "./pages/ElectionsPage";
import BallotPage from "./pages/BallotPage";
import ReceiptPage from "./pages/ReceiptPage";
import VerifyVotePage from "./pages/VerifyVotePage";
import ProtectedRoute from "./pages/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
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
          path="/receipt/:receiptHash"
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

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}