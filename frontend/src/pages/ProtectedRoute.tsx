// src/pages/ProtectedRoute.tsx
import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";

const API_URL =
  (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000/api";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "ok" | "no">("loading");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/me`, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });
        setState(res.status === 401 || res.status === 403 ? "no" : "ok");
      } catch {
        setState("no");
      }
    })();
  }, []);

  if (state === "loading") {
    return (
      <div style={{ padding: 24, color: "#fff", background: "#050505", minHeight: "100vh" }}>
        Loading…
      </div>
    );
  }

  if (state === "no") return <Navigate to="/login" replace />;
  return <>{children}</>;
}