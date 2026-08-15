const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

async function parseJsonSafe(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function handle<T = any>(res: Response): Promise<T> {
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
      let data: any = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* handled below */
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
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

export async function linkRegistry(payload: RegistryLinkPayload) {
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

async function adminReq<T = any>(
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

// Lists
export const adminListLists = (electionId: number) =>
  adminReq<{ lists: any[] }>(`/elections/${electionId}/lists`);
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
  adminReq<{ candidacies: any[] }>(`/lists/${listId}/available-candidacies`);
export const adminAddCandidate = (
  listId: number,
  payload: { candidacy_id: number; position_order?: number | null }
) => adminReq(`/lists/${listId}/candidates`, "POST", payload);
export const adminRemoveCandidate = (listId: number, listCandidateId: number) =>
  adminReq(`/lists/${listId}/candidates/${listCandidateId}`, "DELETE");

// Candidacies
export const adminListCandidacies = (electionId: number) =>
  adminReq<{ candidacies: any[] }>(`/elections/${electionId}/candidacies`);
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
export const adminResults = (electionId: number) =>
  adminReq(`/elections/${electionId}/results`);

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
  adminReq(`/audit/logs?per_page=${perPage}`);
export const adminVerifyChain = () => adminReq(`/audit/chain`);