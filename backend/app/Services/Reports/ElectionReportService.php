<?php

namespace App\Services\Reports;

use App\Models\Election;
use App\Services\BallotTallyService;
use App\Services\E2e\BoardVerifier;
use App\Services\E2e\BulletinBoardService;
use App\Services\ParticipationAnalyticsService;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\MemoryDrawing;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * The election report, in the same spreadsheet format as the existing
 * candidate export: summary, diaspora breakdown, country table (declared and
 * detected), a static map image, bulletin-board summary and verifier result.
 * Results appear only once the tally is decrypted and published.
 */
class ElectionReportService
{
    public function __construct(
        private ParticipationAnalyticsService $analytics,
        private BulletinBoardService $board,
        private BoardVerifier $verifier,
        private BallotTallyService $tally,
        private WorldMapRenderer $map,
    ) {
    }

    public function build(Election $election): Spreadsheet
    {
        $book = new Spreadsheet();
        $declared = $this->analytics->turnout($election, true, 'declared');
        $detected = $this->analytics->turnout($election, true, 'detected');
        $verification = $election->isE2e() && $election->key_ceremony_status === 'complete'
            ? $this->verifier->verify($this->board->export($election))
            : null;

        $this->summary($book->getActiveSheet(), $election, $declared, $verification);
        $this->countries($book->createSheet(), $declared, $detected);
        $this->mapSheet($book->createSheet(), $election, $declared);
        $this->boardSheet($book->createSheet(), $election);
        $this->verifierSheet($book->createSheet(), $verification);
        $this->resultsSheet($book->createSheet(), $election);

        $book->setActiveSheetIndex(0);

        return $book;
    }

    public function filename(Election $election): string
    {
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $election->title) ?? 'election', '-'));

        return ($slug === '' ? 'election' : $slug) . '-report.xlsx';
    }

    private function summary(Worksheet $s, Election $e, array $t, ?array $v): void
    {
        $s->setTitle('Summary');
        $rows = [
            ['Election', $e->title],
            ['Status', $e->status],
            ['Ballot system', $e->isE2e() ? 'End-to-end verifiable (threshold ElGamal, ristretto255)' : 'Legacy (server-key encryption)'],
            ['Voting window', ($e->starts_at?->toDateTimeString() ?? '—') . ' → ' . ($e->ends_at?->toDateTimeString() ?? '—')],
            ['Diaspora voting', $e->diaspora_voting_enabled ? 'Enabled' : 'Disabled'],
            ['Registered voters', $t['totals']['registered']],
            ['Voters who took part', $t['totals']['voters']],
            ['Turnout %', $t['totals']['turnout_percentage']],
            ['Residents', $t['totals']['resident']],
            ['Diaspora', $t['totals']['diaspora']],
            ['Diaspora share %', $t['totals']['voters'] ? round($t['totals']['diaspora'] / $t['totals']['voters'] * 100, 1) : 0],
            ['Countries voted from (declared)', $t['totals']['countries']],
            ['Declared ≠ detected location (admin review only)', $t['totals']['location_mismatches'] ?? 0],
            ['Trustees', "{$e->trustee_threshold} of {$e->trustee_count}"],
            ['Election public key', $e->joint_public_key ?? '—'],
            ['Tally', $e->tally_status],
            ['Independent verification', $v === null ? 'Not applicable' : ($v['ok'] ? 'PASS' : 'FAIL')],
            ['Client crypto bundle SHA-256', $this->board->clientBundle()['sha256'] ?? 'not built'],
            ['Generated', now()->toDateTimeString()],
        ];
        $s->fromArray($rows, null, 'A1');
        $s->getColumnDimension('A')->setWidth(44);
        $s->getColumnDimension('B')->setWidth(90);
        $s->getStyle('A1:A' . count($rows))->getFont()->setBold(true);
    }

    private function countries(Worksheet $s, array $declared, array $detected): void
    {
        $s->setTitle('Countries');
        $this->header($s, ['Country', 'ISO', 'Voters (declared)', 'Share % (declared)', 'Voters (detected by IP)']);
        $det = collect($detected['countries'])->keyBy('code');
        $codes = collect($declared['countries'])->pluck('code')->merge($det->keys())->unique();
        $row = 2;
        foreach ($codes as $code) {
            $d = collect($declared['countries'])->firstWhere('code', $code);
            $s->fromArray([
                $d['name'] ?? $det[$code]['name'] ?? $code, $code,
                $d['voters'] ?? 0, $d['share'] ?? 0, $det[$code]['voters'] ?? 0,
            ], null, "A{$row}");
            $row++;
        }
        $s->fromArray(['Unknown (no GeoIP match)', '—', '', '', $detected['totals']['unknown_location']], null, "A{$row}");
        foreach (['A' => 34, 'B' => 8, 'C' => 18, 'D' => 18, 'E' => 24] as $col => $w) {
            $s->getColumnDimension($col)->setWidth($w);
        }
    }

    private function mapSheet(Worksheet $s, Election $e, array $t): void
    {
        $s->setTitle('Map');
        $voters = collect($t['countries'])->pluck('voters', 'code')->map(fn ($v) => (int) $v)->all();
        $png = $this->map->png($voters, "{$e->title} — where voters voted from (declared country)");
        $img = imagecreatefromstring($png);
        $drawing = new MemoryDrawing();
        $drawing->setName('World map');
        $drawing->setImageResource($img);
        $drawing->setRenderingFunction(MemoryDrawing::RENDERING_PNG);
        $drawing->setMimeType(MemoryDrawing::MIMETYPE_PNG);
        $drawing->setCoordinates('A1');
        $drawing->setWidth(1000);
        $drawing->setWorksheet($s);
    }

    private function boardSheet(Worksheet $s, Election $e): void
    {
        $s->setTitle('Bulletin board');
        if (!$e->isE2e()) {
            $s->setCellValue('A1', 'Legacy election — no public bulletin board.');

            return;
        }
        $sum = $this->board->summary($e);
        $rows = [
            ['Ballots cast (all versions)', $sum['counts']['cast']],
            ['Counted (latest per voter)', $sum['counts']['counted']],
            ['Superseded by a re-vote', $sum['counts']['superseded']],
            ['Audited (spoiled, published)', $sum['counts']['audited']],
            ['Ballot styles', count($sum['manifests'])],
            ['Election public key', $e->joint_public_key],
        ];
        foreach ($sum['trustees'] as $t) {
            $rows[] = ["Trustee {$t['trustee_index']} ({$t['name']}) share key", $t['share_public_key'] ?? '—'];
        }
        $s->fromArray($rows, null, 'A1');
        $s->getColumnDimension('A')->setWidth(44);
        $s->getColumnDimension('B')->setWidth(80);
    }

    private function verifierSheet(Worksheet $s, ?array $v): void
    {
        $s->setTitle('Verification');
        if (!$v) {
            $s->setCellValue('A1', 'Verification applies to end-to-end elections with a completed key ceremony.');

            return;
        }
        $this->header($s, ['Check', 'Result', 'Detail', 'Failures']);
        $row = 2;
        foreach ($v['checks'] as $c) {
            $s->fromArray([$c['name'], $c['skipped'] ? 'SKIPPED' : ($c['ok'] ? 'PASS' : 'FAIL'), $c['detail'], implode('; ', $c['failures'])], null, "A{$row}");
            $row++;
        }
        $s->fromArray(['Overall', $v['ok'] ? 'PASS' : 'FAIL', 'Anyone can re-run this: /verify page or `npm run verify` in frontend/', ''], null, "A{$row}");
        foreach (['A' => 60, 'B' => 10, 'C' => 50, 'D' => 60] as $col => $w) {
            $s->getColumnDimension($col)->setWidth($w);
        }
    }

    private function resultsSheet(Worksheet $s, Election $e): void
    {
        $s->setTitle('Results');
        if ($e->isE2e() && $e->tally_status !== 'published') {
            $s->setCellValue('A1', 'Results are not available until the trustees decrypt the tally after polling closes.');

            return;
        }
        $r = $this->tally->tally($e);
        $this->header($s, ['List', 'Votes', '%']);
        $row = 2;
        foreach ($r['lists'] as $l) {
            $s->fromArray([$l['list_name'], $l['votes'], $l['percentage']], null, "A{$row}");
            $row++;
        }
        $row++;
        $s->fromArray(['Preferential candidate', 'Votes'], null, "A{$row}");
        $s->getStyle("A{$row}:B{$row}")->getFont()->setBold(true);
        $row++;
        foreach ($r['preferential_candidates'] as $c) {
            $s->fromArray([$c['candidate_name'], $c['votes']], null, "A{$row}");
            $row++;
        }
        $s->getColumnDimension('A')->setWidth(50);
    }

    private function header(Worksheet $s, array $headers): void
    {
        $s->fromArray($headers, null, 'A1');
        $last = chr(ord('A') + count($headers) - 1);
        $s->getStyle("A1:{$last}1")->getFont()->setBold(true);
        $s->getStyle("A1:{$last}1")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('E8ECF3');
    }
}
