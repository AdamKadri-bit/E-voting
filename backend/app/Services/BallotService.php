<?php

namespace App\Services;

use App\Models\Election;
use App\Models\User;
use RuntimeException;

class BallotService
{
    public function generateBallot(User $user, Election $election): array
    {
        $voter = $user->voter;

        if (!$voter) {
            throw new RuntimeException('User has no voter profile.');
        }

        /*
        |--------------------------------------------------------------------------
        | Election status validation
        |--------------------------------------------------------------------------
        */

        if ($election->status !== 'active') {
            throw new RuntimeException('Election is not active.');
        }

        /*
        |--------------------------------------------------------------------------
        | Election time window validation
        |--------------------------------------------------------------------------
        */

        if (now()->lt($election->starts_at) || now()->gt($election->ends_at)) {
            throw new RuntimeException('Election is outside its voting window.');
        }

        /*
        |--------------------------------------------------------------------------
        | Electoral roll validation
        |--------------------------------------------------------------------------
        */

        $rollEntry = $election->electoralRollEntries()
            ->where('national_id_number', $voter->national_id_number)
            ->first();

        if (!$rollEntry) {
            throw new RuntimeException('Voter not found in electoral roll.');
        }

        /*
        |--------------------------------------------------------------------------
        | District → Constituency resolution
        |--------------------------------------------------------------------------
        */

        $district = $voter->district;

        if (!$district) {
            throw new RuntimeException('Voter district not found.');
        }

        $constituency = $district->constituencies()->first();

        if (!$constituency) {
            throw new RuntimeException('District not mapped to constituency.');
        }

        /*
        |--------------------------------------------------------------------------
        | Ensure constituency belongs to this election
        |--------------------------------------------------------------------------
        */

        $validConstituency = $election->constituencies()
            ->where('constituencies.id', $constituency->id)
            ->exists();

        if (!$validConstituency) {
            throw new RuntimeException('Constituency not part of this election.');
        }

        /*
        |--------------------------------------------------------------------------
        | Fetch lists and candidates
        |--------------------------------------------------------------------------
        */

        $lists = $constituency->lists()
            ->where('election_id', $election->id)
            ->where('is_withdrawn', false)
            ->with([
                'listCandidates.candidacy.candidateProfile'
            ])
            ->get();

        return [
            'election' => [
                'id' => $election->id,
                'title' => $election->title,
            ],
            'constituency' => [
                'id' => $constituency->id,
                'name' => $constituency->name,
            ],
            'lists' => $lists,
        ];
    }
}