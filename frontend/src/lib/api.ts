import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import type { Manifest } from "../crypto/manifest";
import type { AuditedBallot, EncryptedBallot } from "../crypto/ballot";
import type { BoardExport } from "../crypto/board";
import type { Round1Public, EncryptedShare, PartialShare, AggregateCiphertext } from "../crypto/threshold";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

async function parseJsonSafe(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function handle<T = unknown>(res: Response): Promise<T> {
  const data = await parseJsonSafe(res);

  if (!res.ok) {
    // A 422 carries per-field reasons in `errors`; without them the caller
    // only ever sees Laravel's generic summary and the user is told nothing
    // about which file was wrong or why.
    const fieldErrors: string[] = data?.errors
      ? Object.values(data.errors as Record<string, string[]>).flat()
      : [];

    const message =
      fieldErrors.length > 0
        ? fieldErrors.join(" ")
        : data?.message ||
          data?.error ||
          `Request failed with status ${res.status}`;

    throw new Error(message);
  }

  return data as T;
}

export type RegistryLinkPayload = {
  full_name: string;
  father_name: string;
  mother_name: string;
  date_of_birth: string;
  civil_registry_number?: string | null;
};

export type LebaneseIdOcrData = RegistryLinkPayload & {
  national_id_number?: string | null;
  place_of_birth?: string | null;
  governorate?: string | null;
  district?: string | null;
  locality?: string | null;
  ocr_debug?: {
    front_text?: string;
    back_text?: string;
  };
};

export async function getMe() {
  const res = await fetch(`${API}/me`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  return handle(res);
}

export async function logout() {
  await fetch(`${API}/auth/logout`, {
    method: "POST",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
}

/**
 * Uploads both ID sides for OCR.
 *
 * XMLHttpRequest rather than fetch: fetch cannot report upload progress, and
 * ID photos are large enough on a phone connection that a silent wait looks
 * like a hang.
 */
export function extractLebaneseIdOcr(
  frontImage: File,
  backImage: File,
  onProgress?: (percent: number) => void
): Promise<{ ok: boolean; data: LebaneseIdOcrData }> {
  const formData = new FormData();
  formData.append("front_image", frontImage);
  formData.append("back_image", backImage);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API}/ocr/lebanese-id`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Accept", "application/json");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };

    // Upload finished; the server is now running OCR, which takes a moment.
    xhr.upload.onload = () => onProgress?.(100);

    xhr.onload = () => {
      let data: { errors?: Record<string, string[]>; message?: string } | null = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* handled below */
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as { ok: boolean; data: LebaneseIdOcrData });
        return;
      }

      const fieldErrors: string[] = data?.errors
        ? Object.values(data.errors as Record<string, string[]>).flat()
        : [];

      reject(
        new Error(
          fieldErrors.length > 0
            ? fieldErrors.join(" ")
            : data?.message || `Request failed with status ${xhr.status}`
        )
      );
    };

    xhr.onerror = () =>
      reject(new Error("The upload could not reach the server. Check that the backend is running."));
    xhr.ontimeout = () => reject(new Error("The upload timed out. Try again."));

    xhr.send(formData);
  });
}

export type IdentityDocumentType = "national_id" | "ikhraj_qayd" | "passport";

export type IdentityDocumentResult = {
  ok: boolean;
  document_type: IdentityDocumentType;
  data: LebaneseIdOcrData & { passport_number?: string; nationality?: string; expiry_date?: string };
  missing: string[];
  warnings: string[];
};

/**
 * Scans any accepted identity document (national ID front+back, ikhraj qayd
 * page, or passport photo page). XHR for upload progress, as above.
 */
export function extractIdentityDocument(
  documentType: IdentityDocumentType,
  frontImage: File,
  backImage: File | null,
  onProgress?: (percent: number) => void
): Promise<IdentityDocumentResult> {
  const formData = new FormData();
  formData.append("document_type", documentType);
  formData.append("front_image", frontImage);
  if (backImage) formData.append("back_image", backImage);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API}/ocr/document`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Accept", "application/json");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.upload.onload = () => onProgress?.(100);
    xhr.onload = () => {
      let data: { errors?: Record<string, string[]>; message?: string } | null = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* handled below */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as IdentityDocumentResult);
        return;
      }
      const fieldErrors: string[] = data?.errors ? Object.values(data.errors as Record<string, string[]>).flat() : [];
      reject(new Error(fieldErrors.length > 0 ? fieldErrors.join(" ") : data?.message || `Request failed with status ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("The upload could not reach the server. Check that the backend is running."));
    xhr.ontimeout = () => reject(new Error("The upload timed out. Try again."));
    xhr.send(formData);
  });
}

export async function linkRegistry(payload: RegistryLinkPayload): Promise<{ message?: string }> {
  const res = await fetch(`${API}/registry/link`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handle(res);
}

export async function getBallot(electionId: number) {
  const res = await fetch(`${API}/elections/${electionId}/ballot`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  return handle(res);
}

export async function castVote(
  electionId: number,
  payload: {
    list_id: number;
    // Backend (VoteController) validates this exact key. Must match server contract.
    preferential_candidacy_id?: number | null;
  }
) {
  const res = await fetch(`${API}/elections/${electionId}/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  return handle(res);
}

export async function verifyReceipt(receiptHash: string) {
  const res = await fetch(`${API}/receipts/${receiptHash}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  return handle(res);
}

export async function verifyBallotChain() {
  const res = await fetch(`${API}/audit/ballot-chain/verify`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  return handle(res);
}

/* ==========================================================================
 * Admin API (all routes require an admin session; server-guarded)
 * ======================================================================== */

async function adminReq<T = unknown>(
  path: string,
  method: string = "GET",
  body?: unknown
): Promise<T> {
  const res = await fetch(`${API}/admin${path}`, {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handle<T>(res);
}

export type ReadinessCheck = {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
};

export type ElectionReadiness = {
  ready: boolean;
  blockers: string[];
  checks: ReadinessCheck[];
};

export type AdminElection = {
  id: number;
  type: string;
  law_ref?: string | null;
  title: string;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  status: "draft" | "active" | "closed";
  crypto_scheme?: "e2e" | "legacy";
  diaspora_voting_enabled?: boolean;
  trustee_threshold?: number;
  trustee_count?: number;
  key_ceremony_status?: "pending" | "in_progress" | "complete" | "failed";
  joint_public_key?: string | null;
  tally_status?: "none" | "decrypting" | "published";
  lists_count?: number;
  constituencies_count?: number;
  encrypted_ballots_count?: number;
  constituencies?: AdminConstituency[];
  readiness?: ElectionReadiness;
  /** End of polling as the election law fixes it, for the current start time. */
  statutory_ends_at?: string | null;
};

export type AdminConstituency = {
  id: number;
  name_en?: string | null;
  name_ar?: string | null;
  code?: string | null;
};

export type ElectionInput = {
  type: string;
  law_ref?: string | null;
  title: string;
  description?: string | null;
  starts_at: string;
  /** Optional: left blank, the server derives the statutory close from the law. */
  ends_at?: string | null;
  status: "draft" | "active" | "closed";
};

// Status is intentionally excluded — status transitions go through
// adminSetElectionStatus() so its activation guard can't be bypassed.
export type ElectionUpdateInput = Omit<ElectionInput, "status">;

// Overview — election-scoped: list first, then the figures for one election.
export type OverviewElection = Pick<
  AdminElection,
  "id" | "title" | "type" | "law_ref" | "status" | "starts_at" | "ends_at"
> & {
  lists_count?: number;
  constituencies_count?: number;
  encrypted_ballots_count?: number;
};

export type ElectionOverview = {
  election: AdminElection & {
    statutory_ends_at?: string | null;
    statutory_law_ref?: string | null;
  };
  counts: {
    constituencies: number;
    lists: number;
    candidacies: number;
    candidacies_accepted: number;
    candidacies_pending: number;
    ballots: number;
    registered_voters: number;
  };
  turnout: {
    registered: number;
    voted: number;
    ballots_recorded: number;
    turnout_percentage: number;
  };
  readiness: ElectionReadiness;
  chain: { valid: boolean; verified_ballots: number; message?: string | null };
};

export const adminOverview = () =>
  adminReq<{ elections: OverviewElection[] }>("/overview");
export const adminElectionOverview = (electionId: number) =>
  adminReq<ElectionOverview>(`/overview/elections/${electionId}`);

// Elections
export const adminListElections = () =>
  adminReq<{ elections: AdminElection[] }>("/elections");
export const adminGetElection = (id: number) =>
  adminReq<{ election: AdminElection }>(`/elections/${id}`);
export const adminCreateElection = (payload: ElectionInput) =>
  adminReq<{ election: AdminElection }>("/elections", "POST", payload);
export const adminUpdateElection = (id: number, payload: ElectionUpdateInput) =>
  adminReq<{ election: AdminElection }>(`/elections/${id}`, "PUT", payload);
export const adminSetElectionStatus = (id: number, status: string) =>
  adminReq(`/elections/${id}/status`, "PATCH", { status });
export const adminListConstituencies = () =>
  adminReq<{ constituencies: AdminConstituency[] }>("/constituencies");
export const adminSyncConstituencies = (id: number, constituency_ids: number[]) =>
  adminReq(`/elections/${id}/constituencies`, "PUT", { constituency_ids });

export type AdminConstituencyRef = { id: number; name_en?: string | null; code?: string | null };

export type AdminCandidacy = {
  id: number;
  candidate_profile?: { full_name?: string | null } | null;
  constituency?: AdminConstituencyRef | null;
};

export type AdminListMember = { id: number; candidacy_id: number; candidacy?: AdminCandidacy | null };

export type AdminList = {
  id: number;
  list_name?: string | null;
  list_name_en?: string | null;
  constituency?: AdminConstituencyRef | null;
  list_candidates?: AdminListMember[];
};

// Lists
export const adminListLists = (electionId: number) =>
  adminReq<{ lists: AdminList[] }>(`/elections/${electionId}/lists`);
export const adminCreateList = (
  electionId: number,
  payload: {
    constituency_id: number;
    list_name_en: string;
    list_name_ar?: string | null;
    list_code?: string | null;
  }
) => adminReq(`/elections/${electionId}/lists`, "POST", payload);
export const adminUpdateList = (listId: number, payload: Record<string, unknown>) =>
  adminReq(`/lists/${listId}`, "PUT", payload);
export const adminDeleteList = (listId: number) =>
  adminReq(`/lists/${listId}`, "DELETE");
export const adminAvailableCandidacies = (listId: number) =>
  adminReq<{ candidacies: AdminCandidacy[] }>(`/lists/${listId}/available-candidacies`);
export const adminAddCandidate = (
  listId: number,
  payload: { candidacy_id: number; position_order?: number | null }
) => adminReq(`/lists/${listId}/candidates`, "POST", payload);
export const adminRemoveCandidate = (listId: number, listCandidateId: number) =>
  adminReq(`/lists/${listId}/candidates/${listCandidateId}`, "DELETE");

// Candidacies
export const adminListCandidacies = (electionId: number) =>
  adminReq<{ candidacies: AdminCandidacy[] }>(`/elections/${electionId}/candidacies`);
export const adminCreateCandidacy = (
  electionId: number,
  payload: {
    national_id_number: string;
    full_name: string;
    full_name_ar?: string | null;
    date_of_birth: string;
    constituency_id: number;
    status?: string;
  }
) => adminReq(`/elections/${electionId}/candidacies`, "POST", payload);

// Spreadsheet import
export type ImportRow = {
  line: number;
  values: Record<string, string | number | null>;
  errors: string[];
};

export type ImportPreview = {
  headers: Record<string, string>;
  missing_headers: string[];
  rows: ImportRow[];
  valid_rows: number;
  invalid_rows: number;
  errors: string[];
  plan: {
    lists: number;
    candidates: number;
    memberships: number;
    constituencies_to_attach: number;
  };
};

export type ImportResult = {
  imported: {
    constituencies_attached: number;
    lists_created: number;
    candidate_profiles_created: number;
    candidacies_created: number;
    memberships_created: number;
    rows_processed: number;
  };
  preview: ImportPreview;
};

async function adminUpload<T>(path: string, file: File): Promise<T> {
  const body = new FormData();
  body.append("file", file);

  const res = await fetch(`${API}/admin${path}`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
    body,
  });

  return handle<T>(res);
}

export const adminImportPreview = (electionId: number, file: File) =>
  adminUpload<ImportPreview>(`/elections/${electionId}/import/preview`, file);
export const adminImportCommit = (electionId: number, file: File) =>
  adminUpload<ImportResult>(`/elections/${electionId}/import`, file);
export const adminImportTemplateUrl = (electionId: number) =>
  `${API}/admin/elections/${electionId}/import/template`;
/** This election's current lists and candidates, in the importer's layout. */
export const adminExportUrl = (electionId: number) =>
  `${API}/admin/elections/${electionId}/export`;

// Results & audit
export type AdminResultsData = {
  crypto_scheme?: string;
  results_available?: boolean;
  tally_status?: string;
  election: { status: string; starts_at?: string | null; ends_at?: string | null };
  lists: { list_id: number; list_name: string; votes: number; percentage: number }[];
  preferential_candidates: { candidacy_id: number; candidate_name: string; votes: number }[];
  turnout: { registered: number; voted: number; ballots_recorded: number; turnout_percentage: number };
};

export type ChainVerification = { valid: boolean; verified_ballots?: number; message?: string };

export type AuditLogEntry = {
  id: number;
  action: string;
  actor?: { email?: string | null } | null;
  created_at: string;
};

export const adminResults = (electionId: number) =>
  adminReq<AdminResultsData>(`/elections/${electionId}/results`);

export type GeoListResult = {
  list_id?: number;
  list_name: string;
  votes: number;
  percentage: number;
};

export type GeoCandidateResult = {
  candidacy_id?: number;
  candidate_name: string;
  votes: number;
  percentage: number;
};

export type GeoConstituency = {
  id: number;
  code?: string | null;
  name_en?: string | null;
  name_ar?: string | null;
  seats: number;
  /**
   * False when this constituency shares a district with another one — the
   * roll records districts only, so its headcounts can't be split out.
   */
  registration_attributable: boolean;
  registered: number | null;
  voted: number | null;
  ballots: number;
  turnout_percentage: number | null;
  lists: GeoListResult[];
  preferential_candidates: GeoCandidateResult[];
};

export type GeoGovernorate = {
  id: number;
  code: string;
  name_en: string;
  name_ar?: string | null;
  districts: { id: number; code: string; name_en: string; name_ar?: string | null }[];
  in_election: boolean;
  registered: number;
  voted: number;
  ballots: number;
  turnout_percentage: number;
  lists: GeoListResult[];
  preferential_candidates: GeoCandidateResult[];
  constituencies: GeoConstituency[];
};

export type GeoResults = {
  election: {
    id: number;
    title: string;
    status: string;
    starts_at?: string | null;
    ends_at?: string | null;
  };
  totals: {
    registered: number;
    voted: number;
    ballots: number;
    turnout_percentage: number;
  };
  governorates: GeoGovernorate[];
};

export const adminGeoResults = (electionId: number) =>
  adminReq<GeoResults>(`/elections/${electionId}/geo-results`);
export type TurnoutTimeline = {
  status: string;
  window: {
    from: string;
    to: string;
    bucket_seconds: number;
    bucket_count: number;
  } | null;
  buckets: { index: number; start: string; end: string; count: number }[];
  total_ballots: number;
};
export const adminTurnoutTimeline = (electionId: number, buckets = 24) =>
  adminReq<TurnoutTimeline>(`/elections/${electionId}/turnout-timeline?buckets=${buckets}`);
export const adminAuditLogs = (perPage = 25) =>
  adminReq<{ data?: AuditLogEntry[] }>(`/audit/logs?per_page=${perPage}`);
export const adminVerifyChain = () => adminReq<ChainVerification>(`/audit/chain`);
/* ==========================================================================
 * Voter status, encrypted voting, bulletin board, trustees, passkeys
 * ======================================================================== */


async function req<T = unknown>(path: string, method = "GET", body?: unknown, withCookies = true): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    credentials: withCookies ? "include" : "omit",
    headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handle<T>(res);
}

/** Like handle(), but keeps the server's machine-readable `reason` on the error. */
export class ApiError extends Error {
  status: number;
  reason?: string;
  constructor(message: string, status: number, reason?: string) {
    super(message);
    this.status = status;
    this.reason = reason;
  }
}

async function reqWithReason<T = unknown>(path: string, method = "GET", body?: unknown, withCookies = true): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    credentials: withCookies ? "include" : "omit",
    headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const fieldErrors: string[] = data?.errors ? Object.values(data.errors as Record<string, string[]>).flat() : [];
    throw new ApiError(fieldErrors.join(" ") || data?.message || `Request failed with status ${res.status}`, res.status, data?.reason);
  }
  return data as T;
}

export type VoterStatus = {
  voter_type: "resident" | "diaspora" | null;
  residence_country: string | null;
  residence_country_name: string | null;
  required: boolean;
  locked: boolean;
  locked_by: string[];
  set_at: string | null;
};

export type MeUser = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "voter";
  email_verified?: boolean;
  registry_person_id?: number | null;
  can_vote?: boolean;
  has_voter_profile?: boolean;
  voter_status: VoterStatus;
  is_trustee: boolean;
  passkeys: number;
  registry_person?: Record<string, unknown> | null;
};

export const fetchMe = () => req<{ ok: boolean; user: MeUser }>("/me");
export const setVoterStatus = (voter_type: string, residence_country?: string | null) =>
  req<{ ok: boolean; status: VoterStatus }>("/me/voter-status", "PUT", { voter_type, residence_country });

export type VoterElection = {
  id: number;
  title: string;
  description?: string | null;
  status: "active" | "closed";
  is_open: boolean;
  starts_at: string | null;
  ends_at: string | null;
  crypto_scheme: "e2e" | "legacy";
  diaspora_voting_enabled: boolean;
  key_ready: boolean;
  tally_status: "none" | "decrypting" | "published";
  eligible: boolean;
  /** Identity verified against the registry, and it matches the voter profile. */
  verified: boolean;
  has_voted: boolean;
};

export const listVoterElections = () => req<{ elections: VoterElection[] }>("/elections");

export type E2eBallotResponse = {
  election: { id: number; title: string; ends_at: string | null; diaspora_voting_enabled: boolean };
  constituency: { id: number; name: string };
  district: { id: number; name: string };
  voter: { name: string; voter_type: "resident" | "diaspora"; residence_country: string | null; residence_country_name: string | null };
  e2e: { manifest: Manifest; joint_public_key: string; credential: string; has_voted: boolean };
};

export const getEncryptedBallot = (electionId: number) => reqWithReason<E2eBallotResponse>(`/elections/${electionId}/ballot`);

export type CastReceipt = {
  tracking_code: string;
  short_code: string;
  election_id: number;
  election_title: string;
  manifest_hash: string;
  board_position: number;
  replaces_previous: boolean;
};

export const castEncryptedBallot = (electionId: number, ballot: EncryptedBallot) =>
  reqWithReason<{ message: string; receipt: CastReceipt }>(`/elections/${electionId}/ballots`, "POST", { ballot });

/** Sent WITHOUT cookies on purpose: a spoiled ballot must not be linkable to the voter. */
export const publishAudit = (electionId: number, audit: AuditedBallot) =>
  reqWithReason<{ tracking_code: string; short_code: string; status: "audited" }>(`/elections/${electionId}/audited-ballots`, "POST", { audit }, false);

/* ---- Bulletin board (public) ---- */

export type BoardElection = BoardExport["election"] & {
  crypto_scheme: string;
  diaspora_voting_enabled: boolean;
  starts_at: string | null;
  ends_at: string | null;
  results_published_at: string | null;
};

export type BoardSummary = {
  election: BoardElection;
  client_bundle: { file: string; sha256: string } | null;
  trustees: BoardExport["trustees"];
  manifests: Manifest[];
  counts: { cast: number; counted: number; superseded: number; audited: number };
  tally: { status: string; partials_submitted: number[]; used_trustees: number[] };
};

export type BoardRow = {
  sequence?: number;
  tracking_code: string;
  short_code: string;
  status: "counted" | "superseded" | "audited";
  ballot?: EncryptedBallot;
  audit?: AuditedBallot;
};

export const boardElections = () => req<{ elections: BoardElection[] }>("/board/elections", "GET", undefined, false);
export const boardSummary = (id: number) => req<BoardSummary>(`/board/elections/${id}`, "GET", undefined, false);
export const boardPage = (id: number, page = 1, q = "", kind: "cast" | "audited" = "cast") =>
  req<{ data: BoardRow[]; current_page: number; last_page: number; total: number }>(
    `/board/elections/${id}/ballots?page=${page}&per_page=20&kind=${kind}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
    "GET",
    undefined,
    false
  );
export const boardLookup = (id: number, code: string) =>
  reqWithReason<BoardRow>(`/board/elections/${id}/lookup/${encodeURIComponent(code)}`, "GET", undefined, false);
export const boardExport = (id: number) => req<BoardExport>(`/board/elections/${id}/export`, "GET", undefined, false);

/* ---- Turnout + map ---- */

export type CountryTurnout = { code: string; name: string; voters: number | null; suppressed: boolean; share: number | null };
export type Turnout = {
  election: { id: number; title: string; status: string; tally_status: string; diaspora_voting_enabled: boolean };
  mode: "declared" | "detected";
  totals: {
    voters: number;
    resident: number;
    diaspora: number;
    registered: number;
    turnout_percentage: number;
    countries: number;
    unknown_location: number;
    location_mismatches?: number;
  };
  countries: CountryTurnout[];
  suppression_threshold: number | null;
  hourly: { hour: string; voters: number }[];
  generated_at: string;
};

export const publicTurnout = (id: number, mode: "declared" | "detected" = "declared") =>
  req<Turnout>(`/elections/${id}/turnout?mode=${mode}`, "GET", undefined, false);
export const adminParticipation = (id: number, mode: "declared" | "detected" = "declared") =>
  adminReq<Turnout>(`/elections/${id}/participation?mode=${mode}`);

/* ---- Trustees ---- */

export type TrusteeSeat = {
  trustee_index: number;
  election: { id: number; title: string; status: string; key_ceremony_status: string; tally_status: string; threshold: number; trustee_count: number };
  phase: "unassigned" | "round1" | "round2" | "round3" | "complete" | "failed";
  my_rounds: { round1: boolean; round2: boolean; round3: boolean };
  decryption_submitted: boolean;
};

export type CeremonyTrustee = {
  trustee_index: number;
  name: string | null;
  round1: Round1Public | null;
  round1_done: boolean;
  round2_done: boolean;
  round3_done: boolean;
  share_public_key: string | null;
  complaints: number[];
};

export type CeremonyState = {
  phase: TrusteeSeat["phase"];
  status: string;
  threshold: number;
  trustee_count: number;
  joint_public_key: string | null;
  trustees: CeremonyTrustee[];
  election?: { id: number; title: string; status: string };
  me?: { trustee_index: number; round1_done: boolean; round2_done: boolean; round3_done: boolean };
};

export const trusteeSeats = () => req<{ seats: TrusteeSeat[] }>("/trustee/elections");
export const ceremonyState = (id: number) => reqWithReason<CeremonyState>(`/trustee/elections/${id}`);
export const submitRound1 = (id: number, pub: Omit<Round1Public, "trustee_index">) => reqWithReason(`/trustee/elections/${id}/round1`, "POST", pub);
export const submitRound2 = (id: number, shares: EncryptedShare[]) => reqWithReason(`/trustee/elections/${id}/round2`, "POST", { shares });
export const incomingShares = (id: number) => req<{ shares: EncryptedShare[] }>(`/trustee/elections/${id}/incoming`);
export const submitRound3 = (id: number, share_public_key: string | null, complaints: number[]) =>
  reqWithReason(`/trustee/elections/${id}/round3`, "POST", { share_public_key, complaints, backup_confirmed: true });
export type DecryptionState = {
  election: { id: number; title: string; status: string; tally_status: string };
  trustee_index: number;
  threshold: number;
  submitted: number[];
  aggregates: (AggregateCiphertext & { constituency_id: number })[];
};
export const decryptionState = (id: number) => reqWithReason<DecryptionState>(`/trustee/elections/${id}/decryption`);
export const submitPartial = (id: number, shares: PartialShare[]) =>
  reqWithReason<{ submitted: number; needed: number; tally_status: string }>(`/trustee/elections/${id}/partial`, "POST", { shares });

/* ---- Admin: trustees, tally, report ---- */

export const adminTrusteeCandidates = (q = "") =>
  adminReq<{ users: { id: number; name: string; email: string; role: string }[] }>(`/trustee-candidates?q=${encodeURIComponent(q)}`);
export const adminCeremony = (id: number) => adminReq<CeremonyState>(`/elections/${id}/ceremony`);
export const adminAssignTrustees = (id: number, user_ids: number[], threshold: number) =>
  adminReq<CeremonyState>(`/elections/${id}/trustees`, "PUT", { user_ids, threshold });
export const adminResetCeremony = (id: number) => adminReq<CeremonyState>(`/elections/${id}/ceremony/reset`, "POST");
export const adminStartTally = (id: number) => adminReq(`/elections/${id}/tally`, "POST");
export const adminReportUrl = (id: number) => `${API}/admin/elections/${id}/report`;
export const adminSetDiaspora = (e: AdminElection, enabled: boolean) =>
  adminReq<{ election: AdminElection }>(`/elections/${e.id}`, "PUT", {
    type: e.type,
    law_ref: e.law_ref,
    title: e.title,
    description: e.description,
    starts_at: e.starts_at,
    ends_at: e.ends_at,
    diaspora_voting_enabled: enabled,
  });

/* ---- Passkeys (WebAuthn) ---- */

export const passkeyList = () => req<{ credentials: { id: number; name: string; created_at: string; last_used_at: string | null }[] }>("/webauthn/credentials");
export const passkeyRegisterOptions = () => req<{ options: PublicKeyCredentialCreationOptionsJSON }>("/webauthn/register/options", "POST");
export const passkeyRegister = (credential: unknown, name: string) => req("/webauthn/register", "POST", { credential, name });
export const passkeyDelete = (id: number) => req(`/webauthn/credentials/${id}`, "DELETE");
export const passkeyLoginOptions = (challenge_token: string) => req<{ options: PublicKeyCredentialRequestOptionsJSON }>("/auth/webauthn/options", "POST", { challenge_token });
export const passkeyLoginVerify = (challenge_token: string, credential: unknown) => req("/auth/webauthn/verify", "POST", { challenge_token, credential });

export type PublicResults = {
  election: { id: number; title: string; status: string };
  turnout: { registered: number; voted: number; ballots_recorded: number; turnout_percentage: number };
  lists: { list_id: number; list_name: string; votes: number; percentage: number }[];
  preferential_candidates: { candidacy_id: number; candidate_name: string; votes: number }[];
  results_available: boolean;
};
export const publicResults = (id: number) => reqWithReason<PublicResults>(`/elections/${id}/results`, "GET", undefined, false);
export const adminVerify = (id: number) => adminReq<import("../crypto/verifier").VerifierReport>(`/elections/${id}/verify`);
