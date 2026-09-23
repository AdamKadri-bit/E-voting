/** Test harness: runs a whole election in memory (ceremony → votes → tally). */
import { encryptBallot, trackingCode, toAudited, type EncryptedBallot } from "../ballot";
import { add, fromJson, toJson, zero, type CiphertextPoints } from "../elgamal";
import { manifestHash, selectionVector, type Manifest } from "../manifest";
import { combine, partialDecrypt, round1, round2, round3, type Round1Public, type Round1Secret, type EncryptedShare } from "../threshold";
import { G, IDENTITY, intScalar, mulPublic, pointToHex } from "../group";
import { type BoardExport, tallyKey } from "../board";

export const ELECTION = 7;

export function makeManifest(id = 1, constituency = 3, district = 11): Manifest {
  const base: Omit<Manifest, "hash"> = {
    id,
    election_id: ELECTION,
    constituency_id: constituency,
    district_id: district,
    options: [
      { type: "list", id: 100, list_id: null, label: "Unity" },
      { type: "list", id: 101, list_id: null, label: "Change" },
      { type: "candidate", id: 500, list_id: 100, label: "A. Haddad" },
      { type: "candidate", id: 501, list_id: 100, label: "R. Khoury" },
      { type: "candidate", id: 600, list_id: 101, label: "S. Nasr" },
    ],
    constraints: [
      { type: "exact", value: 1, indices: [0, 1], parent: null },
      { type: "max", value: 1, indices: [2, 3, 4], parent: null },
      { type: "implies", value: 1, indices: [2, 3], parent: 0 },
      { type: "implies", value: 1, indices: [4], parent: 1 },
    ],
  };
  return { ...base, hash: manifestHash(base) };
}

export type Ceremony = { pubs: Round1Public[]; shares: Map<number, string>; jointPk: string };

export function ceremony(n = 3, k = 2): Ceremony {
  const r1 = Array.from({ length: n }, (_, i) => round1(ELECTION, i + 1, k));
  const pubs = r1.map((x) => x.pub);
  const secrets = new Map<number, Round1Secret>(r1.map((x) => [x.pub.trustee_index, x.secret]));
  const boxes: EncryptedShare[] = [];
  for (const p of pubs) boxes.push(...round2(ELECTION, p.trustee_index, secrets.get(p.trustee_index)!, pubs));
  const shares = new Map<number, string>();
  let jointPk = "";
  for (const p of pubs) {
    const res = round3(ELECTION, p.trustee_index, secrets.get(p.trustee_index)!, pubs, boxes.filter((b) => b.to === p.trustee_index));
    if (res.complaints.length) throw new Error("unexpected complaint");
    shares.set(p.trustee_index, res.share);
    jointPk = res.joint_public_key;
  }
  return { pubs, shares, jointPk };
}

export type Vote = { credential: string; list: number; candidate: number | null };

export function buildBoard(c: Ceremony, manifest: Manifest, votes: Vote[], useTrustees = [1, 2], k = 2): BoardExport {
  const ballots = votes.map((v, i) => {
    const { ballot } = encryptBallot(manifest, c.jointPk, v.credential, selectionVector(manifest, v.list, v.candidate));
    const tc = trackingCode(ballot);
    return { sequence: i + 1, tracking_code: tc.full, short_code: tc.short, status: "counted" as "counted" | "superseded", ballot };
  });
  const latest = new Map<string, number>();
  ballots.forEach((b) => latest.set(b.ballot.credential, b.sequence));
  ballots.forEach((b) => (b.status = latest.get(b.ballot.credential) === b.sequence ? "counted" : "superseded"));

  const agg = new Map<string, CiphertextPoints>();
  manifest.options.forEach((o) => agg.set(tallyKey(manifest.constituency_id, o.type, o.id), zero()));
  const counted = ballots.filter((b) => b.status === "counted");
  counted.forEach((b) =>
    manifest.options.forEach((o, i) => {
      const k2 = tallyKey(manifest.constituency_id, o.type, o.id);
      agg.set(k2, add(agg.get(k2)!, fromJson(b.ballot.ciphertexts[i])));
    })
  );
  const aggregates = [...agg].map(([key, ct]) => ({ key, constituency_id: manifest.constituency_id, ...toJson(ct) }));
  const partials = useTrustees.map((j) => ({ trustee_index: j, shares: partialDecrypt(ELECTION, j, c.shares.get(j)!, aggregates) }));

  const results = aggregates.map((a) => {
    const parts = new Map(partials.map((p) => [p.trustee_index, fromJsonPoint(p.shares.find((s) => s.key === a.key)!.m)]));
    const mG = combine(a, parts);
    let acc = IDENTITY;
    for (let n = 0; n <= votes.length; n++) {
      if (acc.equals(mG)) return { key: a.key, count: n };
      acc = acc.add(G);
    }
    throw new Error("count not found");
  });

  return {
    protocol: "evote-v1",
    election: { id: ELECTION, title: "Test", status: "closed", tally_status: "published", threshold: k, trustee_count: c.pubs.length, joint_public_key: c.jointPk, key_ceremony_status: "complete" },
    client_bundle: null,
    trustees: c.pubs.map((p) => ({ trustee_index: p.trustee_index, name: `T${p.trustee_index}`, round1: p, share_public_key: null })),
    manifests: [manifest],
    ballots,
    audited_ballots: [],
    tally: { aggregates, ballot_counts: { [String(manifest.constituency_id)]: counted.length }, partials, used_trustees: useTrustees, results },
  };
}

import { pointFromHex } from "../group";
const fromJsonPoint = (h: string) => pointFromHex(h);

export function plainTally(manifest: Manifest, votes: Vote[]): Map<string, number> {
  const last = new Map<string, Vote>();
  votes.forEach((v) => last.set(v.credential, v));
  const out = new Map<string, number>();
  manifest.options.forEach((o) => out.set(tallyKey(manifest.constituency_id, o.type, o.id), 0));
  for (const v of last.values()) {
    const sel = selectionVector(manifest, v.list, v.candidate);
    manifest.options.forEach((o, i) => {
      const k = tallyKey(manifest.constituency_id, o.type, o.id);
      out.set(k, out.get(k)! + sel[i]);
    });
  }
  return out;
}

export { encryptBallot, toAudited, mulPublic, intScalar, pointToHex, type EncryptedBallot };
