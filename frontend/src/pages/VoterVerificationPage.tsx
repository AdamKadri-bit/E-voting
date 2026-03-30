import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, AlertCircle, CheckCircle2, UserCheck } from "lucide-react";

import DashboardLayout from "../components/layouts/DashboardLayout";
import { Card } from "../components/common/Card";

const API_URL =
  (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000/api";

export default function VoterVerificationPage() {
  const nav = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    father_name: "",
    mother_name: "",
    date_of_birth: "",
    civil_registry_number: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/registry/link`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setErr(data?.message || "Verification failed.");
        return;
      }

      setOk(data?.message || "Linked successfully");

      setTimeout(() => {
        nav("/dashboard", { replace: true });
      }, 800);
    } catch (e: any) {
      setErr(e?.message || "Error verifying");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 16px" }}>
        <h1 style={{ fontSize: 36, fontWeight: 900 }}>
          Verify Voter Record
        </h1>

        {err && (
          <div style={{ color: "red", marginBottom: 10 }}>{err}</div>
        )}

        {ok && (
          <div style={{ color: "green", marginBottom: 10 }}>{ok}</div>
        )}

        <Card>
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
            <input
              placeholder="Full Name"
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
            />
            <input
              placeholder="Father Name"
              value={form.father_name}
              onChange={(e) => update("father_name", e.target.value)}
            />
            <input
              placeholder="Mother Name"
              value={form.mother_name}
              onChange={(e) => update("mother_name", e.target.value)}
            />
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => update("date_of_birth", e.target.value)}
            />
            <input
              placeholder="Registry Number"
              value={form.civil_registry_number}
              onChange={(e) =>
                update("civil_registry_number", e.target.value)
              }
            />

            <button disabled={submitting}>
              {submitting ? "Verifying..." : "Verify"}
            </button>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}