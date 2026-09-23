// src/pages/ProtectedRoute.tsx
import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

/**
 * Requires a session. Voters who haven't chosen resident/diaspora yet are sent
 * to that mandatory step first (except on the status and profile pages
 * themselves), so the choice happens right after sign-in.
 */
export default function ProtectedRoute({ children, skipStatusGate = false }: { children: ReactNode; skipStatusGate?: boolean }) {
  // The verdict is tied to the path it was computed for: React reuses this
  // component across routes, and a stale verdict would redirect wrongly.
  const [verdict, setVerdict] = useState<{ path: string; state: "ok" | "no" | "status" } | null>(null);
  const loc = useLocation();
  const setState = (state: "ok" | "no" | "status") => setVerdict({ path: loc.pathname, state });
  const state = verdict && verdict.path === loc.pathname ? verdict.state : "loading";

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/me`, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });
        if (res.status === 401 || res.status === 403) {
          setState("no");
          return;
        }
        const j = await res.json().catch(() => null);
        setState(!skipStatusGate && j?.user?.voter_status?.required ? "status" : "ok");
      } catch {
        setState("no");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipStatusGate, loc.pathname]);

  if (state === "loading") {
    return (
      <div style={{ padding: 24, color: "var(--gov-ink)", background: "var(--gov-bg)", minHeight: "100vh" }}>
        Loading…
      </div>
    );
  }

  if (state === "no") return <Navigate to="/login" replace />;
  if (state === "status") return <Navigate to="/voter-status" replace state={{ next: loc.pathname }} />;
  return <>{children}</>;
}
