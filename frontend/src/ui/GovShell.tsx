import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  TreePine,
  Sun,
  Moon,
  Lock,
  Fingerprint,
  ScrollText,
  Shield,
  FileCheck2,
  Eye,
  Database,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Landmark,
  UserCheck,
} from "lucide-react";
import { useGovTheme } from "./useGovTheme";

type GovShellProps = {
  title: string;
  subtitle: string;
  right: ReactNode;
};

function SquarePill({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="govSquarePill">
      <div className="govSquarePillIcon" aria-hidden>
        {icon}
      </div>
      <div className="govSquarePillText">{text}</div>
    </div>
  );
}

function FeatureTile({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--gov-edge)",
        borderRadius: 16,
        padding: 16,
        background: "rgba(255,255,255,0.03)",
        minHeight: 122,
        display: "grid",
        gap: 8,
        alignContent: "start",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            border: "1px solid var(--gov-edge)",
            display: "grid",
            placeItems: "center",
            background: "rgba(201,162,39,0.08)",
          }}
          aria-hidden
        >
          {icon}
        </div>
        <div style={{ fontWeight: 900, letterSpacing: 0.2, fontSize: 13.5 }}>
          {title}
        </div>
      </div>

      <div style={{ color: "var(--gov-muted)", fontSize: 13, lineHeight: 1.55 }}>
        {text}
      </div>
    </div>
  );
}

export default function GovShell({ title, subtitle, right }: GovShellProps) {
  const { theme, toggle } = useGovTheme();
  const loc = useLocation();

  const heroRef = useRef<HTMLElement | null>(null);
  const authBoxRef = useRef<HTMLDivElement | null>(null);
  const pillBandRef = useRef<HTMLDivElement | null>(null);

  const [authVisible, setAuthVisible] = useState(true);
  const [showScrollHint, setShowScrollHint] = useState(false);

  const onLogin = loc.pathname.startsWith("/login");
  const onSignup = loc.pathname.startsWith("/signup");

  const jumpToAuth = () => {
    authBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  useEffect(() => {
    const el = authBoxRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries[0];
        setAuthVisible(Boolean(hit?.isIntersecting));
      },
      { root: null, threshold: 0.55 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Smart scroll hint:
  // - Hidden while user scrolls
  // - Shows only when at very top AND not scrolling
  // - Also hides if it would overlap (not enough free space between pills and hero bottom)
  useEffect(() => {
    let t: number | undefined;

    const compute = (isScrollingNow: boolean) => {
      const y = window.scrollY || 0;

      // only show near top + not actively scrolling
      const topEnough = y < 8;
      if (!topEnough || isScrollingNow) {
        setShowScrollHint(false);
        return;
      }

      const heroEl = heroRef.current;
      const pillEl = pillBandRef.current;

      if (!heroEl || !pillEl) {
        // fallback: show at top when idle
        setShowScrollHint(true);
        return;
      }

      const heroRect = heroEl.getBoundingClientRect();
      const pillRect = pillEl.getBoundingClientRect();

      // free vertical space from bottom of pill band to bottom of hero
      const free = heroRect.bottom - pillRect.bottom;

      // hint needs clearance (text + mouse + breathing room)
      const hasRoom = free > 90;

      setShowScrollHint(hasRoom);
    };

    const onScroll = () => {
      // hide immediately while scrolling
      setShowScrollHint(false);

      // debounce to detect "stopped scrolling"
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => compute(false), 180);

      // while scrolling
      compute(true);
    };

    const onResize = () => compute(false);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    // initial compute
    compute(false);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (t) window.clearTimeout(t);
    };
  }, []);

  const topActions = useMemo(() => {
    if (!authVisible) {
      return (
        <>
          <button
            type="button"
            className="govBtn"
            onClick={jumpToAuth}
            style={{ padding: "10px 12px" }}
            title="Jump to sign in/up"
          >
            Jump to form
          </button>

          <Link
            to="/login"
            className="govBtn"
            style={{
              padding: "10px 12px",
              borderColor: onLogin ? "rgba(201,162,39,0.62)" : "var(--gov-edge)",
              background: onLogin
                ? "rgba(201,162,39,0.14)"
                : "rgba(255,255,255,0.05)",
            }}
          >
            Sign in
          </Link>

          <Link
            to="/signup"
            className="govBtn"
            style={{
              padding: "10px 12px",
              borderColor: onSignup ? "rgba(201,162,39,0.62)" : "var(--gov-edge)",
              background: onSignup
                ? "rgba(201,162,39,0.14)"
                : "rgba(255,255,255,0.05)",
            }}
          >
            Sign up
          </Link>
        </>
      );
    }
    return null;
  }, [authVisible, onLogin, onSignup]);

  return (
    <>
      <header className="govTopBar">
        <div className="govTopBarLeft">
          <div className="govSealBox" aria-hidden>
            <TreePine size={22} />
          </div>

          <div>
            <div className="govBrandTitle" style={{ lineHeight: 1.1 }}>
              Lebanon Secure E-Voting
            </div>
            <div className="govBrandSub">
              Official portal prototype • Integrity-first
              <span style={{ marginLeft: 10, opacity: 0.8 }}>بوابة اقتراع آمنة</span>
            </div>
          </div>
        </div>

        <div className="govTopBarRight">
          {topActions}
          <button
            type="button"
            className="govBtn"
            onClick={toggle}
            aria-label="Toggle theme"
            title="Toggle theme"
            style={{ padding: "10px 12px" }}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <main className="govMain">
        <section className="govHero" ref={heroRef}>
          <div className="govHeroInner">
            {/* centered auth */}
            <div className="govAuthCardWrap" ref={authBoxRef}>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontWeight: 950, letterSpacing: 0.2, fontSize: 24 }}>
                  Your vote. Verifiable. Protected.
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: "var(--gov-muted)",
                    fontSize: 14,
                    lineHeight: 1.55,
                  }}
                >
                  A Lebanon-aligned voting portal designed for transparency, auditability,
                  and voter trust.
                </div>
              </div>

              <div
                style={{
                  border: "1px solid var(--gov-edge)",
                  borderRadius: 18,
                  background:
                    "linear-gradient(180deg, var(--gov-card) 0%, var(--gov-card2) 100%)",
                  boxShadow: "var(--gov-shadow)",
                  padding: 21,
                }}
              >
                {right}
              </div>
            </div>

            {/* FULL-WIDTH tiles band */}
            <div className="govPillBand" ref={pillBandRef}>
              <div className="govPillGrid">
                <SquarePill icon={<Lock size={18} />} text="Encrypted ballots (no plaintext stored)" />
                <SquarePill
                  icon={<Fingerprint size={18} />}
                  text="Receipt inclusion checks (verifiable)"
                />
                <SquarePill
                  icon={<ScrollText size={18} />}
                  text="Audit evidence trail (tamper-detectable)"
                />
                <SquarePill icon={<Shield size={18} />} text="Identity separated from ballot content" />
              </div>
            </div>
          </div>

          {/* Scroll indicator (auto hides on overlap / scroll / not-top) */}
          <div className={`govScrollHintWrap ${showScrollHint ? "" : "isHidden"}`}>
            <div className="govScrollHintText">Scroll to learn more</div>
            <div className="govScrollMouse">
              <div className="govScrollDot" />
            </div>
          </div>
        </section>

        <section className="govSections">
          <div className="govSectionCard">
            <h2 className="govSectionTitle">{title}</h2>
            <p className="govSectionText">{subtitle}</p>
          </div>

          <div className="govSectionCard">
            <h2 className="govSectionTitle">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <Landmark size={18} /> Legal alignment (Lebanon)
              </span>
            </h2>
            <p className="govSectionText">
              This prototype is structured to match Lebanon’s election model at a system level:
              voting is tied to the voter’s registered area, and eligibility checks are enforced
              (for example, voting age rules). It references the parliamentary election framework
              (Law 44/2017) for constituency-style structure and compliance-driven constraints.
            </p>
          </div>

          <div className="govSectionCard">
            <h2 className="govSectionTitle">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <Scale size={18} /> Integrity & transparency
              </span>
            </h2>
            <p className="govSectionText">
              The system is designed to produce evidence: encrypted submissions, verifiable inclusion
              receipts, and logged administrative actions. This supports auditability while keeping
              individual vote choices private.
            </p>

            <div className="govFeatureGrid">
              <FeatureTile
                icon={<FileCheck2 size={18} />}
                title="Verifiable election artifacts"
                text="Artifacts are structured so auditors can verify that reported results match what was recorded."
              />
              <FeatureTile
                icon={<Eye size={18} />}
                title="Auditability without exposing votes"
                text="Verification focuses on inclusion and integrity evidence, not revealing ballot selections."
              />
            </div>
          </div>

          <div className="govSectionCard">
            <h2 className="govSectionTitle">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <Database size={18} /> Data security & privacy
              </span>
            </h2>
            <p className="govSectionText">
              Sensitive data is handled with minimum-necessary exposure. Registry identity data and
              ballot data are separated to reduce correlation risk and to limit breach impact.
              Operational logs and audit logs serve different purposes.
            </p>

            <div className="govFeatureGrid">
              <FeatureTile
                icon={<UserCheck size={18} />}
                title="Eligibility enforcement"
                text="Eligibility is enforced at the system boundary (voter status, election constraints, and registered-area mapping)."
              />
              <FeatureTile
                icon={<Shield size={18} />}
                title="Accountability controls"
                text="Role-based access limits actions; critical actions are logged for review and accountability."
              />
            </div>
          </div>

          <div className="govSectionCard">
            <h2 className="govSectionTitle">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <CheckCircle2 size={18} /> Voter trust
              </span>
            </h2>
            <p className="govSectionText">
              Trust is earned by clarity: what the system guarantees, what it can verify, and what
              it cannot fully guarantee in remote environments. This transparency is part of the
              product and part of the defense.
            </p>
          </div>

          <div className="govSectionCard">
            <h2 className="govSectionTitle">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <AlertTriangle size={18} /> Remote voting limitation
              </span>
            </h2>
            <p className="govSectionText">
              Remote voting cannot fully prevent coercion in the voter’s environment. This limitation
              is documented explicitly to avoid false security claims. The focus remains on integrity,
              audit evidence, and verification of recorded results.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
