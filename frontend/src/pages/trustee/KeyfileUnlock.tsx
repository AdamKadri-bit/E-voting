import { useState } from "react";
import { Upload, Unlock } from "lucide-react";
import Notice from "../../components/common/Notice";
import ProgressBar from "../../components/common/ProgressBar";
import { runCrypto } from "../../crypto/client";
import type { Keyfile } from "../../crypto/keyfile";

/** Loads a trustee key file and unlocks it with its passphrase (in the worker). */
export default function KeyfileUnlock<T>({
  electionId,
  trusteeIndex,
  kind,
  title,
  onUnlocked,
  cta = "Unlock",
}: {
  electionId: number;
  trusteeIndex: number;
  kind: "ceremony" | "share";
  title: string;
  onUnlocked: (secret: T, file: Keyfile) => void | Promise<void>;
  cta?: string;
}) {
  const [file, setFile] = useState<Keyfile | null>(null);
  const [fileName, setFileName] = useState("");
  const [pass, setPass] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function unlock() {
    if (!file) return;
    setErr(null);
    if (file.meta.election_id !== electionId || file.meta.trustee_index !== trusteeIndex || file.meta.kind !== kind) {
      setErr(`This is not your ${kind === "share" ? "decryption share" : "ceremony"} file for this election (it's for election ${file.meta.election_id}, trustee ${file.meta.trustee_index}, ${file.meta.kind}).`);
      return;
    }
    setProgress(0);
    try {
      const secret = await runCrypto<T>("openKeyfile", { file, passphrase: pass }, (p) => setProgress(p));
      await onUnlocked(secret, file);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="gv-card gv-stack">
      <div style={{ fontWeight: 900 }}>{title}</div>
      <label className="gv-btn" style={{ cursor: "pointer", justifySelf: "start" }}>
        <Upload size={16} /> {fileName || "Choose key file (.evkey)"}
        <input
          type="file"
          accept=".evkey,application/json"
          hidden
          data-testid="keyfile-input"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setFileName(f.name);
            try {
              setFile(JSON.parse(await f.text()));
              setErr(null);
            } catch {
              setErr("That file is not a key file.");
            }
          }}
        />
      </label>
      <label className="govLabel">
        <span>Passphrase</span>
        <input className="govInput" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} data-testid="keyfile-pass" />
      </label>
      {progress !== null && <ProgressBar value={progress} label="Unlocking (Argon2id)" />}
      {err && <Notice kind="error">{err}</Notice>}
      <button type="button" className="gv-btn gold" disabled={!file || pass.length < 1 || progress !== null} onClick={unlock} data-testid="keyfile-unlock">
        <Unlock size={16} /> {cta}
      </button>
    </div>
  );
}
