import { useCallback, useEffect, useState } from "react";
import { fetchMe, type MeUser } from "./api";

/** The signed-in user (or null for guests), with a reload function. */
export function useMe() {
  const [me, setMe] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const r = await fetchMe();
      setMe(r.user);
      return r.user;
    } catch {
      setMe(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { me, loading, reload };
}
