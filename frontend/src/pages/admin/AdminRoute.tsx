import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";

const API_URL =
  (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000/api";

/**
 * Guards admin pages: requires an authenticated session whose user role is
 * "admin". Non-admins are sent to the dashboard; guests to login.
 * (The server also enforces this on every /admin route.)
 */
export default function AdminRoute({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "admin" | "notAdmin" | "guest">(
    "loading"
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/me`, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });
        if (res.status === 401 || res.status === 403) {
          setState("guest");
          return;
        }
        const data = await res.json().catch(() => null);
        setState(data?.user?.role === "admin" ? "admin" : "notAdmin");
      } catch {
        setState("guest");
      }
    })();
  }, []);

  if (state === "loading") {
    return (
      <div
        style={{
          padding: 24,
          color: "var(--gov-ink, #fff)",
          background: "var(--gov-bg, #050505)",
          minHeight: "100vh",
        }}
      >
        Loading…
      </div>
    );
  }

  if (state === "guest") return <Navigate to="/admin/login" replace />;
  if (state === "notAdmin") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
