/**
 * Generates the bundled, offline geography data (no runtime API calls):
 *   frontend/src/data/countries.json            ISO 3166-1 list for the country picker + map
 *   backend/resources/data/countries.json       same list, for server-side validation
 *   backend/resources/data/world-110m.geo.json  simplified outlines for the report's static map
 * Sources: i18n-iso-countries (ISO names/codes) and world-atlas (Natural Earth 1:110m).
 * Run: npx tsx scripts/gen-geo-data.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry, Position } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";

const require = createRequire(import.meta.url);
const countries = require("i18n-iso-countries");
countries.registerLocale(require("i18n-iso-countries/langs/en.json"));
countries.registerLocale(require("i18n-iso-countries/langs/ar.json"));

const codes: string[] = Object.keys(countries.getAlpha2Codes()).sort();
const list = codes.map((code) => ({
  code,
  numeric: countries.alpha2ToNumeric(code) as string,
  name: countries.getName(code, "en") as string,
  name_ar: countries.getName(code, "ar") ?? null,
}));

const here = import.meta.dirname;
const out = (p: string, data: unknown) => {
  mkdirSync(resolve(p, ".."), { recursive: true });
  writeFileSync(p, JSON.stringify(data));
  console.log("wrote", p);
};

out(resolve(here, "../src/data/countries.json"), list);
out(resolve(here, "../../backend/resources/data/countries.json"), list);

const topo = JSON.parse(readFileSync(require.resolve("world-atlas/countries-110m.json"), "utf8")) as Topology<{ countries: GeometryCollection }>;
const geo = feature(topo, topo.objects.countries) as FeatureCollection<Geometry>;
const byNumeric = new Map(list.map((c) => [c.numeric, c.code]));
type Coords = number | Coords[];
const round = (x: Coords): Coords => (Array.isArray(x) ? x.map(round) : Math.round(x * 100) / 100);
const features = geo.features
  .map((f) => ({
    code: byNumeric.get(String(f.id).padStart(3, "0")) ?? null,
    type: f.geometry?.type,
    coordinates: round(f.geometry && "coordinates" in f.geometry ? (f.geometry.coordinates as Position[] as Coords) : []),
  }))
  .filter((f) => f.type);
out(resolve(here, "../../backend/resources/data/world-110m.geo.json"), features);
console.log("features", features.length, "unmapped", features.filter((f) => !f.code).length, "LB?", features.some((f) => f.code === "LB"));
