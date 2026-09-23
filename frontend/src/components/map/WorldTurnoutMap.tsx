import { useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath, geoCentroid } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import world from "world-atlas/countries-110m.json";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { COUNTRIES, flag } from "../common/CountrySelect";
import type { CountryTurnout } from "../../lib/api";

/**
 * Choropleth of where voters voted from. Geometry is Natural Earth 1:110m,
 * bundled with the app (world-atlas) — no tiles, no map API, no requests.
 *
 * Colour uses a log scale so a few hundred diaspora voters in Sydney stay
 * visible next to tens of thousands in Lebanon. Countries too small to see at
 * this scale (Lebanon among them) also get a proportional dot. Supports tap
 * tooltips, pinch-zoom and drag-pan on phones, and +/− buttons everywhere.
 */

const W = 960;
const H = 500;
const RAMP = ["#fde7b0", "#f9c46b", "#f08c3a", "#d9542b", "#a61e1e"];

const byNumeric = new Map(COUNTRIES.map((c) => [c.numeric, c.code]));
const topo: any = world;
const shapes = (feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>).features.map((f) => ({
  f,
  code: byNumeric.get(String(f.id).padStart(3, "0")) ?? null,
}));

const projection = geoNaturalEarth1().fitSize([W, H], { type: "Sphere" } as any);
const path = geoPath(projection);
const paths = shapes.map((s) => ({ ...s, d: path(s.f as Feature) ?? "", centroid: projection(geoCentroid(s.f as Feature)) }));

function bucket(n: number, max: number) {
  if (n <= 0) return -1;
  if (max <= 1) return RAMP.length - 1;
  return Math.min(RAMP.length - 1, Math.floor((Math.log(n) / Math.log(max)) * (RAMP.length - 1) + 1e-9));
}

type View = { k: number; x: number; y: number };

export default function WorldTurnoutMap({
  countries,
  total,
  suppressionThreshold,
}: {
  countries: CountryTurnout[];
  total: number;
  suppressionThreshold: number | null;
}) {
  const data = useMemo(() => new Map(countries.map((c) => [c.code, c])), [countries]);
  const max = useMemo(() => Math.max(1, ...countries.map((c) => c.voters ?? 0)), [countries]);
  const [tip, setTip] = useState<{ code: string; x: number; y: number } | null>(null);
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; view: View; mid: { x: number; y: number } } | null>(null);
  const dragged = useRef(false);

  const clamp = (v: View): View => {
    const k = Math.max(1, Math.min(12, v.k));
    const maxX = (W * (k - 1)) / 1;
    const maxY = (H * (k - 1)) / 1;
    return { k, x: Math.min(0, Math.max(-maxX, v.x)), y: Math.min(0, Math.max(-maxY, v.y)) };
  };

  const toSvg = (clientX: number, clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * W, y: ((clientY - r.top) / r.height) * H };
  };

  const zoomAt = (factor: number, cx = W / 2, cy = H / 2) =>
    setView((v) => {
      const k = Math.max(1, Math.min(12, v.k * factor));
      const f = k / v.k;
      return clamp({ k, x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f });
    });

  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!svgRef.current?.contains(e.target as Node)) setTip(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, toSvg(e.clientX, e.clientY));
    dragged.current = false;
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      gesture.current = {
        dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        view,
        mid: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
      };
    } else {
      gesture.current = { dist: 0, view, mid: pts[0] };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, toSvg(e.clientX, e.clientY));
    const pts = [...pointers.current.values()];
    const g = gesture.current;
    if (pts.length === 2 && g.dist > 0) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const k = Math.max(1, Math.min(12, g.view.k * (dist / g.dist)));
      const f = k / g.view.k;
      setView(clamp({ k, x: g.mid.x - (g.mid.x - g.view.x) * f, y: g.mid.y - (g.mid.y - g.view.y) * f }));
      dragged.current = true;
    } else if (pts.length === 1 && view.k > 1) {
      const dx = pts[0].x - g.mid.x;
      const dy = pts[0].y - g.mid.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) dragged.current = true;
      setView(clamp({ ...g.view, x: g.view.x + dx, y: g.view.y + dy }));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) gesture.current = null;
  }

  function show(code: string | null, e: React.PointerEvent | React.MouseEvent) {
    if (!code || dragged.current) return;
    const r = svgRef.current!.getBoundingClientRect();
    setTip({ code, x: e.clientX - r.left, y: e.clientY - r.top });
  }

  const tipRow = tip ? data.get(tip.code) : undefined;
  const tipName = tip ? COUNTRIES.find((c) => c.code === tip.code)?.name ?? tip.code : "";

  const legend = RAMP.map((color, i) => {
    const lo = i === 0 ? 1 : Math.ceil(Math.exp((i / (RAMP.length - 1)) * Math.log(max)));
    const hi = i === RAMP.length - 1 ? max : Math.floor(Math.exp(((i + 1) / (RAMP.length - 1)) * Math.log(max)));
    return { color, label: lo >= hi ? `${lo}` : `${lo}–${hi}` };
  });

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ position: "relative", borderRadius: 14, border: "1px solid var(--gov-edge)", overflow: "hidden", background: "rgba(59,130,246,0.05)" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`World map of where ${total} voters voted from; see the table below for exact figures.`}
          style={{ display: "block", width: "100%", height: "auto", touchAction: view.k > 1 ? "none" : "pan-y", cursor: view.k > 1 ? "grab" : "default", userSelect: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={(e) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            const p = toSvg(e.clientX, e.clientY);
            zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, p.x, p.y);
          }}
        >
          <defs>
            <pattern id="gv-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#fde7b0" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#d9a33a" strokeWidth="2" />
            </pattern>
          </defs>
          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            {paths.map(({ d, code }, i) => {
              const row = code ? data.get(code) : undefined;
              const b = row?.voters ? bucket(row.voters, max) : -1;
              const fill = row?.suppressed ? "url(#gv-hatch)" : b >= 0 ? RAMP[b] : "rgba(148,163,184,0.28)";
              return (
                <path
                  key={i}
                  d={d}
                  fill={fill}
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth={0.5 / view.k}
                  onPointerUp={(e) => row && show(code, e)}
                  onPointerMove={(e) => row && e.pointerType === "mouse" && show(code, e)}
                  onMouseLeave={() => setTip(null)}
                  style={{ cursor: row ? "pointer" : "default" }}
                >
                  {row && <title>{`${code}: ${row.suppressed ? "fewer than " + suppressionThreshold : row.voters} voters`}</title>}
                </path>
              );
            })}
            {paths.map(({ code, centroid }) => {
              const row = code ? data.get(code) : undefined;
              if (!row || !centroid) return null;
              const n = row.voters ?? 1;
              const r = (3 + 5 * (Math.log(n + 1) / Math.log(max + 1))) / Math.sqrt(view.k);
              return (
                <circle
                  key={`dot-${code}`}
                  cx={centroid[0]}
                  cy={centroid[1]}
                  r={r}
                  fill={row.suppressed ? "#d9a33a" : RAMP[Math.max(0, bucket(n, max))]}
                  stroke="#1f2937"
                  strokeWidth={0.8 / view.k}
                  onPointerUp={(e) => show(code, e)}
                  onPointerMove={(e) => e.pointerType === "mouse" && show(code, e)}
                  onMouseLeave={() => setTip(null)}
                  style={{ cursor: "pointer" }}
                />
              );
            })}
          </g>
        </svg>

        <div style={{ position: "absolute", right: 8, top: 8, display: "grid", gap: 6 }}>
          <button type="button" className="govBtn" aria-label="Zoom in" onClick={() => zoomAt(1.5)} style={{ width: 44, padding: 0 }}><Plus size={18} /></button>
          <button type="button" className="govBtn" aria-label="Zoom out" onClick={() => zoomAt(1 / 1.5)} style={{ width: 44, padding: 0 }}><Minus size={18} /></button>
          <button type="button" className="govBtn" aria-label="Reset map" onClick={() => setView({ k: 1, x: 0, y: 0 })} style={{ width: 44, padding: 0 }}><RotateCcw size={16} /></button>
        </div>

        {tip && (
          <div
            role="tooltip"
            data-testid="map-tooltip"
            style={{
              position: "absolute",
              left: Math.min(Math.max(8, tip.x + 12), (svgRef.current?.clientWidth ?? 300) - 190),
              top: Math.max(8, tip.y - 70),
              width: 180,
              padding: "10px 12px",
              borderRadius: 12,
              background: "var(--gov-bg)",
              border: "1px solid var(--gov-edge)",
              boxShadow: "var(--gov-shadow)",
              fontSize: 13,
              pointerEvents: "none",
            }}
          >
            <div style={{ fontWeight: 900 }}>{flag(tip.code)} {tipName}</div>
            {tipRow?.suppressed ? (
              <div className="gv-muted">Fewer than {suppressionThreshold} voters (hidden to protect privacy)</div>
            ) : (
              <>
                <div>{(tipRow?.voters ?? 0).toLocaleString()} voters</div>
                <div className="gv-muted">{tipRow?.share ?? 0}% of all voters</div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="gv-row" style={{ fontSize: 12 }} aria-label="Map legend (logarithmic scale)">
        <span className="gv-muted" style={{ fontWeight: 800 }}>Voters (log scale):</span>
        {legend.map((l) => (
          <span key={l.color} className="gv-row" style={{ gap: 4 }}>
            <span style={{ width: 16, height: 12, borderRadius: 3, background: l.color, display: "inline-block" }} />
            {l.label}
          </span>
        ))}
        {suppressionThreshold && (
          <span className="gv-row" style={{ gap: 4 }}>
            <svg width="16" height="12" aria-hidden><rect width="16" height="12" fill="url(#gv-hatch)" /></svg>
            &lt; {suppressionThreshold}
          </span>
        )}
        <span className="gv-muted gv-show-sm">Pinch to zoom · tap a country</span>
      </div>
    </div>
  );
}
