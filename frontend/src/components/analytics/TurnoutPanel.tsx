import { useEffect, useMemo, useState } from "react";
import { Globe2, Users, Plane, Home, TriangleAlert, RefreshCw } from "lucide-react";
import WorldTurnoutMap from "../map/WorldTurnoutMap";
import { flag } from "../common/CountrySelect";
import Notice from "../common/Notice";
import { adminParticipation, publicTurnout, type Turnout } from "../../lib/api";

const POLL_MS = 15000;

/**
 * Live turnout for one election: totals, resident vs diaspora, the world map
 * (declared or detected country), top countries and a full table. Polls every
 * 15 s while the election is open. Shows no results — only who took part.
 */
export default function TurnoutPanel({ electionId, admin = false }: { electionId: number; admin?: boolean }) {
  const [mode, setMode] = useState<"declared" | "detected">("declared");
  const [data, setData] = useState<Turnout | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<"map" | "table">("map");

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const d = admin ? await adminParticipation(electionId, mode) : await publicTurnout(electionId, mode);
        if (!alive) return;
        setData(d);
        setErr(null);
        if (d.election.status === "active") timer = setTimeout(load, POLL_MS);
      } catch (e: any) {
        if (alive) setErr(e.message);
      }
    };
    load();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [electionId, mode, admin]);

  const top = useMemo(() => (data?.countries ?? []).filter((c) => !c.suppressed).slice(0, 8), [data]);

  if (err) return <Notice kind="error">{err}</Notice>;
  if (!data) return <div className="gv-muted">Loading turnout…</div>;

  const t = data.totals;
  const diasporaShare = t.voters ? Math.round((t.diaspora / t.voters) * 1000) / 10 : 0;

  return (
    <div className="gv-stack" data-testid="turnout-panel">
      <div className="gv-grid-stats">
        <Stat icon={<Users size={16} />} k="Voters so far" v={t.voters.toLocaleString()} sub={t.registered ? `${t.turnout_percentage}% of ${t.registered.toLocaleString()} registered` : undefined} />
        <Stat icon={<Home size={16} />} k="Residents" v={t.resident.toLocaleString()} />
        <Stat icon={<Plane size={16} />} k="Diaspora" v={t.diaspora.toLocaleString()} sub={`${diasporaShare}% of voters`} />
        <Stat icon={<Globe2 size={16} />} k="Countries" v={String(t.countries)} />
        {admin && t.location_mismatches !== undefined && (
          <Stat icon={<TriangleAlert size={16} />} k="Location mismatches" v={String(t.location_mismatches)} sub="Declared ≠ detected. Review only; never blocks a vote." />
        )}
      </div>

      <div className="gv-row" style={{ justifyContent: "space-between" }}>
        <div className="gv-row" role="radiogroup" aria-label="Which country to map">
          {(["declared", "detected"] as const).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} className={`gv-btn ${mode === m ? "gold" : ""}`} onClick={() => setMode(m)} style={{ minHeight: 44, padding: "8px 14px", fontSize: 14 }}>
              {m === "declared" ? "Declared country" : "Detected (IP) country"}
            </button>
          ))}
        </div>
        <div className="gv-row">
          <button type="button" className={`gv-btn ${view === "map" ? "blue" : ""}`} onClick={() => setView("map")} style={{ minHeight: 44, padding: "8px 14px", fontSize: 14 }}>Map</button>
          <button type="button" className={`gv-btn ${view === "table" ? "blue" : ""}`} onClick={() => setView("table")} style={{ minHeight: 44, padding: "8px 14px", fontSize: 14 }}>Table</button>
        </div>
      </div>

      {mode === "detected" && (
        <Notice kind="warn">
          Detected location comes from an offline IP lookup and is only indicative — VPNs and travel move it. {t.unknown_location > 0 && `${t.unknown_location} voter(s) could not be located.`}
        </Notice>
      )}

      {view === "map" ? (
        <WorldTurnoutMap countries={data.countries} total={t.voters} suppressionThreshold={data.suppression_threshold} />
      ) : null}

      <div className="gv-split">
        <div className="gv-card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>{view === "table" ? "All countries" : "Country table"}</div>
          <div className="gv-table-wrap" style={{ maxHeight: view === "table" ? "none" : 320, overflowY: "auto" }}>
            <table className="gv-table" data-testid="country-table">
              <caption className="gv-muted" style={{ textAlign: "left", padding: "8px 12px", fontSize: 12 }}>
                Voters in this election by {mode} country{data.suppression_threshold ? `; countries with fewer than ${data.suppression_threshold} voters are hidden` : ""}.
              </caption>
              <thead>
                <tr><th scope="col">Country</th><th scope="col">Voters</th><th scope="col">Share</th></tr>
              </thead>
              <tbody>
                {data.countries.map((c) => (
                  <tr key={c.code}>
                    <td>{flag(c.code)} {c.name}</td>
                    <td>{c.suppressed ? `< ${data.suppression_threshold}` : c.voters?.toLocaleString()}</td>
                    <td>{c.share === null ? "—" : `${c.share}%`}</td>
                  </tr>
                ))}
                {data.countries.length === 0 && (
                  <tr><td colSpan={3} className="gv-muted">No votes cast yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="gv-card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Top countries</div>
          <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8 }}>
            {top.map((c) => (
              <li key={c.code}>
                <div className="gv-row" style={{ justifyContent: "space-between", gap: 6 }}>
                  <span>{flag(c.code)} {c.name}</span>
                  <strong>{c.voters?.toLocaleString()}</strong>
                </div>
                <div className="gv-progress" style={{ height: 6, marginTop: 4 }}>
                  <div style={{ width: `${c.share ?? 0}%` }} />
                </div>
              </li>
            ))}
            {top.length === 0 && <li className="gv-muted" style={{ listStyle: "none" }}>No countries to show yet.</li>}
          </ol>
          {data.hourly.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontWeight: 900, marginBottom: 8, fontSize: 14 }}>Voters per hour</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 70 }} aria-label="Voters per hour (times rounded to the hour)">
                {data.hourly.map((h) => {
                  const m = Math.max(...data.hourly.map((x) => x.voters));
                  return <div key={h.hour} title={`${new Date(h.hour).toLocaleString()}: ${h.voters}`} style={{ flex: 1, minWidth: 4, height: `${(h.voters / m) * 100}%`, background: "rgba(201,162,39,0.6)", borderRadius: 3 }} />;
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="gv-muted gv-row" style={{ fontSize: 12 }}>
        <RefreshCw size={12} /> Updated {new Date(data.generated_at).toLocaleTimeString()}
        {data.election.status === "active" ? " · refreshes every 15 s" : ""} · counts people who voted in this election, never registered users.
      </div>
    </div>
  );
}

function Stat({ icon, k, v, sub }: { icon: React.ReactNode; k: string; v: string; sub?: string }) {
  return (
    <div className="gv-stat">
      <div className="k gv-row" style={{ gap: 6 }}>{icon}{k}</div>
      <div className="v">{v}</div>
      {sub && <div className="gv-muted" style={{ fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
