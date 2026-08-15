"""
Regenerates frontend/src/components/admin/lebanonGeo.ts from geoBoundaries ADM1.

The generated file is committed, so this only needs running when the boundary
data or the simplification tolerance changes. From the repository root:

    curl -sL -o /tmp/lb_adm1.geojson \
      "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/LBN/ADM1/geoBoundaries-LBN-ADM1_simplified.geojson"
    python3 scripts/generate_lebanon_geo.py /tmp/lb_adm1.geojson

Source data is Public Domain (geoBoundaries gbOpen, https://www.geoboundaries.org).
"""
import json, math, os, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else "/tmp/lb_adm1.geojson"
OUT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "frontend/src/components/admin/lebanonGeo.ts",
)

# geoBoundaries names -> governorates.code in the database. geoBoundaries
# splits Keserwan-Jbeil out of Mount Lebanon (created 2017); the database
# keeps those districts inside Mount Lebanon, so both shapes share its code.
CODES = {
    "Aakkâr": ("AKKAR", "Akkar"),
    "Baalbek-Hermel": ("BAALBEK_HERMEL", "Baalbek-Hermel"),
    "Beyrouth": ("BEIRUT", "Beirut"),
    "Béqaa": ("BEKAA", "Bekaa"),
    "Keserwan-Jbeil": ("MOUNT_LEBANON", "Mount Lebanon"),
    "Liban-Nord": ("NORTH", "North"),
    "Liban-Sud": ("SOUTH", "South"),
    "Mont-Liban": ("MOUNT_LEBANON", "Mount Lebanon"),
    "Nabatîyé": ("NABATIEH", "Nabatieh"),
}

# Which source shape carries the label when a code has several shapes.
LABEL_SHAPE = {"MOUNT_LEBANON": "Mont-Liban"}

# Nudges (lon, lat) for labels that would otherwise sit off their region.
LABEL_NUDGE = {
    "BEIRUT": (-0.20, 0.02),
    "MOUNT_LEBANON": (0.04, -0.02),
    "NORTH": (-0.02, 0.0),
    # The centroid of South lands on the Jezzine salient, next to Nabatieh's
    # label; move it into the Saida-Tyre body instead.
    "SOUTH": (-0.10, -0.09),
    "NABATIEH": (0.06, 0.02),
}

ORDER = ["AKKAR", "NORTH", "BAALBEK_HERMEL", "MOUNT_LEBANON", "BEKAA", "SOUTH", "NABATIEH", "BEIRUT"]

TOLERANCE = 0.0025  # degrees; keeps the coastline readable at ~500px wide


def perpendicular_distance(p, a, b):
    (px, py), (ax, ay), (bx, by) = p, a, b
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def rdp(points, epsilon):
    if len(points) < 3:
        return points[:]
    first, last = points[0], points[-1]
    index, dmax = 0, 0.0
    for i in range(1, len(points) - 1):
        d = perpendicular_distance(points[i], first, last)
        if d > dmax:
            index, dmax = i, d
    if dmax > epsilon:
        return rdp(points[: index + 1], epsilon)[:-1] + rdp(points[index:], epsilon)
    return [first, last]


def centroid(ring):
    """Area-weighted centroid of a closed ring."""
    a = cx = cy = 0.0
    for i in range(len(ring) - 1):
        x0, y0 = ring[i]
        x1, y1 = ring[i + 1]
        cross = x0 * y1 - x1 * y0
        a += cross
        cx += (x0 + x1) * cross
        cy += (y0 + y1) * cross
    if a == 0:
        return ring[0]
    a *= 0.5
    return (cx / (6 * a), cy / (6 * a))


def fmt(v):
    return f"{round(v, 4):g}"


data = json.load(open(SRC))
shapes = []

for feature in data["features"]:
    name = feature["properties"]["shapeName"]
    code, display = CODES[name]
    ring = [tuple(p) for p in feature["geometry"]["coordinates"][0]]

    simplified = rdp(ring, TOLERANCE)
    if simplified[0] != simplified[-1]:
        simplified.append(simplified[0])
    # The ring closes itself in SVG, so the repeated last point is dropped.
    simplified = simplified[:-1]

    label = None
    if LABEL_SHAPE.get(code, name) == name:
        lx, ly = centroid(ring + [ring[0]])
        nx, ny = LABEL_NUDGE.get(code, (0.0, 0.0))
        label = (lx + nx, ly + ny)

    shapes.append({"code": code, "name": display, "source": name, "ring": simplified, "label": label})

shapes.sort(key=lambda s: (ORDER.index(s["code"]), s["source"]))

lons = [p[0] for s in shapes for p in s["ring"]]
lats = [p[1] for s in shapes for p in s["ring"]]
pad = 0.01
bounds = (min(lons) - pad, max(lons) + pad, min(lats) - pad, max(lats) + pad)

lines = []
lines.append("""/**
 * Real outlines of Lebanon's governorates, as longitude/latitude rings.
 *
 * Source: geoBoundaries ADM1 for Lebanon (gbOpen release, boundaries as of
 * 2017), which is Public Domain — https://www.geoboundaries.org. The rings
 * below are the published simplified geometry, thinned further with
 * Ramer-Douglas-Peucker so the map stays light in the bundle while keeping
 * the coastline recognisable.
 *
 * `code` matches `governorates.code` in the database, which is how the map
 * joins itself to the results payload. geoBoundaries splits Keserwan-Jbeil
 * out of Mount Lebanon (a 2017 change the database does not follow), so two
 * shapes share the MOUNT_LEBANON code: both are drawn, both carry that
 * governorate's figures, and only one carries the label.
 */

export type GovernorateShape = {
  /** Matches governorates.code; several shapes may share one code. */
  code: string;
  name: string;
  /** [longitude, latitude] pairs; the ring closes itself. */
  ring: [number, number][];
  /** Label anchor, on the shape that carries the region's name. */
  label?: [number, number];
};
""")

lines.append(f"""export const LEBANON_BOUNDS = {{
  minLon: {fmt(bounds[0])},
  maxLon: {fmt(bounds[1])},
  minLat: {fmt(bounds[2])},
  maxLat: {fmt(bounds[3])},
}};

/**
 * Equirectangular projection with the longitude axis compressed by
 * cos(latitude) so the country keeps its real proportions instead of
 * looking stretched east-to-west.
 */
const LAT_MID = (LEBANON_BOUNDS.minLat + LEBANON_BOUNDS.maxLat) / 2;
const LON_SCALE = Math.cos((LAT_MID * Math.PI) / 180);

const LON_SPAN = (LEBANON_BOUNDS.maxLon - LEBANON_BOUNDS.minLon) * LON_SCALE;
const LAT_SPAN = LEBANON_BOUNDS.maxLat - LEBANON_BOUNDS.minLat;

export const MAP_HEIGHT = 620;
export const MAP_WIDTH = Math.round((LON_SPAN / LAT_SPAN) * MAP_HEIGHT);

export function project([lon, lat]: [number, number]): [number, number] {{
  const x = ((lon - LEBANON_BOUNDS.minLon) * LON_SCALE * MAP_HEIGHT) / LAT_SPAN;
  const y = ((LEBANON_BOUNDS.maxLat - lat) * MAP_HEIGHT) / LAT_SPAN;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}}

export function projectRing(ring: [number, number][]): string {{
  return ring.map((p) => project(p).join(",")).join(" ");
}}
""")

lines.append("export const GOVERNORATES: GovernorateShape[] = [")
for s in shapes:
    lines.append("  {")
    lines.append(f'    code: "{s["code"]}",')
    lines.append(f'    name: "{s["name"]}",')
    if s["label"]:
        lines.append(f'    label: [{fmt(s["label"][0])}, {fmt(s["label"][1])}],')
    coords = ", ".join(f"[{fmt(x)}, {fmt(y)}]" for x, y in s["ring"])
    lines.append("    ring: [")
    # Wrap the coordinate list so the file stays diffable.
    line = "      "
    for chunk in coords.split("], "):
        piece = chunk if chunk.endswith("]") else chunk + "],"
        if len(line) + len(piece) > 96:
            lines.append(line.rstrip())
            line = "      "
        line += piece + " "
    lines.append(line.rstrip())
    lines.append("    ],")
    lines.append("  },")
lines.append("];")

open(OUT, "w").write("\n".join(lines) + "\n")

total = sum(len(s["ring"]) for s in shapes)
print("shapes", len(shapes), "points", total, "bytes", len("\n".join(lines)))
