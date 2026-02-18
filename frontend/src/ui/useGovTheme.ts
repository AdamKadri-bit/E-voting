import { useEffect, useMemo, useState } from "react";

type GovTheme = "dark" | "light";
const KEY = "evote_theme_v1";

export function useGovTheme() {
  const [theme, setTheme] = useState<GovTheme>(() => {
    const saved = localStorage.getItem(KEY);
    return saved === "light" || saved === "dark" ? saved : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(KEY, theme);
  }, [theme]);

  const toggle = useMemo(() => {
    return () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, setTheme, toggle };
}
