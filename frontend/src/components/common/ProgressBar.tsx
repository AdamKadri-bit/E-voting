/** Determinate progress bar with an accessible label. */
export default function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div className="gv-row" style={{ justifyContent: "space-between", fontSize: 13 }}>
        <span className="gv-muted">{label}</span>
        <span style={{ fontWeight: 900 }}>{pct}%</span>
      </div>
      <div className="gv-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
