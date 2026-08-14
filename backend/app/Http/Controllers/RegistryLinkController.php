<?php

namespace App\Http\Controllers;

use App\Exceptions\RegistryRecordAlreadyClaimedException;
use App\Http\Requests\LinkRegistryRequest;
use App\Models\User;
use App\Services\RegistryLinkingService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;

class RegistryLinkController extends Controller
{
    public function __invoke(
        LinkRegistryRequest $request,
        RegistryLinkingService $service
    ): JsonResponse {
        $auth = $request->attributes->get('auth');

        if (!$auth || !isset($auth->sub)) {
            return response()->json([
                'ok' => false,
                'message' => 'Unauthenticated',
            ], 401);
        }

        $user = User::find($auth->sub);

        if (!$user) {
            return response()->json([
                'ok' => false,
                'message' => 'User not found',
            ], 401);
        }

        if ($user->registry_person_id) {
            return response()->json([
                'ok' => false,
                'message' => 'This account is already linked to a voter registry record.',
            ], 422);
        }

        try {
            $person = $service->linkUser($user, $request->validated());
        } catch (RegistryRecordAlreadyClaimedException) {
            return response()->json([
                'ok' => false,
                'message' => 'This voter registry record is already linked to another account.',
            ], 409);
        } catch (QueryException $e) {
            // The unique index on users.registry_person_id is the last line of
            // defence if two requests race past the check above.
            if ($e->getCode() === '23000') {
                return response()->json([
                    'ok' => false,
                    'message' => 'This voter registry record is already linked to another account.',
                ], 409);
            }

            throw $e;
        }

        if (!$person) {
            return response()->json([
                'ok' => false,
                'message' => 'No matching voter registry record was found.',
            ], 404);
        }

        $user->refresh();

        return response()->json([
            'ok' => true,
            'message' => 'Voter registry record linked successfully.',
            'user' => [
                'id' => $user->id,
                'registry_person_id' => $user->registry_person_id,
                'verification_status' => $user->verification_status,
                'can_vote' => $user->can_vote,
            ],
            'registry_person' => [
                'id' => $person->id,
                'full_name_en' => $person->full_name_en,
                'full_name_ar' => $person->full_name_ar,
                'civil_registry_number' => $person->civil_registry_number,
                'district' => $person->district,
                'locality' => $person->locality,
                'constituency_id' => $person->constituency_id,
                'is_eligible' => $person->is_eligible,
                'has_voted' => $person->has_voted,
            ],
        ]);
    }
}
