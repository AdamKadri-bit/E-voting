import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  clickable?: boolean;
  onClick?: () => void;
};

export function Card({ children, clickable = false, onClick }: CardProps) {
  return (
    <div
      style={{
        border: "1px solid var(--gov-edge)",
        borderRadius: "16px",
        background: "linear-gradient(180deg, var(--gov-card) 0%, var(--gov-card2) 100%)",
        boxShadow: "var(--gov-shadow)",
        padding: "20px",
        cursor: clickable ? "pointer" : "default",
        transition: clickable ? "all 150ms ease" : "none",
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (clickable) {
          e.currentTarget.style.borderColor = "rgba(201,162,39,0.4)";
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
        }
      }}
      onMouseLeave={(e) => {
        if (clickable) {
          e.currentTarget.style.borderColor = "var(--gov-edge)";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "var(--gov-shadow)";
        }
      }}
    >
      {children}
    </div>
  );
}

type SectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function Section({ title, description, children }: SectionProps) {
  return (
    <div>
      <h2 style={{ fontSize: "24px", fontWeight: 900, margin: "0 0 12px", letterSpacing: 0.2 }}>
        {title}
      </h2>
      {description && (
        <p style={{ fontSize: "14px", color: "var(--gov-muted)", margin: "0 0 24px" }}>
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

type BadgeProps = {
  label: string;
  variant?: "default" | "success" | "warning" | "error" | "info";
};

export function Badge({ label, variant = "default" }: BadgeProps) {
  const variants: Record<string, { bg: string; color: string }> = {
    default: {
      bg: "rgba(201,162,39,0.15)",
      color: "var(--gov-gold)",
    },
    success: {
      bg: "rgba(71,167,111,0.15)",
      color: "#47a76f",
    },
    warning: {
      bg: "rgba(217,119,6,0.15)",
      color: "#d97706",
    },
    error: {
      bg: "rgba(255,107,107,0.15)",
      color: "var(--gov-alert)",
    },
    info: {
      bg: "rgba(59,130,246,0.15)",
      color: "#3b82f6",
    },
  };

  const style = variants[variant] || variants.default;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: "8px",
        background: style.bg,
        color: style.color,
        fontSize: "12px",
        fontWeight: 600,
        letterSpacing: 0.3,
      }}
    >
      {label}
    </span>
  );
}

type StatusIndicatorProps = {
  status: "active" | "inactive" | "pending" | "error";
  label?: string;
};

export function StatusIndicator({ status, label }: StatusIndicatorProps) {
  const colors: Record<string, string> = {
    active: "#47a76f",
    inactive: "rgba(255,255,255,0.3)",
    pending: "#d97706",
    error: "var(--gov-alert)",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: colors[status],
          animation: status === "active" ? "pulse 2s infinite" : "none",
        }}
      />
      <span style={{ fontSize: "12px", color: "var(--gov-muted)" }}>
        {label || status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </div>
  );
}

type MetricProps = {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
};

export function Metric({ label, value, subtext, icon }: MetricProps) {
  return (
    <div
      style={{
        display: "grid",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {icon && (
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              border: "1px solid var(--gov-edge)",
              display: "grid",
              placeItems: "center",
              background: "rgba(201,162,39,0.08)",
              color: "var(--gov-gold)",
            }}
          >
            {icon}
          </div>
        )}
        <div>
          <div style={{ fontSize: "13px", color: "var(--gov-muted)" }}>{label}</div>
          <div style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px" }}>
            {value}
          </div>
        </div>
      </div>
      {subtext && (
        <p style={{ fontSize: "12px", color: "var(--gov-muted)", margin: 0 }}>
          {subtext}
        </p>
      )}
    </div>
  );
}

type DividerProps = {
  text?: string;
};

export function Divider({ text }: DividerProps) {
  return (
    <div className="govDivider">
      {text}
    </div>
  );
}
