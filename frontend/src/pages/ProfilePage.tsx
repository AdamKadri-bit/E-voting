import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserRound, Fingerprint, Trash2, Plus, Lock, Plane, Home } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import DashboardLayout from "../components/layouts/DashboardLayout";
import PageHeader from "../components/common/PageHeader";
import Notice from "../components/common/Notice";
import { flag } from "../components/common/CountrySelect";
import { passkeyDelete, passkeyList, passkeyRegister, passkeyRegisterOptions } from "../lib/api";
import { useMe } from "../lib/useMe";

/** Profile: resident/diaspora status (read-only while locked) and passkeys (WebAuthn). */
export default function ProfilePage() {
  const { me, reload } = useMe();
  const [keys, setKeys] = useState<{ id: number; name: string; created_at: string; last_used_at: string | null }[]>([]);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const supported = typeof window !== "undefined" && !!window.PublicKeyCredential;

  const loadKeys = () => passkeyList().then((r) => setKeys(r.credentials)).catch(() => {});
  useEffect(() => {
    loadKeys();
  }, []);

  async function addPasskey() {
    setBusy(true);
    setMsg(null);
    try {
      const { options } = await passkeyRegisterOptions();
      const credential = await startRegistration({ optionsJSON: options });
      await passkeyRegister(credential, name || "Passkey");
      setName("");
      setMsg({ kind: "ok", text: "Passkey added. From now on, signing in asks for it after your password." });
      await loadKeys();
      await reload();
    } catch (e: any) {
      setMsg({ kind: "error", text: e?.name === "NotAllowedError" ? "Cancelled." : e.message });
    } finally {
      setBusy(false);
    }
  }

  const s = me?.voter_status;

  return (
    <DashboardLayout userEmail={me?.email}>
      <div className="gv-page" style={{ maxWidth: 820 }}>
        <PageHeader pill={<><UserRound size={14} /> Profile</>} title={me?.name ?? "Profile"}>{me?.email}</PageHeader>

        <div className="gv-stack">
          {me?.role === "voter" && (
            <div className="gv-card gv-stack" data-testid="profile-status">
              <div style={{ fontWeight: 900, fontSize: 18 }}>Voter status</div>
              <div className="gv-row" style={{ fontSize: 17 }}>
                {s?.voter_type === "diaspora" ? <Plane size={18} /> : <Home size={18} />}
                <strong>{s?.voter_type === "diaspora" ? `Diaspora — ${flag(me.voter_status.residence_country ?? "")} ${s.residence_country_name}` : s?.voter_type === "resident" ? "Resident (Lebanon)" : "Not chosen yet"}</strong>
              </div>
              {s?.locked ? (
                <Notice kind="warn"><Lock size={14} style={{ verticalAlign: -2 }} /> Locked while an election you can vote in is open ({s.locked_by.join(", ")}).</Notice>
              ) : (
                <Link className="gv-btn" to="/voter-status" style={{ justifySelf: "start" }}>Change status</Link>
              )}
            </div>
          )}

          <div className="gv-card gv-stack">
            <div className="gv-row" style={{ gap: 8, fontWeight: 900, fontSize: 18 }}><Fingerprint size={18} /> Passkeys (two-step sign-in)</div>
            <p className="gv-muted" style={{ margin: 0 }}>
              A passkey (Face ID, Touch ID, Windows Hello, or a security key) is asked for after your password. It can't be phished or reused on another site.
            </p>
            {!supported && <Notice kind="warn">This browser doesn't support passkeys.</Notice>}
            {keys.map((k) => (
              <div key={k.id} className="gv-row" style={{ justifyContent: "space-between", borderTop: "1px solid var(--gov-edge)", paddingTop: 10 }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{k.name}</div>
                  <div className="gv-muted" style={{ fontSize: 12 }}>Added {new Date(k.created_at).toLocaleDateString()}{k.last_used_at ? ` · last used ${new Date(k.last_used_at).toLocaleString()}` : ""}</div>
                </div>
                <button type="button" className="gv-btn danger" onClick={async () => { await passkeyDelete(k.id); loadKeys(); }} aria-label={`Remove ${k.name}`}>
                  <Trash2 size={16} /> Remove
                </button>
              </div>
            ))}
            <div className="gv-row">
              <input className="govInput" placeholder="Name (e.g. My phone)" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: "1 1 200px" }} maxLength={80} />
              <button type="button" className="gv-btn gold" onClick={addPasskey} disabled={!supported || busy}><Plus size={16} /> Add passkey</button>
            </div>
            {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
