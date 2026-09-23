/**
 * Promise wrapper around the crypto Web Worker, with progress callbacks.
 * One worker per page load; it is created lazily and reused.
 */
let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void; onProgress?: (p: number, label?: string) => void }>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module", name: "evote-crypto" });
    worker.onmessage = (e) => {
      const { id, result, error, progress, label } = e.data;
      const p = pending.get(id);
      if (!p) return;
      if (progress !== undefined) {
        p.onProgress?.(progress, label);
        return;
      }
      pending.delete(id);
      if (error) p.reject(new Error(error));
      else p.resolve(result);
    };
    worker.onerror = (e) => {
      for (const p of pending.values()) p.reject(new Error(e.message || "Crypto worker failed"));
      pending.clear();
    };
  }
  return worker;
}

export function runCrypto<T = unknown>(op: string, args: unknown = {}, onProgress?: (p: number, label?: string) => void): Promise<T> {
  const id = ++seq;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject, onProgress });
    getWorker().postMessage({ id, op, args });
  });
}
