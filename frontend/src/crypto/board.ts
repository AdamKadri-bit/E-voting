/** Shape of the public bulletin-board export (GET /api/board/elections/{id}/export). */
import type { AuditedBallot, EncryptedBallot } from "./ballot";
import type { Manifest } from "./manifest";
import type { AggregateCiphertext, PartialShare, Round1Public } from "./threshold";

export type BoardTrustee = {
  trustee_index: number;
  name: string;
  round1: Round1Public | null;
  share_public_key: string | null;
};

export type BoardBallot = {
  sequence: number;
  tracking_code: string;
  short_code: string;
  status: "counted" | "superseded";
  ballot: EncryptedBallot;
};

export type BoardAudited = {
  tracking_code: string;
  short_code: string;
  audit: AuditedBallot;
};

export type BoardTally = {
  aggregates: (AggregateCiphertext & { constituency_id: number })[];
  ballot_counts: Record<string, number>;
  partials: { trustee_index: number; shares: PartialShare[] }[];
  used_trustees: number[];
  results: { key: string; count: number }[];
} | null;

export type BoardExport = {
  protocol: string;
  election: {
    id: number;
    title: string;
    status: string;
    tally_status: string;
    threshold: number;
    trustee_count: number;
    joint_public_key: string | null;
    key_ceremony_status: string;
  };
  client_bundle: { file: string; sha256: string } | null;
  trustees: BoardTrustee[];
  manifests: Manifest[];
  ballots: BoardBallot[];
  audited_ballots: BoardAudited[];
  tally: BoardTally;
};

/** Aggregate key for one option inside one constituency tally unit. */
export const tallyKey = (constituencyId: number, type: string, id: number) => `c${constituencyId}/${type}:${id}`;
