import type { TurnoutTimeline } from "../../lib/api";

const WIDTH = 600;
const HEIGHT = 140;
const PADDING_BOTTOM = 20;
const BAR_GAP = 2;

/** Hand-rolled SVG bar chart of ballots cast per time bucket. */
export function TurnoutTimelineChart({ data }: { data: TurnoutTimeline }) {
  if (!data.window || data.buckets.length === 0) {
    return (
      <div style={{ fontSize: 13, color: "var(--gov-muted)" }}>
        No ballots cast yet.
      </div>
    );
  }

  const chartHeight = HEIGHT - PADDING_BOTTOM;
  const barWidth = Math.max(1, WIDTH / data.buckets.length - BAR_GAP);
  const max = Math.max(1, ...data.buckets.map((b) => b.count));

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" style={{ maxWidth: WIDTH, display: "block" }}>
        <line x1={0} y1={chartHeight} x2={WIDTH} y2={chartHeight} stroke="var(--gov-edge)" strokeWidth={1} />
        {data.buckets.map((b, i) => {
          const barHeight = (b.count / max) * (chartHeight - 8);
          const x = i * (barWidth + BAR_GAP);
          const y = chartHeight - barHeight;
          return (
            <rect
              key={b.index}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill="var(--gov-gold, #c9a227)"
              rx={1}
            >
              <title>{`${new Date(b.start).toLocaleTimeString()} — ${b.count} ballot(s)`}</title>
            </rect>
          );
        })}
      </svg>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "var(--gov-muted)",
          marginTop: 4,
        }}
      >
        <span>{new Date(data.window.from).toLocaleString()}</span>
        <span>{data.total_ballots} ballot(s) total</span>
        <span>{new Date(data.window.to).toLocaleString()}</span>
      </div>
    </div>
  );
}
