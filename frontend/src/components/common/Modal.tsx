import type { ReactNode } from "react";
import { X } from "lucide-react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "500px",
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1001,
          maxWidth: maxWidth,
          width: "calc(100% - 32px)",
        }}
      >
        <div
          style={{
            border: "1px solid var(--gov-edge)",
            borderRadius: "18px",
            background: "linear-gradient(180deg, var(--gov-card) 0%, var(--gov-card2) 100%)",
            boxShadow: "var(--gov-shadow)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "16px",
              padding: "24px 24px 12px",
              borderBottom: "1px solid var(--gov-edge)",
            }}
          >
            <div>
              <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 700 }}>
                {title}
              </h3>
              {description && (
                <p
                  style={{
                    margin: 0,
                    fontSize: "13px",
                    color: "var(--gov-muted)",
                  }}
                >
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="govBtn"
              style={{ padding: "8px" }}
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div
            style={{
              padding: "24px",
            }}
          >
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid var(--gov-edge)",
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

type AlertProps = {
  variant: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
};

export function Alert({ variant, title, message }: AlertProps) {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    success: {
      bg: "rgba(71,167,111,0.1)",
      border: "rgba(71,167,111,0.3)",
      text: "#47a76f",
    },
    error: {
      bg: "rgba(255,107,107,0.1)",
      border: "rgba(255,107,107,0.3)",
      text: "var(--gov-alert)",
    },
    warning: {
      bg: "rgba(217,119,6,0.1)",
      border: "rgba(217,119,6,0.3)",
      text: "#d97706",
    },
    info: {
      bg: "rgba(59,130,246,0.1)",
      border: "rgba(59,130,246,0.3)",
      text: "#3b82f6",
    },
  };

  const style = colors[variant];

  return (
    <div
      style={{
        padding: "16px 16px",
        borderRadius: "12px",
        border: `1px solid ${style.border}`,
        background: style.bg,
        color: style.text,
      }}
    >
      {title && (
        <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: "14px" }}>
          {title}
        </p>
      )}
      <p style={{ margin: 0, fontSize: "13px" }}>
        {message}
      </p>
    </div>
  );
}

type ButtonGroupProps = {
  children: ReactNode;
};

export function ButtonGroup({ children }: ButtonGroupProps) {
  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
      {children}
    </div>
  );
}

type ButtonProps = {
  children: ReactNode;
  variant?: "default" | "primary" | "danger";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
};

export function Button({
  children,
  variant = "default",
  size = "md",
  onClick,
  disabled = false,
  type = "button",
}: ButtonProps) {
  const sizeStyles: Record<string, string> = {
    sm: "padding: 8px 10px; font-size: 12px;",
    md: "padding: 11px 12px; font-size: 13px;",
    lg: "padding: 14px 16px; font-size: 14px;",
  };

  const className =
    variant === "primary" ? "govBtnPrimary" : variant === "danger" ? "govBtnDanger" : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`govBtn ${className}`}
      style={{
        ...Object.fromEntries(
          sizeStyles[size].split("; ").map((s) => {
            const [k, v] = s.split(": ");
            return [k, v];
          })
        ),
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      } as any}
    >
      {children}
    </button>
  );
}

// Add danger button styling to index.css if not present
type FormFieldProps = {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
};

export function FormField({ label, required = false, error, children }: FormFieldProps) {
  return (
    <label className="govLabel">
      <span>
        {label}
        {required && <span style={{ color: "var(--gov-alert)" }}> *</span>}
      </span>
      {children}
      {error && (
        <span className="govError" style={{ marginTop: "4px", display: "block" }}>
          {error}
        </span>
      )}
    </label>
  );
}
