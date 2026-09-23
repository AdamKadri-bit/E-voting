import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { KeyRound, Download, CheckCircle2, Hourglass, ShieldCheck } from "lucide-react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import PageHeader from "../../components/common/PageHeader";
import Notice from "../../components/common/Notice";
import ProgressBar from "../../components/common/ProgressBar";
import KeyfileUnlock from "./KeyfileUnlock";
import { ceremonyState, incomingShares, submitRound1, submitRound2, submitRound3, type CeremonyState } from "../../lib/api";
import { runCrypto } from "../../crypto/client";
import { MIN_PASSPHRASE, type Keyfile } from "../../crypto/keyfile";
import type { EncryptedShare, Round1Public, Round1Secret, Round3Result } from "../../crypto/threshold";
import { downloadText } from "../../lib/download";
import { useMe } from "../../lib/useMe";

/**
 * Key ceremony (distributed key generation), run in each trustee's browser.
 *   Round 1: generate polynomial + communication key; publish commitments with proofs.
 *   Round 2: send each other trustee its share, sealed to their key.
 *   Round 3: open and check received shares, save the final share to an
 *            encrypted file, prove the file can be re-opened, then confirm.
 * The ceremony secrets live only in this tab's memory and in the trustee's
 * encrypted files.
 */
export default function KeyCeremonyPage() {
  const { electionId } = useParams();
  const eid = Number(electionId);
  const { me } = useMe();
  const [state, setState] = useState<CeremonyState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [secret, setSecret] = useState<Round1Secret | null>(null);
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [kdf, setKdf] = useState<number | null>(null);
  const [r3, setR3] = useState<Round3Result | null>(null);
  const [finalFile, setFinalFile] = useState<Keyfile | null>(null);
  const [backupChecked, setBackupChecked] = useState(false);
  const [ack, setAck] = useState(false);

  const load = useCallback(async () => {
    try {
      setState(await ceremonyState(eid));
    } catch (e: any) {
      setErr(e.message);
    }
  }, [eid]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const idx = state?.me?.trustee_index ?? 0;
  const passOk = pass.length >= MIN_PASSPHRASE && pass === pass2;
  const fileBase = `election-${eid}-trustee-${idx}`;

  async function doRound1() {
    setBusy("Generating your key material");
    setErr(null);
    try {
      const { pub, secret: s } = await runCrypto<{ pub: Round1Public; secret: Round1Secret }>("round1", { electionId: eid, index: idx, threshold: state!.threshold });
      setBusy("Protecting your ceremony file");
      const file = await runCrypto<Keyfile>("sealKeyfile", { meta: { kind: "ceremony", election_id: eid, trustee_index: idx }, secret: s, passphrase: pass }, (p) => setKdf(p));
      downloadText(`${fileBase}-ceremony.evkey`, JSON.stringify(file, null, 2));
      const { trustee_index: _drop, ...body } = pub;
      void _drop;
      await submitRound1(eid, body);
      setSecret(s);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
      setKdf(null);
    }
  }

  async function doRound2(s: Round1Secret) {
    setBusy("Sealing a share for each trustee");
    setErr(null);
    try {
      const others = state!.trustees.map((t) => ({ trustee_index: t.trustee_index, comm_public_key: t.round1!.comm_public_key }));
      const shares = await runCrypto<EncryptedShare[]>("round2", { electionId: eid, index: idx, secret: s, others });
      await submitRound2(eid, shares);
      setSecret(s);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function doRound3(s: Round1Secret) {
    setBusy("Opening and checking the shares sent to you");
    setErr(null);
    try {
      const incoming = (await incomingShares(eid)).shares;
      const all = state!.trustees.map((t) => t.round1!);
      const res = await runCrypto<Round3Result>("round3", { electionId: eid, index: idx, secret: s, all, incoming });
      setSecret(s);
      setR3(res);
      if (res.complaints.length) {
        await submitRound3(eid, null, res.complaints);
        await load();
        return;
      }
      setBusy("Protecting your decryption share");
      const file = await runCrypto<Keyfile>(
        "sealKeyfile",
        { meta: { kind: "share", election_id: eid, trustee_index: idx }, secret: { share: res.share, share_public_key: res.share_public_key, joint_public_key: res.joint_public_key }, passphrase: pass },
        (p) => setKdf(p)
      );
      setFinalFile(file);
      downloadText(`${fileBase}-decryption-share.evkey`, JSON.stringify(file, null, 2));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
      setKdf(null);
    }
  }

  async function finish() {
    setBusy("Confirming");
    try {
      await submitRound3(eid, r3!.share_public_key, []);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  }

  const needSecret = (label: string, then: (s: Round1Secret) => void) =>
    secret ? (
      <button type="button" className="gv-btn gold" disabled={!!busy} onClick={() => then(secret)} data-testid="ceremony-continue">{label}</button>
    ) : (
      <KeyfileUnlock<Round1Secret> electionId={eid} trusteeIndex={idx} kind="ceremony" title="Load your ceremony file from round 1" cta={label} onUnlocked={(s) => then(s)} />
    );

  const passFields = (
    <div className="gv-stack" style={{ gap: 10 }}>
      <label className="govLabel">
        <span>Key-file passphrase (at least {MIN_PASSPHRASE} characters)</span>
        <input className="govInput" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} data-testid="ceremony-pass" />
      </label>
      <label className="govLabel">
        <span>Repeat passphrase</span>
        <input className="govInput" type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} data-testid="ceremony-pass2" />
      </label>
      {pass2 && pass !== pass2 && <div className="govError">Passphrases don't match.</div>}
    </div>
  );

  const me_ = state?.me;
  const phase = state?.phase;

  return (
    <DashboardLayout userEmail={me?.email}>
      <div className="gv-page" style={{ maxWidth: 880 }}>
        <PageHeader pill={<><KeyRound size={14} /> Key ceremony</>} title={state?.election?.title ?? "Key ceremony"}>
          {state ? `You are trustee #${idx}. ${state.threshold} of ${state.trustee_count} trustees will be needed to decrypt the result.` : "Loading…"}
        </PageHeader>
        {err && <div style={{ marginBottom: 12 }}><Notice kind="error">{err}</Notice></div>}

        {state && (
          <div className="gv-stack">
            <div className="gv-card">
              <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6 }}>
                {state.trustees.map((t) => (
                  <li key={t.trustee_index} className="gv-row" style={{ justifyContent: "space-between" }}>
                    <span>#{t.trustee_index} {t.name}{t.trustee_index === idx ? " (you)" : ""}</span>
                    <span className="gv-muted" style={{ fontSize: 13 }}>
                      R1 {t.round1_done ? "✓" : "…"} · R2 {t.round2_done ? "✓" : "…"} · R3 {t.round3_done ? "✓" : "…"}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {busy && <div className="gv-card"><ProgressBar value={kdf ?? 0.5} label={busy} /></div>}

            {phase === "round1" && !me_?.round1_done && (
              <div className="gv-card gv-stack" data-testid="round1">
                <div style={{ fontWeight: 900 }}>Round 1 — generate your key share</div>
                <p className="gv-muted" style={{ margin: 0 }}>Your browser creates your secret key material and publishes only public commitments with proofs. A passphrase-protected ceremony file downloads — keep it until the ceremony finishes.</p>
                {passFields}
                <button type="button" className="gv-btn gold" disabled={!passOk || !!busy} onClick={doRound1} data-testid="round1-go">
                  <KeyRound size={16} /> Generate and publish
                </button>
              </div>
            )}

            {phase === "round2" && !me_?.round2_done && (
              <div className="gv-stack" data-testid="round2">
                <Notice>Round 2 — every trustee has published. Send each trustee their share (sealed so only they can open it).</Notice>
                {needSecret("Send my shares", doRound2)}
              </div>
            )}

            {phase === "round3" && !me_?.round3_done && !r3 && (
              <div className="gv-stack" data-testid="round3">
                <Notice>Round 3 — open the shares sent to you, check them against the public commitments, and save your final decryption share.</Notice>
                {passFields}
                {needSecret("Check shares and create my decryption share", (s) => {
                  if (!pass || pass.length < MIN_PASSPHRASE) {
                    setErr(`Choose a passphrase of at least ${MIN_PASSPHRASE} characters for your decryption share first.`);
                    return;
                  }
                  doRound3(s);
                })}
              </div>
            )}

            {r3 && r3.complaints.length > 0 && (
              <Notice kind="error">Shares from trustee(s) {r3.complaints.join(", ")} failed verification. The ceremony has been stopped; an administrator must reset it.</Notice>
            )}

            {r3 && finalFile && !me_?.round3_done && (
              <div className="gv-stack" data-testid="backup">
                <Notice kind="warn">
                  <strong>Save your decryption share now.</strong> It downloaded as <code>{fileBase}-decryption-share.evkey</code>. Without it (or its passphrase) you can't help decrypt the result. Store it somewhere safe and offline.
                </Notice>
                <button type="button" className="gv-btn" onClick={() => downloadText(`${fileBase}-decryption-share.evkey`, JSON.stringify(finalFile, null, 2))}>
                  <Download size={16} /> Download again
                </button>
                {!backupChecked ? (
                  <KeyfileUnlock<{ share: string }>
                    electionId={eid}
                    trusteeIndex={idx}
                    kind="share"
                    title="Prove your backup works: select the saved file and enter its passphrase"
                    cta="Check my backup"
                    onUnlocked={(s) => {
                      if (s.share !== r3.share) throw new Error("That file holds a different share. Select the file you just saved.");
                      setBackupChecked(true);
                    }}
                  />
                ) : (
                  <Notice kind="ok"><CheckCircle2 size={14} style={{ verticalAlign: -2 }} /> Backup opened and matches.</Notice>
                )}
                <label className="gv-row" style={{ gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} disabled={!backupChecked} data-testid="backup-ack" />
                  <span>I have stored my decryption-share file and remember its passphrase.</span>
                </label>
                <button type="button" className="gv-btn primary" disabled={!backupChecked || !ack || !!busy} onClick={finish} data-testid="round3-finish">
                  <ShieldCheck size={16} /> Finish the ceremony
                </button>
              </div>
            )}

            {phase && ["round1", "round2", "round3"].includes(phase) && me_?.[`${phase}_done` as "round1_done"] && (
              <Notice><Hourglass size={14} style={{ verticalAlign: -2 }} /> Done for now — waiting for the other trustees. This page refreshes itself.</Notice>
            )}

            {phase === "complete" && (
              <Notice kind="ok">
                <div data-testid="ceremony-complete"><strong>Key ceremony complete.</strong> Election public key:</div>
                <div className="gv-mono" style={{ fontSize: 12 }}>{state.joint_public_key}</div>
              </Notice>
            )}
            {phase === "failed" && <Notice kind="error">The ceremony failed after a trustee complaint. An administrator must reset it.</Notice>}

            <Link className="gv-btn" to="/trustee" style={{ justifySelf: "start" }}>Back to trustee duties</Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
