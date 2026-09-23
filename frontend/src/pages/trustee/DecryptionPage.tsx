import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Unlock, CheckCircle2, Hourglass } from "lucide-react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import PageHeader from "../../components/common/PageHeader";
import Notice from "../../components/common/Notice";
import ProgressBar from "../../components/common/ProgressBar";
import KeyfileUnlock from "./KeyfileUnlock";
import { decryptionState, submitPartial, type DecryptionState } from "../../lib/api";
import { runCrypto } from "../../crypto/client";
import type { PartialShare } from "../../crypto/threshold";
import { useMe } from "../../lib/useMe";

/**
 * Decryption ceremony. The trustee opens their share file locally and computes
 * a partial decryption of each tally total with a Chaum–Pedersen proof. Only
 * aggregate totals are ever decrypted — never a single ballot.
 */
export default function DecryptionPage() {
  const { electionId } = useParams();
  const eid = Number(electionId);
  const { me } = useMe();
  const [st, setSt] = useState<DecryptionState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ submitted: number; needed: number; tally_status: string } | null>(null);

  const load = useCallback(() => decryptionState(eid).then(setSt).catch((e) => setErr(e.message)), [eid]);
  useEffect(() => {
    load();
  }, [load]);

  const mine = st ? st.submitted.includes(st.trustee_index) : false;

  async function decrypt(secret: { share: string; share_public_key: string }) {
    setBusy(true);
    setErr(null);
    try {
      const shares = await runCrypto<PartialShare[]>("partialDecrypt", { electionId: eid, index: st!.trustee_index, share: secret.share, aggregates: st!.aggregates });
      setDone(await submitPartial(eid, shares));
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardLayout userEmail={me?.email}>
      <div className="gv-page" style={{ maxWidth: 820 }}>
        <PageHeader pill={<><Unlock size={14} /> Decryption ceremony</>} title={st?.election.title ?? "Decryption"}>
          {st ? `You are trustee #${st.trustee_index}. ${st.threshold} partial decryptions are needed; ${st.submitted.length} submitted so far.` : "Loading…"}
        </PageHeader>
        {err && <Notice kind="error">{err}</Notice>}
        {st && (
          <div className="gv-stack">
            {st.election.tally_status === "none" && <Notice><Hourglass size={14} style={{ verticalAlign: -2 }} /> Polling hasn't closed yet (or the tally hasn't been formed). Nothing to decrypt.</Notice>}
            {st.election.tally_status === "published" && (
              <Notice kind="ok"><div data-testid="decrypt-published">Results are published.</div> <Link to={`/results/${eid}`}>See the results</Link> · <Link to={`/verify?election=${eid}`}>verify them</Link></Notice>
            )}
            {st.election.tally_status === "decrypting" && mine && <Notice kind="ok"><CheckCircle2 size={14} style={{ verticalAlign: -2 }} /> Your partial decryption was accepted. Waiting for {Math.max(0, st.threshold - st.submitted.length)} more.</Notice>}
            {st.election.tally_status === "decrypting" && !mine && (
              <>
                <Notice>The tally has {st.aggregates.length} encrypted totals. Load your decryption share to decrypt your part of each — with a proof that you did it honestly.</Notice>
                {busy && <div className="gv-card"><ProgressBar value={0.6} label="Computing partial decryptions and proofs" /></div>}
                <KeyfileUnlock<{ share: string; share_public_key: string }> electionId={eid} trusteeIndex={st.trustee_index} kind="share" title="Your decryption-share file" cta="Decrypt my part" onUnlocked={decrypt} />
              </>
            )}
            {done && <Notice kind="ok" role="status"><span data-testid="partial-accepted">Accepted.</span> {done.submitted}/{done.needed} — tally is now {done.tally_status}.</Notice>}
            <Link className="gv-btn" to="/trustee" style={{ justifySelf: "start" }}>Back to trustee duties</Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
