import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Vote, Plane, ShieldCheck, Lock, Search, CheckCircle2, XCircle, RefreshCw, UserCheck } from "lucide-react";
import DashboardLayout from "../components/layouts/DashboardLayout";
import PageHeader from "../components/common/PageHeader";
import Notice from "../components/common/Notice";
import ProgressBar from "../components/common/ProgressBar";
import TrackingCode from "../components/common/TrackingCode";
import { flag } from "../components/common/CountrySelect";
import { ApiError, castEncryptedBallot, getEncryptedBallot, publishAudit, type E2eBallotResponse } from "../lib/api";
import { runCrypto } from "../crypto/client";
import { selectionVector, type Manifest } from "../crypto/manifest";
import { describeSelection, type AuditedBallot, type BallotSecrets, type EncryptedBallot } from "../crypto/ballot";

type Step = "confirm" | "choose" | "encrypting" | "decide" | "casting" | "audited";

type Encrypted = { ballot: EncryptedBallot; secrets: BallotSecrets; tracking: { full: string; short: string }; ms: number };

/**
 * The ballot. Residents go straight to their choices; diaspora voters first
 * confirm their details under a "Diaspora ballot" banner. Either way the
 * selection is encrypted in a Web Worker in this browser, then the voter sees
 * the tracking code and chooses Cast (submit) or Audit (reveal the randomness
 * so anyone can check this device encrypted what it showed, then start over).
 */
export default function BallotPage() {
  const nav = useNavigate();
  const { electionId } = useParams();
  const eid = Number(electionId);

  const [data, setData] = useState<E2eBallotResponse | null>(null);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [step, setStep] = useState<Step>("choose");
  const [listId, setListId] = useState<number | null>(null);
  const [candId, setCandId] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [enc, setEnc] = useState<Encrypted | null>(null);
  const [audit, setAudit] = useState<{ record: AuditedBallot; ok: boolean; reason?: string; short: string; published: boolean; error?: string } | null>(null);
  const [castErr, setCastErr] = useState<string | null>(null);

  useEffect(() => {
    runCrypto("warmup").catch(() => {});
    getEncryptedBallot(eid)
      .then((d) => {
        setData(d);
        setStep(d.voter.voter_type === "diaspora" ? "confirm" : "choose");
      })
      .catch((e: ApiError) => {
        if (e.reason === "status_required") nav("/voter-status", { replace: true, state: { next: `/elections/${eid}/ballot` } });
        else setError(e);
      });
  }, [eid, nav]);

  const manifest: Manifest | null = data?.e2e.manifest ?? null;
  const lists = useMemo(() => manifest?.options.filter((o) => o.type === "list") ?? [], [manifest]);
  const candidates = useMemo(() => manifest?.options.filter((o) => o.type === "candidate" && o.list_id === listId) ?? [], [manifest, listId]);
  const diaspora = data?.voter.voter_type === "diaspora";

  async function encrypt() {
    if (!manifest || !data || listId === null) return;
    setStep("encrypting");
    setProgress(0);
    setCastErr(null);
    try {
      const out = await runCrypto<Encrypted>(
        "encryptBallot",
        { manifest, jointPk: data.e2e.joint_public_key, credential: data.e2e.credential, selections: selectionVector(manifest, listId, candId) },
        (p) => setProgress(p)
      );
      setEnc(out);
      setStep("decide");
    } catch (e: any) {
      setCastErr(e.message);
      setStep("choose");
    }
  }

  async function cast() {
    if (!enc) return;
    setStep("casting");
    try {
      const r = await castEncryptedBallot(eid, enc.ballot);
      nav(`/elections/${eid}/receipt/${r.receipt.short_code}`, { replace: true, state: { receipt: r.receipt, encryptMs: enc.ms } });
    } catch (e: any) {
      setCastErr(e.message);
      setStep("decide");
    }
  }

  async function doAudit() {
    if (!enc || !manifest || !data) return;
    const { audit: record, check } = await runCrypto<{ audit: AuditedBallot; check: { ok: boolean; reason?: string } }>("auditBallot", {
      manifest,
      jointPk: data.e2e.joint_public_key,
      ballot: enc.ballot,
      secrets: enc.secrets,
    });
    const state = { record, ok: check.ok, reason: check.reason, short: enc.tracking.short, published: false as boolean, error: undefined as string | undefined };
    try {
      await publishAudit(eid, record);
      state.published = true;
    } catch (e: any) {
      state.error = e.message;
    }
    setAudit(state);
    setEnc(null); // this ballot is spoiled; its randomness is public now
    setStep("audited");
  }

  const selectionText = (sel: { list: string | null; candidate: string | null }) =>
    `${sel.list ?? "—"}${sel.candidate ? ` · preferential vote: ${sel.candidate}` : " · no preferential vote"}`;

  /* ------------------------------------------------------------------ render */

  if (error) {
    const reason = (error as ApiError).reason;
    return (
      <DashboardLayout>
        <div className="gv-page" style={{ maxWidth: 760 }}>
          <PageHeader pill={<><Vote size={14} /> Ballot</>} pillTone="green" title={reason === "diaspora_disabled" ? "Diaspora voting unavailable" : "Ballot unavailable"} />
          <Notice kind={reason === "diaspora_disabled" ? "warn" : "error"}>
            <div data-testid="ballot-error" data-reason={reason}>{error.message}</div>
            {reason === "diaspora_disabled" && (
              <div style={{ marginTop: 8 }} className="gv-muted">
                The election's administrators have not enabled voting from abroad for this election. If you're in Lebanon on election day, change your status to resident before polling opens next time.
              </div>
            )}
          </Notice>
          <div className="gv-row" style={{ marginTop: 16 }}>
            {reason === "not_verified" && <Link className="gv-btn primary" to="/verify-voter">Verify Voter Record</Link>}
            <Link className="gv-btn" to="/elections">Back to elections</Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!data || !manifest) {
    return (
      <DashboardLayout>
        <div className="gv-page gv-muted">Loading your ballot…</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="gv-page" style={{ maxWidth: 860 }}>
        {diaspora && (
          <div
            data-testid="diaspora-banner"
            style={{ marginBottom: 18, padding: "14px 16px", borderRadius: 16, border: "1px solid rgba(59,130,246,0.45)", background: "rgba(59,130,246,0.12)", display: "flex", gap: 12, alignItems: "center" }}
          >
            <span style={{ fontSize: 30 }} aria-hidden>{flag(data.voter.residence_country ?? "")}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 900, display: "flex", gap: 8, alignItems: "center" }}><Plane size={16} /> Diaspora ballot</div>
              <div className="gv-muted" style={{ fontSize: 14 }}>
                Voting from {data.voter.residence_country_name} for your home district, {data.district.name}.
              </div>
            </div>
          </div>
        )}

        <PageHeader pill={<><Vote size={14} /> {diaspora ? "Diaspora ballot" : "Ballot"}</>} pillTone="green" title={data.election.title}>
          {data.constituency.name} · {data.district.name}
        </PageHeader>

        <div style={{ marginBottom: 16 }}>
          <Notice kind="info">
            <RefreshCw size={14} style={{ verticalAlign: -2 }} /> <strong>You can change your vote until the election closes. Only your last vote counts.</strong>
            {data.e2e.has_voted && " You already voted — casting again replaces your earlier ballot."}
          </Notice>
        </div>

        {step === "confirm" && (
          <div className="gv-card gv-stack" data-testid="diaspora-confirm">
            <div style={{ fontWeight: 900, fontSize: 18 }}><UserCheck size={18} style={{ verticalAlign: -3 }} /> Confirm your details</div>
            <dl style={{ display: "grid", gridTemplateColumns: "max-content minmax(0,1fr)", gap: "8px 14px", margin: 0 }}>
              <dt className="gv-muted">Name</dt><dd style={{ margin: 0, fontWeight: 800 }}>{data.voter.name}</dd>
              <dt className="gv-muted">Living in</dt><dd style={{ margin: 0, fontWeight: 800 }}>{flag(data.voter.residence_country ?? "")} {data.voter.residence_country_name}</dd>
              <dt className="gv-muted">Home district</dt><dd style={{ margin: 0, fontWeight: 800 }}>{data.district.name}</dd>
              <dt className="gv-muted">Constituency</dt><dd style={{ margin: 0, fontWeight: 800 }}>{data.constituency.name}</dd>
            </dl>
            <p className="gv-muted" style={{ margin: 0, fontSize: 14 }}>
              Details wrong? Your country can be changed from your profile when no election you can vote in is open.
            </p>
            <div className="gv-sticky-actions">
              <button type="button" className="gv-btn primary block" onClick={() => setStep("choose")} data-testid="confirm-details">
                These details are correct — show my ballot
              </button>
            </div>
          </div>
        )}

        {step === "choose" && (
          <div className="gv-stack">
            {castErr && <Notice kind="error">{castErr}</Notice>}
            <section className="gv-stack" style={{ gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>1. Choose one list</h2>
              <div role="radiogroup" aria-label="Lists" className="gv-stack" style={{ gap: 10 }}>
                {lists.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    role="radio"
                    aria-checked={listId === l.id}
                    className="gv-choice"
                    data-testid={`list-${l.id}`}
                    onClick={() => {
                      setListId(l.id);
                      setCandId(null);
                    }}
                  >
                    <span className="dot" aria-hidden />
                    <span style={{ fontWeight: 900, fontSize: 17 }}>{l.label}</span>
                    {listId === l.id ? <CheckCircle2 size={20} color="#47a76f" /> : <span />}
                  </button>
                ))}
              </div>
            </section>

            <section className="gv-stack" style={{ gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>2. Preferential vote <span className="gv-muted" style={{ fontSize: 14, fontWeight: 600 }}>(optional)</span></h2>
              {listId === null ? (
                <div className="gv-muted">Choose a list first — you may then give one preferential vote to a candidate on it from your district.</div>
              ) : candidates.length === 0 ? (
                <div className="gv-muted">This list has no candidates from your district.</div>
              ) : (
                <div role="radiogroup" aria-label="Preferential vote" className="gv-grid-auto">
                  {[{ id: null as number | null, label: "No preferential vote" }, ...candidates.map((c) => ({ id: c.id as number | null, label: c.label }))].map((c) => (
                    <button
                      key={String(c.id)}
                      type="button"
                      role="radio"
                      aria-checked={candId === c.id}
                      className="gv-choice"
                      data-testid={`cand-${c.id ?? "none"}`}
                      onClick={() => setCandId(c.id)}
                    >
                      <span className="dot" aria-hidden />
                      <span style={{ fontWeight: 800 }}>{c.label}</span>
                      <span />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <div className="gv-sticky-actions">
              <button type="button" className="gv-btn primary block" disabled={listId === null} onClick={encrypt} data-testid="encrypt">
                <Lock size={16} /> Encrypt my ballot
              </button>
            </div>
          </div>
        )}

        {step === "encrypting" && (
          <div className="gv-card gv-stack" aria-live="polite">
            <div style={{ fontWeight: 900 }}><Lock size={16} style={{ verticalAlign: -3 }} /> Encrypting on this device…</div>
            <ProgressBar value={progress} label="Encrypting and building zero-knowledge proofs" />
            <div className="gv-muted" style={{ fontSize: 13 }}>Your choice never leaves this browser unencrypted. This runs in the background so the page stays responsive.</div>
          </div>
        )}

        {(step === "decide" || step === "casting") && enc && (
          <div className="gv-stack">
            <div className="gv-card gv-stack">
              <div className="gv-row" style={{ gap: 8, fontWeight: 900 }}><ShieldCheck size={18} color="#47a76f" /> Ballot encrypted <span className="gv-muted" style={{ fontWeight: 600, fontSize: 13 }}>({enc.ms} ms)</span></div>
              <div>
                <div className="gv-muted" style={{ fontSize: 13, marginBottom: 6 }}>Your tracking code</div>
                <TrackingCode short={enc.tracking.short} full={enc.tracking.full} />
              </div>
              <div className="gv-muted" style={{ fontSize: 14 }}>
                You chose: <strong style={{ color: "var(--gov-ink)" }}>{selectionText(describeSelection(manifest, enc.secrets.selections))}</strong>
              </div>
            </div>

            <div className="gv-card gv-stack" style={{ gap: 10 }}>
              <div style={{ fontWeight: 900 }}>Cast it, or audit it first?</div>
              <ul className="gv-muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, fontSize: 14 }}>
                <li><strong>Cast</strong> submits this encrypted ballot. You'll get a receipt with the tracking code.</li>
                <li><strong>Audit</strong> proves this device encrypted exactly your choice: the ballot is opened, published as <em>audited</em> (not counted), and you encrypt again. Use it if you have any doubt.</li>
              </ul>
            </div>
            {castErr && <Notice kind="error">{castErr}</Notice>}

            <div className="gv-sticky-actions">
              <div className="gv-row" style={{ flexWrap: "nowrap" }}>
                <button type="button" className="gv-btn blue" style={{ flex: 1 }} onClick={doAudit} disabled={step === "casting"} data-testid="audit">
                  <Search size={16} /> Audit
                </button>
                <button type="button" className="gv-btn primary" style={{ flex: 2 }} onClick={cast} disabled={step === "casting"} data-testid="cast">
                  <Vote size={16} /> {step === "casting" ? "Casting…" : "Cast ballot"}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "audited" && audit && (
          <div className="gv-stack" data-testid="audit-result" data-ok={audit.ok}>
            <Notice kind={audit.ok ? "ok" : "error"}>
              {audit.ok ? (
                <><CheckCircle2 size={14} style={{ verticalAlign: -2 }} /> <strong>Audit passed.</strong> The ballot decrypts to exactly what you chose: {selectionText(describeSelection(manifest, audit.record.selections))}.</>
              ) : (
                <><XCircle size={14} style={{ verticalAlign: -2 }} /> <strong>Audit FAILED:</strong> {audit.reason}. This device did not encrypt what it showed you. Do not cast from it — use another device and report this.</>
              )}
            </Notice>
            <div className="gv-card gv-stack">
              <div>That spoiled ballot ({audit.short}) {audit.published ? "is now on the public bulletin board as audited. It will never be counted." : `could not be published: ${audit.error}`}</div>
              <div className="gv-muted" style={{ fontSize: 14 }}>
                Don't just trust this screen: check it independently on another device at{" "}
                <Link to={`/board/${eid}?code=${audit.short}`}>the bulletin board</Link> or run the <Link to={`/verify?election=${eid}`}>verifier</Link>.
              </div>
            </div>
            <div className="gv-sticky-actions">
              <button type="button" className="gv-btn primary block" onClick={() => { setAudit(null); setStep("choose"); }} data-testid="reencrypt">
                <RefreshCw size={16} /> Encrypt again
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
