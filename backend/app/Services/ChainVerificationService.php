<?php

namespace App\Services;

use App\Models\EncryptedBallot;

class ChainVerificationService
{
    public function verifyBallotChain(): array
    {
        $ballots = EncryptedBallot::query()
            ->orderBy('chain_index')
            ->get();

        $previousHash = null;
        $verifiedCount = 0;

        foreach ($ballots as $ballot) {
            if ((string) ($ballot->previous_hash ?? '') !== (string) ($previousHash ?? '')) {
                return [
                    'valid' => false,
                    'message' => 'Ballot chain broken at previous hash mismatch.',
                    'failed_ballot_id' => $ballot->id,
                    'failed_chain_index' => $ballot->chain_index,
                ];
            }

            $material = implode('|', [
                $ballot->chain_index,
                $ballot->election_id,
                $ballot->constituency_id,
                $ballot->payload_hash,
                $ballot->receipt_hash,
                $ballot->previous_hash ?? '',
                $ballot->cast_at->toIso8601String(),
            ]);

            $expectedHash = hash('sha256', $material);

            if ($ballot->block_hash !== $expectedHash) {
                return [
                    'valid' => false,
                    'message' => 'Ballot chain broken at block hash mismatch.',
                    'failed_ballot_id' => $ballot->id,
                    'failed_chain_index' => $ballot->chain_index,
                ];
            }

            $previousHash = $ballot->block_hash;
            $verifiedCount++;
        }

        return [
            'valid' => true,
            'message' => 'Ballot chain verified successfully.',
            'verified_ballots' => $verifiedCount,
            'latest_hash' => $previousHash,
        ];
    }
}