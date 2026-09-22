/**
 * Ballot manifest: the frozen, public description of one ballot style
 * (election × constituency × minor district). Every encrypted ballot is a vector
 * with one ciphertext per manifest option, and the manifest's constraints are
 * what the zero-knowledge proofs enforce.
 *
 * Lebanese Law 44/2017 maps onto three constraint kinds:
 *   exact   — exactly one list is chosen                 (Σ list bits = 1)
 *   max     — at most one preferential vote              (Σ candidate bits ≤ 1)
 *   implies — the preferential vote sits on the chosen list
 *             (list bit − Σ that list's candidate bits ∈ {0, 1})
 * A generic multi-choice contest is just `max` with a higher value.
 */
import { hashItems } from "./encoding";

export type ManifestOption = {
  type: "list" | "candidate";
  id: number;
  list_id: number | null;
  label: string;
};

export type ManifestConstraint = {
  type: "exact" | "max" | "implies";
  value: number;
  /** For exact/max: the summed options. For implies: the child options. */
  indices: number[];
  /** For implies: the option that must be selected for any child to be. */
  parent: number | null;
};

export type Manifest = {
  id: number;
  election_id: number;
  constituency_id: number;
  district_id: number | null;
  options: ManifestOption[];
  constraints: ManifestConstraint[];
  hash: string;
};

export function manifestHash(m: Omit<Manifest, "hash" | "id">): string {
  const items: string[] = [
    String(m.election_id),
    String(m.constituency_id),
    m.district_id === null ? "" : String(m.district_id),
    `options:${m.options.length}`,
  ];
  for (const o of m.options) items.push(o.type, String(o.id), o.list_id === null ? "" : String(o.list_id), o.label);
  items.push(`constraints:${m.constraints.length}`);
  for (const c of m.constraints)
    items.push(c.type, String(c.value), c.parent === null ? "" : String(c.parent), c.indices.join("."));
  return hashItems("manifest", items);
}

/** Turns a voter's choice into the 0/1 vector the manifest describes. */
export function selectionVector(m: Manifest, listId: number, candidateId: number | null): number[] {
  return m.options.map((o) =>
    o.type === "list" ? (o.id === listId ? 1 : 0) : candidateId !== null && o.id === candidateId ? 1 : 0
  );
}

/** Plain-value constraint check, so the client refuses to even encrypt an invalid ballot. */
export function constraintValue(c: ManifestConstraint, v: number[]): number {
  const s = c.indices.reduce((acc, i) => acc + v[i], 0);
  return c.type === "implies" ? v[c.parent!] - s : s;
}

export function satisfies(m: Manifest, v: number[]): boolean {
  if (v.length !== m.options.length || v.some((x) => x !== 0 && x !== 1)) return false;
  return m.constraints.every((c) => {
    const val = constraintValue(c, v);
    if (c.type === "exact") return val === c.value;
    if (c.type === "max") return val >= 0 && val <= c.value;
    return val === 0 || val === 1;
  });
}
