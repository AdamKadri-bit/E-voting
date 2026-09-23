import type { ReactNode } from "react";

/** Pill + title + subtitle, the header pattern shared by the voter pages. */
export default function PageHeader({
  pill,
  pillTone = "gold",
  title,
  children,
}: {
  pill?: ReactNode;
  pillTone?: "gold" | "green" | "blue";
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      {pill && <div className={`gv-pill ${pillTone === "gold" ? "" : pillTone}`}>{pill}</div>}
      <h1 className="gv-title">{title}</h1>
      {children && <div className="gv-sub">{children}</div>}
    </div>
  );
}
