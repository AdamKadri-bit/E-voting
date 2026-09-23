import { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";

/**
 * Big, readable tracking code with one-tap Copy and (on phones) the native
 * Share sheet. The full 64-hex hash sits underneath for exact lookups.
 */
export default function TrackingCode({ short, full, shareUrl }: { short: string; full?: string; shareUrl?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(short);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the code is still selectable */
    }
  }

  async function share() {
    try {
      await navigator.share?.({ title: "My ballot tracking code", text: `Ballot tracking code: ${short}`, url: shareUrl });
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="gv-code" aria-label={`Tracking code ${short.split("").join(" ")}`} data-testid="tracking-code">
        {short}
      </div>
      <div className="gv-row">
        <button type="button" className="gv-btn" onClick={copy}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Copied" : "Copy code"}
        </button>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button type="button" className="gv-btn" onClick={share}>
            <Share2 size={16} />
            Share
          </button>
        )}
      </div>
      {full && (
        <details>
          <summary className="gv-muted" style={{ cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center" }}>
            Full tracking hash
          </summary>
          <div className="gv-mono gv-muted" style={{ fontSize: 12 }}>{full}</div>
        </details>
      )}
    </div>
  );
}
