import { Chrome, Laptop } from "lucide-react";

type OAuthButtonsProps = {
  busy?: boolean;
  onPick: (provider: "google" | "microsoft") => void;
};

export default function OAuthButtons({ busy, onPick }: OAuthButtonsProps) {
  return (
    <div className="govOAuthStack">
      <button
        type="button"
        className="govBtn govOAuthBtn"
        disabled={busy}
        onClick={() => onPick("google")}
      >
        <span className="govOAuthLeft">
          <Chrome size={18} />
          Continue with Google
        </span>
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>OAuth</span>
      </button>

      <button
        type="button"
        className="govBtn govOAuthBtn"
        disabled={busy}
        onClick={() => onPick("microsoft")}
      >
        <span className="govOAuthLeft">
          <Laptop size={18} />
          Continue with Microsoft
        </span>
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>OAuth</span>
      </button>
    </div>
  );
}
