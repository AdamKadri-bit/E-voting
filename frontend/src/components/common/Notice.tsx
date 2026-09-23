import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";

type Kind = "info" | "ok" | "warn" | "error";

const ICONS: Record<Kind, ReactNode> = {
  info: <Info size={18} color="#60a5fa" />,
  ok: <CheckCircle2 size={18} color="#47a76f" />,
  warn: <TriangleAlert size={18} color="#d97706" />,
  error: <AlertCircle size={18} color="#f87171" />,
};

/** Inline banner used for status messages across the voting pages. */
export default function Notice({ kind = "info", children, role }: { kind?: Kind; children: ReactNode; role?: string }) {
  return (
    <div className={`gv-notice ${kind}`} role={role ?? (kind === "error" ? "alert" : "status")}>
      <span style={{ flexShrink: 0, marginTop: 2 }}>{ICONS[kind]}</span>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}
