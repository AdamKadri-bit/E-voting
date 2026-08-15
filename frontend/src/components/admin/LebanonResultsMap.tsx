import { useMemo, useRef, useState } from "react";
import type { GeoGovernorate, GeoResults } from "../../lib/api";
import {
  GOVERNORATES,
  MAP_HEIGHT,
  MAP_WIDTH,
  project,
  projectRing,
} from "./lebanonGeo";

/** Turnout ramp: pale for a quiet region, gold for a busy one. */
function turnoutFill(pct: number, inElection: boolean): string {
  if (!inElection) return "rgba(148,163,184,0.10)";
  const t = Math.max(0, Math.min(100, pct)) / 100;
  // Interpolate slate → gold in HSL so mid-range values stay readable.
  const hue = 210 + (45 - 210) * t;
  const sat = 18 + (72 - 18) * t;
  const light = 34 + (52 - 34) * t;
  return `hsl(${hue.toFixed(0)} ${sat.toFixed(0)}% ${light.toFixed(0)}%)`;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12 }}>
      <span style={{ color: "var(--gov-muted)" }}>{label}</span>
      <span style={{ fontWeight: 800 }}>{value}</span>
    </div>
  );
}

function GovernorateTooltip({ data }: { data: GeoGovernorate }) {
  return (
    <div style={{ display: "grid", gap: 8, minWidth: 250 }}>
      <div>
        <div style={{ fontWeight: 900, fontSize: 14 }}>{data.name_en}</div>
        {data.name_ar && (
          <div style={{ fontSize: 12, color: "var(--gov-muted)" }}>{data.name_ar}</div>
        )}
      </div>

      {!data.in_election ? (
        <div style={{ fontSize: 12, color: "var(--gov-muted)" }}>
          Not part of this election.
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gap: 3 }}>
            <Row label="Registered" value={data.registered.toLocaleString()} />
            <Row label="Voted" value={data.voted.toLocaleString()} />
            <Row label="Ballots recorded" value={data.ballots.toLocaleString()} />
            <Row label="Turnout" value={`${data.turnout_percentage}%`} />
            <Row label="Constituencies" value={data.constituencies.length} />
            <Row label="Districts" value={data.districts.length} />
          </div>

          {data.lists.length > 0 && (
            <div style={{ display: "grid", gap: 3, borderTop: "1px solid var(--gov-edge)", paddingTop: 7 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gov-muted)" }}>
                LIST VOTES
              </div>
              {data.lists.slice(0, 6).map((l) => (
                <Row key={l.list_name} label={l.list_name} value={`${l.votes} (${l.percentage}%)`} />
              ))}
            </div>
          )}

          {data.preferential_candidates.length > 0 && (
            <div style={{ display: "grid", gap: 3, borderTop: "1px solid var(--gov-edge)", paddingTop: 7 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gov-muted)" }}>
                PREFERENTIAL VOTES
              </div>
              {data.preferential_candidates.slice(0, 6).map((c) => (
                <Row
                  key={c.candidate_name}
                  label={c.candidate_name}
                  value={`${c.votes} (${c.percentage}%)`}
                />
              ))}
            </div>
          )}

          {data.constituencies.length > 0 && (
            <div style={{ display: "grid", gap: 3, borderTop: "1px solid var(--gov-edge)", paddingTop: 7 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gov-muted)" }}>
                CONSTITUENCIES
              </div>
              {data.constituencies.map((c) => (
                <Row
                  key={c.id}
                  label={c.name_en ?? c.code ?? `#${c.id}`}
                  value={
                    c.registration_attributable
                      ? `${c.voted}/${c.registered} • ${c.turnout_percentage}%`
                      : `${c.ballots} ballots`
                  }
                />
              ))}
            </div>
          )}

          <div style={{ fontSize: 11, color: "var(--gov-muted)" }}>
            Click the region to pin its full breakdown below.
          </div>
        </>
      )}
    </div>
  );
}

/** Full per-constituency breakdown for a pinned governorate. */
function GovernorateDetail({ data }: { data: GeoGovernorate }) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 16, fontWeight: 900 }}>{data.name_en}</span>
        {data.name_ar && (
          <span style={{ fontSize: 13, color: "var(--gov-muted)" }}>{data.name_ar}</span>
        )}
        <span style={{ fontSize: 12, color: "var(--gov-muted)" }}>
          {data.districts.map((d) => d.name_en).join(" • ")}
        </span>
      </div>

      {data.constituencies.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--gov-muted)" }}>
          No constituency of this governorate is attached to the election.
        </div>
      ) : (
        data.constituencies.map((c) => (
          <div
            key={c.id}
            style={{
              border: "1px solid var(--gov-edge)",
              borderRadius: 12,
              padding: 14,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800 }}>{c.name_en ?? c.code}</span>
              <span style={{ fontSize: 12, color: "var(--gov-muted)" }}>
                {c.seats > 0 ? `${c.seats} seats • ` : ""}
                {c.registration_attributable && c.registered !== null && c.voted !== null
                  ? `${c.voted.toLocaleString()} of ${c.registered.toLocaleString()} voted • ${c.turnout_percentage}% turnout • `
                  : "roll counted at governorate level • "}
                {c.ballots.toLocaleString()} ballots
              </span>
            </div>

            {c.lists.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--gov-muted)" }}>No votes recorded yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {c.lists.map((l) => (
                  <div key={l.list_id ?? l.list_name}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                      <span style={{ fontWeight: 700 }}>{l.list_name}</span>
                      <span style={{ color: "var(--gov-muted)" }}>
                        {l.votes} ({l.percentage}%)
                      </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div style={{ width: `${l.percentage}%`, height: "100%", background: "var(--gov-gold, #c9a227)" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {c.preferential_candidates.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gov-muted)", marginBottom: 6 }}>
                  PREFERENTIAL VOTES
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {c.preferential_candidates.map((p) => (
                    <span
                      key={p.candidacy_id ?? p.candidate_name}
                      style={{
                        fontSize: 12,
                        padding: "4px 9px",
                        borderRadius: 999,
                        border: "1px solid var(--gov-edge)",
                      }}
                    >
                      {p.candidate_name}: <b>{p.votes}</b> ({p.percentage}%)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

/**
 * Choropleth of Lebanon's governorates for one election. Hovering a region
 * shows its turnout, list votes and preferential votes; clicking pins the
 * per-constituency breakdown underneath.
 */
export function LebanonResultsMap({ data }: { data: GeoResults }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const byCode = useMemo(() => {
    const map = new Map<string, GeoGovernorate>();
    data.governorates.forEach((g) => map.set(g.code, g));
    return map;
  }, [data]);

  const hoveredData = hovered ? byCode.get(hovered) : null;
  const pinnedData = pinned ? byCode.get(pinned) : null;

  function trackCursor(e: React.MouseEvent) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div
        ref={wrapRef}
        style={{ position: "relative", display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}
        onMouseMove={trackCursor}
      >
        <svg
          viewBox={`-10 -10 ${MAP_WIDTH + 20} ${MAP_HEIGHT + 20}`}
          width={MAP_WIDTH}
          style={{ maxWidth: "100%", height: "auto", flex: "0 1 auto" }}
          role="img"
          aria-label="Turnout by governorate"
        >
          {/* Every region is filled first, so no later shape paints over a label. */}
          {GOVERNORATES.map((shape, index) => {
            const region = byCode.get(shape.code);
            const isActive = hovered === shape.code || pinned === shape.code;

            return (
              <polygon
                key={`${shape.code}-${index}`}
                points={projectRing(shape.ring)}
                fill={turnoutFill(region?.turnout_percentage ?? 0, region?.in_election ?? false)}
                stroke={isActive ? "var(--gov-gold, #c9a227)" : "var(--gov-edge)"}
                strokeWidth={isActive ? 2.5 : 1}
                style={{ cursor: "pointer", transition: "stroke 120ms ease" }}
                onMouseEnter={() => setHovered(shape.code)}
                onMouseLeave={() => setHovered((c) => (c === shape.code ? null : c))}
                onClick={() => setPinned((c) => (c === shape.code ? null : shape.code))}
              />
            );
          })}

          {/* Only the shape carrying a label anchor gets named. */}
          {GOVERNORATES.filter((shape) => shape.label).map((shape) => {
            const region = byCode.get(shape.code);
            const inElection = region?.in_election ?? false;
            const [lx, ly] = project(shape.label!);

            return (
              <g key={`${shape.code}-label`}>
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  pointerEvents="none"
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    fill: "var(--gov-ink)",
                    paintOrder: "stroke",
                    stroke: "var(--gov-bg, rgba(0,0,0,0.55))",
                    strokeWidth: 3,
                    strokeLinejoin: "round",
                  }}
                >
                  {shape.name}
                </text>
                {inElection && (
                  <text
                    x={lx}
                    y={ly + 15}
                    textAnchor="middle"
                    pointerEvents="none"
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      fill: "var(--gov-ink)",
                      paintOrder: "stroke",
                      stroke: "var(--gov-bg, rgba(0,0,0,0.55))",
                      strokeWidth: 3,
                      strokeLinejoin: "round",
                    }}
                  >
                    {region?.turnout_percentage ?? 0}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend + national totals sit beside the map. */}
        <div style={{ display: "grid", gap: 14, minWidth: 200, flex: "1 1 200px" }}>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gov-muted)" }}>
              NATIONWIDE
            </div>
            <Row label="Registered" value={data.totals.registered.toLocaleString()} />
            <Row label="Voted" value={data.totals.voted.toLocaleString()} />
            <Row label="Ballots" value={data.totals.ballots.toLocaleString()} />
            <Row label="Turnout" value={`${data.totals.turnout_percentage}%`} />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gov-muted)" }}>
              TURNOUT
            </div>
            <div
              style={{
                height: 10,
                borderRadius: 999,
                background: `linear-gradient(90deg, ${turnoutFill(0, true)}, ${turnoutFill(50, true)}, ${turnoutFill(100, true)})`,
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--gov-muted)" }}>
              <span>0%</span>
              <span>100%</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--gov-muted)" }}>
              <span
                style={{
                  width: 14,
                  height: 10,
                  borderRadius: 3,
                  background: turnoutFill(0, false),
                  border: "1px solid var(--gov-edge)",
                }}
              />
              Not in this election
            </div>
          </div>
        </div>

        {/* Hover card, following the cursor inside the map area. */}
        {hoveredData && (
          <div
            style={{
              position: "absolute",
              left: Math.min(cursor.x + 16, (wrapRef.current?.clientWidth ?? 0) - 290),
              top: cursor.y + 16,
              pointerEvents: "none",
              zIndex: 5,
              maxWidth: 300,
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid var(--gov-edge)",
              background: "var(--gov-card, #14161c)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
          >
            <GovernorateTooltip data={hoveredData} />
          </div>
        )}
      </div>

      {pinnedData && (
        <div
          style={{
            borderTop: "1px solid var(--gov-edge)",
            paddingTop: 16,
          }}
        >
          <GovernorateDetail data={pinnedData} />
        </div>
      )}
    </div>
  );
}
