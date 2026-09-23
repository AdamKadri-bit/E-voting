import countries from "../data/countries.json";

export type Country = { code: string; numeric: string; name: string; name_ar: string | null };

export const COUNTRIES = countries as Country[];
export const countryName = (code?: string | null) => COUNTRIES.find((c) => c.code === code)?.name ?? code ?? "";

/** Regional-indicator emoji for an ISO alpha-2 code. */
export const flag = (code: string) =>
  code.length === 2 ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "";
