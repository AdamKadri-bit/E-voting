<?php

namespace App\Services;

use App\Models\Candidacy;
use App\Models\District;
use App\Models\Election;
use App\Models\ElectionList;
use App\Models\EncryptedBallot;
use App\Models\Receipt;
use App\Models\User;
use App\Models\VoterElectionStatus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class VoteCastingService
{
    public function castVote(
        User $user,
        Election $election,
        int $listId,
        ?int $preferentialCandidacyId = null
    ): array {
        $voter = $user->voter;

        if (!$voter) {
            throw new RuntimeException('User has no voter profile.');
        }

        if ($election->status !== 'active') {
            throw new RuntimeException('Election is not active.');
        }

        if (now()->lt($election->starts_at) || now()->gt($election->ends_at)) {
            throw new RuntimeException('Election is outside its voting window.');
        }

        $rollEntry = $election->electoralRollEntries()
            ->where('national_id_number', $voter->national_id_number)
            ->first();

        if (!$rollEntry) {
            throw new RuntimeException('Voter not found in electoral roll.');
        }

        $district = District::findOrFail($voter->registered_district_id);

        $constituency = $district->constituencies()->first();

        if (!$constituency) {
            throw new RuntimeException('District not mapped to constituency.');
        }

        $validConstituency = $election->constituencies()
            ->where('constituencies.id', $constituency->id)
            ->exists();

        if (!$validConstituency) {
            throw new RuntimeException('Constituency not part of election.');
        }

        $list = ElectionList::query()
            ->where('id', $listId)
            ->where('election_id', $election->id)
            ->where('constituency_id', $constituency->id)
            ->where('is_withdrawn', false)
            ->first();

        if (!$list) {
            throw new RuntimeException('Selected list is invalid for this voter.');
        }

        if ($preferentialCandidacyId !== null) {
            $candidate = Candidacy::query()
                ->where('id', $preferentialCandidacyId)
                ->where('election_id', $election->id)
                ->where('constituency_id', $constituency->id)
                ->first();

            if (!$candidate) {
                throw new RuntimeException('Preferential candidate is invalid for this election.');
            }

            $candidateOnList = $list->listCandidates()
                ->where('candidacy_id', $preferentialCandidacyId)
                ->exists();

            if (!$candidateOnList) {
                throw new RuntimeException('Preferential candidate is not on the selected list.');
            }

            if (!empty($candidate->district_id) && (int) $candidate->district_id !== (int) $district->id) {
                throw new RuntimeException('Preferential candidate does not belong to the voter district.');
            }
        }

        return DB::transaction(function () use (
            $voter,
            $election,
            $constituency,
            $district,
            $list,
            $preferentialCandidacyId
        ) {
            $status = VoterElectionStatus::query()
                ->where('voter_id', $voter->id)
                ->where('election_id', $election->id)
                ->lockForUpdate()
                ->first();

            if (!$status) {
                $status = VoterElectionStatus::create([
                    'voter_id' => $voter->id,
                    'election_id' => $election->id,
                    'has_voted' => false,
                    'voted_at' => null,
                ]);

                $status = VoterElectionStatus::query()
                    ->where('id', $status->id)
                    ->lockForUpdate()
                    ->first();
            }

            if ($status->has_voted) {
                throw new RuntimeException('Voter has already cast a ballot for this election.');
            }

            $castAt = now();

            $payload = [
                'election_id' => $election->id,
                'constituency_id' => $constituency->id,
                'district_id' => $district->id,
                'list_id' => $list->id,
                'preferential_candidacy_id' => $preferentialCandidacyId,
                'cast_at' => $castAt->toIso8601String(),
            ];

            $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            if ($payloadJson === false) {
                throw new RuntimeException('Failed to encode ballot payload.');
            }

            $encryptedPayload = encrypt($payloadJson);
            $payloadHash = hash('sha256', $payloadJson);
            $receiptHash = hash('sha256', $payloadHash . '|' . Str::uuid()->toString());

            $lastBallot = EncryptedBallot::query()
                ->orderByDesc('chain_index')
                ->lockForUpdate()
                ->first();

            $chainIndex = $lastBallot ? ((int) $lastBallot->chain_index + 1) : 1;
            $previousHash = $lastBallot?->block_hash;

            $blockHashMaterial = implode('|', [
                $chainIndex,
                $election->id,
                $constituency->id,
                $payloadHash,
                $receiptHash,
                $previousHash ?? '',
                $castAt->toIso8601String(),
            ]);

            $blockHash = hash('sha256', $blockHashMaterial);

            $ballot = EncryptedBallot::create([
                'chain_index' => $chainIndex,
                'election_id' => $election->id,
                'constituency_id' => $constituency->id,
                'encrypted_payload' => $encryptedPayload,
                'payload_hash' => $payloadHash,
                'receipt_hash' => $receiptHash,
                'previous_hash' => $previousHash,
                'block_hash' => $blockHash,
                'cast_at' => $castAt,
            ]);

            Receipt::create([
                'election_id' => $election->id,
                'receipt_hash' => $receiptHash,
                'issued_at' => $castAt,
            ]);

            $status->update([
                'has_voted' => true,
                'voted_at' => $castAt,
            ]);

            return [
                'message' => 'Vote cast successfully.',
                'election' => [
                    'id' => $election->id,
                    'title' => $election->title,
                ],
                'receipt' => [
                    'receipt_hash' => $receiptHash,
                    'issued_at' => $castAt->toISOString(),
                ],
                'ballot' => [
                    'id' => $ballot->id,
                    'chain_index' => $ballot->chain_index,
                    'block_hash' => $ballot->block_hash,
                    'previous_hash' => $ballot->previous_hash,
                    'cast_at' => $ballot->cast_at,
                ],
            ];
        });
    }
}