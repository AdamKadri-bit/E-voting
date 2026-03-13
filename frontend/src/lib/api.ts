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

export async function getMe() {
  const res = await fetch(`${API}/me`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
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
    candidate_id?: number | null;
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