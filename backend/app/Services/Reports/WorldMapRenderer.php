<?php

namespace App\Services\Reports;

/**
 * Draws a static choropleth PNG of voters per country with GD, from the
 * bundled Natural Earth outlines — for the downloadable report, where an
 * interactive map can't go. Log colour scale, like the on-screen map.
 */
class WorldMapRenderer
{
    private const W = 1200;
    private const H = 600;

    /** @param array<string,int> $voters ISO code => voters */
    public function png(array $voters, string $title): string
    {
        $img = imagecreatetruecolor(self::W, self::H + 70);
        imageantialias($img, true);
        $bg = imagecolorallocate($img, 247, 248, 251);
        $land = imagecolorallocate($img, 222, 226, 232);
        $edge = imagecolorallocate($img, 255, 255, 255);
        $ink = imagecolorallocate($img, 20, 28, 45);
        imagefill($img, 0, 0, $bg);

        $ramp = [[254, 240, 217], [253, 204, 138], [252, 141, 89], [227, 74, 51], [179, 0, 0]];
        $palette = array_map(fn ($c) => imagecolorallocate($img, ...$c), $ramp);
        $max = max([1, ...array_values($voters)]);

        $features = json_decode(file_get_contents(resource_path('data/world-110m.geo.json')), true);
        foreach ($features as $f) {
            $n = $f['code'] ? ($voters[$f['code']] ?? 0) : 0;
            $fill = $n > 0 ? $palette[$this->bucket($n, $max, count($palette))] : $land;
            $polys = $f['type'] === 'Polygon' ? [$f['coordinates']] : $f['coordinates'];
            foreach ($polys as $poly) {
                $ring = $poly[0] ?? [];
                if (count($ring) < 3) {
                    continue;
                }
                $pts = [];
                foreach ($ring as [$lon, $lat]) {
                    $pts[] = (int) round(($lon + 180) / 360 * self::W);
                    $pts[] = (int) round((90 - $lat) / 180 * self::H);
                }
                imagefilledpolygon($img, $pts, $fill);
                imagepolygon($img, $pts, $edge);
            }
        }

        imagestring($img, 5, 16, self::H + 10, $this->ascii($title), $ink);
        $x = 16;
        imagestring($img, 3, $x, self::H + 38, 'Voters (log scale):', $ink);
        $x += 150;
        foreach ($palette as $i => $c) {
            imagefilledrectangle($img, $x, self::H + 38, $x + 36, self::H + 52, $c);
            $x += 40;
        }
        imagestring($img, 3, $x + 6, self::H + 38, "1 .. {$max}", $ink);

        ob_start();
        imagepng($img);
        imagedestroy($img);

        return (string) ob_get_clean();
    }

    private function bucket(int $n, int $max, int $steps): int
    {
        if ($max <= 1) {
            return $steps - 1;
        }

        return (int) min($steps - 1, floor(log($n) / log($max) * ($steps - 1) + 0.0001));
    }

    private function ascii(string $s): string
    {
        return preg_replace('/[^\x20-\x7E]/', '?', $s) ?? '';
    }
}
