<?php

namespace App\Http\Controllers;

use App\Exceptions\VotingException;
use App\Models\Election;
use App\Models\ElectionTrustee;
use App\Models\PartialDecryption;
use App\Models\User;
use App\Services\E2e\KeyCeremonyService;
use App\Services\E2e\TallyService;
use Illuminate\Http\Request;

/**
 * Trustee endpoints for the key ceremony and the decryption ceremony.
 * Trustees' private material never arrives here — only public commitments,
 * sealed shares and proven partial decryptions.
 */
class TrusteeController extends Controller
{
    public function __construct(private KeyCeremonyService $ceremony, private TallyService $tally)
    {
    }

    private function user(Request $request): User
    {
        $user = User::find($request->attributes->get('auth')->sub ?? null);
        abort_unless($user, 401);

        return $user;
    }

    private function wrap(callable $fn)
    {
        try {
            return $fn();
        } catch (VotingException $e) {
            return response()->json(['message' => $e->getMessage(), 'reason' => $e->reason], $e->status);
        }
    }

    public function index(Request $request)
    {
        Election::autoCloseExpired();
        $seats = ElectionTrustee::with('election')->where('user_id', $this->user($request)->id)->get();

        return response()->json(['seats' => $seats->map(fn ($s) => [
            'trustee_index' => $s->trustee_index,
            'election' => [
                'id' => $s->election->id,
                'title' => $s->election->title,
                'status' => $s->election->status,
                'key_ceremony_status' => $s->election->key_ceremony_status,
                'tally_status' => $s->election->tally_status,
                'threshold' => $s->election->trustee_threshold,
                'trustee_count' => $s->election->trustee_count,
            ],
            'phase' => $this->ceremony->phase($s->election),
            'my_rounds' => ['round1' => $s->round1_at !== null, 'round2' => $s->round2_at !== null, 'round3' => $s->round3_at !== null],
            'decryption_submitted' => PartialDecryption::where('election_id', $s->election_id)->where('trustee_index', $s->trustee_index)->exists(),
        ])]);
    }

    public function show(Request $request, Election $election)
    {
        return $this->wrap(function () use ($request, $election) {
            $seat = $this->ceremony->seatFor($election, $this->user($request));

            return response()->json(array_merge($this->ceremony->publicState($election), [
                'election' => ['id' => $election->id, 'title' => $election->title, 'status' => $election->status],
                'me' => [
                    'trustee_index' => $seat->trustee_index,
                    'round1_done' => $seat->round1_at !== null,
                    'round2_done' => $seat->round2_at !== null,
                    'round3_done' => $seat->round3_at !== null,
                ],
            ]));
        });
    }

    public function round1(Request $request, Election $election)
    {
        $data = $request->validate([
            'comm_public_key' => ['required', 'string', 'size:64'],
            'comm_proof' => ['required', 'array'],
            'commitments' => ['required', 'array', 'max:9'],
            'commitment_proofs' => ['required', 'array', 'max:9'],
        ]);

        return $this->wrap(function () use ($request, $election, $data) {
            $this->ceremony->submitRound1($election, $this->ceremony->seatFor($election, $this->user($request)), $data);

            return response()->json(['ok' => true, 'phase' => $this->ceremony->phase($election->fresh())]);
        });
    }

    public function round2(Request $request, Election $election)
    {
        $data = $request->validate([
            'shares' => ['required', 'array', 'max:9'],
            'shares.*.to' => ['required', 'integer'],
            'shares.*.ephemeral' => ['required', 'string', 'size:64'],
            'shares.*.nonce' => ['required', 'string', 'max:64'],
            'shares.*.ciphertext' => ['required', 'string', 'max:256'],
        ]);

        return $this->wrap(function () use ($request, $election, $data) {
            $this->ceremony->submitRound2($election, $this->ceremony->seatFor($election, $this->user($request)), $data['shares']);

            return response()->json(['ok' => true, 'phase' => $this->ceremony->phase($election->fresh())]);
        });
    }

    public function incoming(Request $request, Election $election)
    {
        return $this->wrap(function () use ($request, $election) {
            $seat = $this->ceremony->seatFor($election, $this->user($request));

            return response()->json(['shares' => $this->ceremony->incoming($election, $seat)]);
        });
    }

    public function round3(Request $request, Election $election)
    {
        $data = $request->validate([
            'share_public_key' => ['nullable', 'string', 'size:64'],
            'complaints' => ['present', 'array'],
            'complaints.*' => ['integer'],
            'backup_confirmed' => ['required', 'accepted'],
        ]);

        return $this->wrap(function () use ($request, $election, $data) {
            $seat = $this->ceremony->seatFor($election, $this->user($request));
            $this->ceremony->submitRound3($election, $seat, $data['share_public_key'] ?? null, $data['complaints']);

            return response()->json(['ok' => true, 'status' => $election->fresh()->key_ceremony_status]);
        });
    }

    public function decryption(Request $request, Election $election)
    {
        return $this->wrap(function () use ($request, $election) {
            $seat = $this->ceremony->seatFor($election, $this->user($request));

            return response()->json([
                'election' => ['id' => $election->id, 'title' => $election->title, 'status' => $election->status, 'tally_status' => $election->tally_status],
                'trustee_index' => $seat->trustee_index,
                'threshold' => $election->trustee_threshold,
                'submitted' => PartialDecryption::where('election_id', $election->id)->pluck('trustee_index'),
                'aggregates' => $election->tally_status === 'none' ? [] : $this->tally->aggregatesJson($election),
            ]);
        });
    }

    public function partial(Request $request, Election $election)
    {
        $data = $request->validate(['shares' => ['required', 'array', 'max:5000']]);

        return $this->wrap(function () use ($request, $election, $data) {
            $seat = $this->ceremony->seatFor($election, $this->user($request));

            return response()->json($this->tally->submitPartial($election, $seat, $data['shares']));
        });
    }
}
