import { useEffect, useId, useMemo, useRef, useState } from "react";
import { COUNTRIES, countryName, flag, type Country } from "../../lib/countries";

/**
 * Searchable ISO 3166-1 country picker (combobox pattern, keyboard + touch).
 * Matches English name, Arabic name or code.
 */
export default function CountrySelect({
  value,
  onChange,
  exclude = [],
  label = "Country of residence",
}: {
  value: string | null;
  onChange: (code: string) => void;
  exclude?: string[];
  label?: string;
}) {
  const id = useId();
  const [query, setQuery] = useState(value ? countryName(value) : "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (value) setQuery(countryName(value));
  }

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = COUNTRIES.filter((c) => !exclude.includes(c.code));
    if (!q || (value && countryName(value).toLowerCase() === q)) return pool;
    return pool.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q || (c.name_ar ?? "").includes(query.trim())
    );
  }, [query, exclude, value]);

  function pick(c: Country) {
    onChange(c.code);
    setQuery(c.name);
    setOpen(false);
  }

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <div style={{ position: "relative" }}>
      <label htmlFor={id} className="govLabel">
        <span>{label}</span>
      </label>
      <input
        id={id}
        className="govInput"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        autoComplete="country-name"
        placeholder="Search countries…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && open && options[active]) {
            e.preventDefault();
            pick(options[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        style={{ marginTop: 6 }}
      />
      {open && (
        <ul
          id={`${id}-list`}
          ref={listRef}
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 50,
            left: 0,
            right: 0,
            top: "100%",
            marginTop: 6,
            maxHeight: 280,
            overflowY: "auto",
            padding: 6,
            listStyle: "none",
            borderRadius: 14,
            border: "1px solid var(--gov-edge)",
            background: "var(--gov-bg)",
            boxShadow: "var(--gov-shadow)",
          }}
        >
          {options.length === 0 && <li className="gv-muted" style={{ padding: 12 }}>No country matches “{query}”.</li>}
          {options.map((c, i) => (
            <li
              key={c.code}
              data-idx={i}
              role="option"
              aria-selected={c.code === value}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(c);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minHeight: 44,
                padding: "8px 10px",
                borderRadius: 10,
                cursor: "pointer",
                background: i === active ? "rgba(201,162,39,0.14)" : c.code === value ? "rgba(71,167,111,0.12)" : "transparent",
              }}
            >
              <span aria-hidden style={{ fontSize: 20 }}>{flag(c.code)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>{c.name}</span>
              <span className="gv-muted" style={{ fontSize: 12 }}>{c.code}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
