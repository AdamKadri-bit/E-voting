import type { ReactNode } from "react";
import React from "react";
import { Clock, Lock, CheckCircle2 } from "lucide-react";
import { Card, Badge } from "../common/Card";

type ElectionCardProps = {
  id: string;
  title: string;
  status: "open" | "closed" | "upcoming";
  startTime?: Date;
  endTime?: Date;
  totalCandidates?: number;
  votedAt?: Date;
  onClick?: () => void;
};

export function ElectionCard({
  title,
  status,
  startTime,
  endTime,
  totalCandidates = 0,
  votedAt,
  onClick,
}: Omit<ElectionCardProps, 'id'>) {
  const getStatusBadgeVariant = () => {
    switch (status) {
      case "open":
        return "success";
      case "closed":
        return "default";
      case "upcoming":
        return "info";
      default:
        return "default";
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "open":
        return "Voting Open";
      case "closed":
        return "Closed";
      case "upcoming":
        return "Upcoming";
      default:
        return "Unknown";
    }
  };

  const formatTime = (date?: Date) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <Card clickable={status === "open"} onClick={onClick}>
      <div style={{ display: "grid", gap: "16px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
            {title}
          </h3>
          <Badge label={getStatusLabel()} variant={getStatusBadgeVariant()} />
        </div>

        {/* Content */}
        <div style={{ display: "grid", gap: "12px" }}>
          {/* Timing */}
          {startTime && endTime && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "12px",
                color: "var(--gov-muted)",
              }}
            >
              <Clock size={14} />
              <div>
                <div>Start: {formatTime(startTime)}</div>
                <div>End: {formatTime(endTime)}</div>
              </div>
            </div>
          )}

          {/* Candidates */}
          {totalCandidates > 0 && (
            <div
              style={{
                fontSize: "12px",
                color: "var(--gov-muted)",
              }}
            >
              {totalCandidates} {totalCandidates === 1 ? "candidate" : "candidates"}
            </div>
          )}

          {/* Vote Status */}
          {votedAt && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                color: "#47a76f",
              }}
            >
              <CheckCircle2 size={14} />
              Voted on {formatTime(votedAt)}
            </div>
          )}
        </div>

        {/* CTA */}
        {status === "open" && !votedAt && (
          <button
            className="govBtn govBtnPrimary"
            style={{ width: "100%", justifyContent: "center", padding: "11px 12px" }}
          >
            Cast Your Vote
          </button>
        )}
      </div>
    </Card>
  );
}

type VoteCandidateProps = {
  id: string;
  name: string;
  party?: string;
  biography?: string;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
};

export function VoteCandidate({
  id,
  name,
  party,
  biography,
  isSelected = false,
  onSelect = () => {},
}: VoteCandidateProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      style={{
        padding: "16px",
        borderRadius: "12px",
        border: isSelected ? "2px solid var(--gov-gold)" : "1px solid var(--gov-edge)",
        background: isSelected
          ? "rgba(201,162,39,0.1)"
          : "rgba(255,255,255,0.03)",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 150ms ease",
        width: "100%",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = "rgba(201,162,39,0.4)";
          e.currentTarget.style.background = "rgba(255,255,255,0.06)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = "var(--gov-edge)";
          e.currentTarget.style.background = "rgba(255,255,255,0.03)";
        }
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <h4 style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: 700 }}>
            {name}
          </h4>
          {party && (
            <p style={{ margin: "0 0 8px", fontSize: "12px", color: "var(--gov-muted)" }}>
              {party}
            </p>
          )}
          {biography && (
            <p style={{ margin: 0, fontSize: "12px", color: "var(--gov-muted)", lineHeight: 1.5 }}>
              {biography}
            </p>
          )}
        </div>
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "6px",
            border: isSelected ? "2px solid var(--gov-gold)" : "1px solid var(--gov-edge)",
            background: isSelected ? "var(--gov-gold)" : "transparent",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            marginTop: "2px",
          }}
        >
          {isSelected && (
            <CheckCircle2 size={16} color="var(--gov-bg)" strokeWidth={3} />
          )}
        </div>
      </div>
    </button>
  );
}

type SecurityBannerProps = {
  message: string;
  icon?: ReactNode;
  variant?: "info" | "success" | "warning";
};

export function SecurityBanner({
  message,
  icon = <Lock size={16} />,
  variant = "info",
}: SecurityBannerProps) {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    info: {
      bg: "rgba(59,130,246,0.1)",
      border: "rgba(59,130,246,0.3)",
      text: "#3b82f6",
    },
    success: {
      bg: "rgba(71,167,111,0.1)",
      border: "rgba(71,167,111,0.3)",
      text: "#47a76f",
    },
    warning: {
      bg: "rgba(217,119,6,0.1)",
      border: "rgba(217,119,6,0.3)",
      text: "#d97706",
    },
  };

  const style = colors[variant];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px 16px",
        borderRadius: "12px",
        border: `1px solid ${style.border}`,
        background: style.bg,
        color: style.text,
        fontSize: "13px",
      }}
    >
      {icon}
      <span>{message}</span>
    </div>
  );
}

type ReceiptProps = {
  voteHash: string;
  encryptionKey?: string;
  timestamp?: Date;
  election?: string;
};

export function VoteReceipt({
  voteHash,
  encryptionKey,
  timestamp,
  election,
}: ReceiptProps) {
  return (
    <div
      style={{
        borderRadius: "12px",
        border: "1px solid var(--gov-edge)",
        background: "rgba(255,255,255,0.02)",
        padding: "20px",
        fontFamily: "monospace",
      }}
    >
      <div style={{ display: "grid", gap: "16px" }}>
        {election && (
          <div>
            <div style={{ fontSize: "11px", color: "var(--gov-muted)", marginBottom: "6px" }}>
              ELECTION
            </div>
            <div style={{ fontSize: "13px", wordBreak: "break-all" }}>
              {election}
            </div>
          </div>
        )}

        {timestamp && (
          <div>
            <div style={{ fontSize: "11px", color: "var(--gov-muted)", marginBottom: "6px" }}>
              TIMESTAMP
            </div>
            <div style={{ fontSize: "13px" }}>
              {timestamp.toISOString()}
            </div>
          </div>
        )}

        <div>
          <div style={{ fontSize: "11px", color: "var(--gov-muted)", marginBottom: "6px" }}>
            VOTE HASH (Keep safe)
          </div>
          <div style={{ fontSize: "13px", wordBreak: "break-all", color: "var(--gov-gold)" }}>
            {voteHash}
          </div>
        </div>

        {encryptionKey && (
          <div>
            <div style={{ fontSize: "11px", color: "var(--gov-muted)", marginBottom: "6px" }}>
              ENCRYPTION KEY
            </div>
            <div style={{ fontSize: "13px", wordBreak: "break-all", color: "var(--gov-gold)" }}>
              {encryptionKey}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type CountdownTimerProps = {
  endTime: Date;
};

export function CountdownTimer({ endTime }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = React.useState("");

  React.useEffect(() => {
    const calculate = () => {
      const now = new Date();
      const diff = endTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Voting closed");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "13px",
        fontWeight: 600,
      }}
    >
      <Clock size={16} />
      <span>{timeLeft}</span>
    </div>
  );
}
