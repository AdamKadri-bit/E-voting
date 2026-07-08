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
    const message =
      data?.message ||
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

export async function extractLebaneseIdOcr(frontImage: File, backImage: File) {
  const formData = new FormData();
  formData.append("front_image", frontImage);
  formData.append("back_image", backImage);

  const res = await fetch(`${API}/ocr/lebanese-id`, {
    method: "POST",
    headers: { Accept: "application/json" },
    credentials: "include",
    body: formData,
  });

  return handle<{ ok: boolean; data: LebaneseIdOcrData }>(res);
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
  ends_at: string;
  status: "draft" | "active" | "closed";
};

// Overview
export const adminOverview = () => adminReq("/overview");

// Elections
export const adminListElections = () =>
  adminReq<{ elections: AdminElection[] }>("/elections");
export const adminGetElection = (id: number) =>
  adminReq<{ election: AdminElection }>(`/elections/${id}`);
export const adminCreateElection = (payload: ElectionInput) =>
  adminReq<{ election: AdminElection }>("/elections", "POST", payload);
export const adminUpdateElection = (id: number, payload: ElectionInput) =>
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

// Results & audit
export const adminResults = (electionId: number) =>
  adminReq(`/elections/${electionId}/results`);
export const adminAuditLogs = (perPage = 25) =>
  adminReq(`/audit/logs?per_page=${perPage}`);
export const adminVerifyChain = () => adminReq(`/audit/chain`);