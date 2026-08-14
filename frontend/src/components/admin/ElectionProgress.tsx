import { useEffect, useState } from "react";
import { STATUS_COLORS } from "./statusColors";

const STEPS: { key: "draft" | "active" | "closed"; label: string }[] = [
  { key: "draft", label: "Draft" },
  { key: "active", label: "Active" },
  { key: "closed", label: "Closed" },
];

/** Small draft → active → closed lifecycle indicator. */
export function ElectionStatusStepper({ status }: { status: string }) {
  const currentIndex = STEPS.findIndex((s) => s.key === status);

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {STEPS.map((step, i) => {
        const reached = i <= currentIndex;
        const color = STATUS_COLORS[step.key];
        return (
          <div key={step.key} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: reached ? color : "transparent",
                  border: `1px solid ${reached ? color : "var(--gov-edge)"}`,
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: i === currentIndex ? 800 : 600,
                  color: reached ? color : "var(--gov-muted)",
                }}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  width: 18,
                  height: 2,
                  margin: "0 6px",
                  background: i < currentIndex ? STATUS_COLORS[STEPS[i + 1].key] : "var(--gov-edge)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (days || hours) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(" ");
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
      <div style={{ width: `${clamped}%`, height: "100%", background: "var(--gov-gold, #c9a227)" }} />
    </div>
  );
}

/** Voting-window elapsed/remaining progress, live-updating while active. */
export function ElectionTimeProgress({
  startsAt,
  endsAt,
  status,
}: {
  startsAt?: string | null;
  endsAt?: string | null;
  status: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status !== "active") return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [status]);

  if (!startsAt || !endsAt) {
    return <div style={{ fontSize: 12, color: "var(--gov-muted)" }}>Voting window not set.</div>;
  }

  if (status === "draft") {
    return <div style={{ fontSize: 12, color: "var(--gov-muted)" }}>Not started.</div>;
  }

  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const total = Math.max(1, end - start);

  if (status === "closed") {
    return (
      <div>
        <ProgressBar pct={100} />
        <div style={{ fontSize: 12, color: "var(--gov-muted)", marginTop: 6 }}>
          Completed — total duration {formatDuration(total)}
        </div>
      </div>
    );
  }

  const elapsed = Math.min(total, Math.max(0, now - start));
  const pct = Math.round((elapsed / total) * 100);
  const remaining = Math.max(0, end - now);

  return (
    <div>
      <ProgressBar pct={pct} />
      <div style={{ fontSize: 12, color: "var(--gov-muted)", marginTop: 6 }}>
        {pct}% elapsed • {remaining > 0 ? `${formatDuration(remaining)} remaining` : "voting window ended"}
      </div>
    </div>
  );
}
