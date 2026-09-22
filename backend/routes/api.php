<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BallotController;
use App\Http\Controllers\VoteController;
use App\Http\Controllers\ReceiptController;
use App\Http\Controllers\AuditChainController;
use App\Http\Controllers\RegistryLinkController;
use App\Http\Controllers\LebaneseIdOcrController;
use App\Http\Controllers\VoterElectionsController;
use App\Http\Controllers\BulletinBoardController;
use App\Http\Controllers\TrusteeController;
use App\Http\Controllers\WebAuthnController;
use App\Http\Controllers\Admin\E2eAdminController;

use App\Http\Controllers\Admin\OverviewController;
use App\Http\Controllers\Admin\ElectionAdminController;
use App\Http\Controllers\Admin\ListAdminController;
use App\Http\Controllers\Admin\CandidateAdminController;
use App\Http\Controllers\Admin\CandidateImportController;
use App\Http\Controllers\Admin\ResultsController;

Route::get('/ping', function () {
    return response()->json(['ok' => true]);
});

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

// Per-IP limits; login additionally locks the account with exponential backoff.
Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/auth/webauthn/options', [WebAuthnController::class, 'loginOptions'])->middleware('throttle:10,1');
Route::post('/auth/webauthn/verify', [WebAuthnController::class, 'loginVerify'])->middleware('throttle:10,1');
Route::post('/auth/refresh', [AuthController::class, 'refresh']);
Route::post('/auth/logout', [AuthController::class, 'logout']);

Route::post('/auth/resend-verification', [AuthController::class, 'resendVerification'])
    ->middleware('throttle:6,1');

/*
|--------------------------------------------------------------------------
| Current User
|--------------------------------------------------------------------------
*/

Route::get('/me', function (Request $request) {

    $auth = $request->attributes->get('auth');

    if (!$auth || !isset($auth->sub)) {
        return response()->json(['message' => 'Unauthenticated'], 401);
    }

    $user = \App\Models\User::with('registryPerson')->find($auth->sub);

    if (!$user) {
        return response()->json(['message' => 'User not found'], 401);
    }

    $voterStatus = app(VoterElectionsController::class)->statusPayload($user);

    return response()->json([
        'ok' => true,
        'user' => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'email_verified_at' => $user->email_verified_at,
            'email_verified' => $user->hasVerifiedEmail(),

            'registry_person_id' => $user->registry_person_id,
            'verification_status' => $user->verification_status,
            'can_vote' => $user->can_vote,
            'has_voter_profile' => $user->voter()->exists(),
            'voter_status' => $voterStatus,
            'is_trustee' => $user->trusteeSeats()->exists(),
            'passkeys' => $user->webauthnCredentials()->count(),

            'registry_person' => $user->registryPerson ? [
                'id' => $user->registryPerson->id,
                'full_name_en' => $user->registryPerson->full_name_en,
                'full_name_ar' => $user->registryPerson->full_name_ar,
                'district' => $user->registryPerson->district,
                'locality' => $user->registryPerson->locality,
                'constituency_id' => $user->registryPerson->constituency_id,
                'is_eligible' => $user->registryPerson->is_eligible,
                'has_voted' => $user->registryPerson->has_voted,
            ] : null,
        ],
    ]);

})->middleware('jwt.cookie');

/*
|--------------------------------------------------------------------------
| Email Verification
|--------------------------------------------------------------------------
*/

Route::post('/email/verification-notification', function (Request $request) {

    $auth = $request->attributes->get('auth');
    $user = \App\Models\User::find($auth->sub);

    if (!$user) {
        return response()->json(['message' => 'User not found'], 404);
    }

    if ($user->hasVerifiedEmail()) {
        return response()->json(['message' => 'Already verified'], 200);
    }

    $user->sendEmailVerificationNotification();

    return response()->json(['ok' => true]);

})->middleware('jwt.cookie');


Route::get('/verify-email/{id}/{hash}', function (Request $request, $id, $hash) {

    $user = \App\Models\User::find($id);

    if (!$user) {
        return response()->json(['message' => 'User not found'], 404);
    }

    if (!hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
        return response()->json(['message' => 'Invalid verification link'], 403);
    }

    if ($user->hasVerifiedEmail()) {
        return response()->json(['ok' => true, 'already_verified' => true]);
    }

    $user->markEmailAsVerified();

    event(new \Illuminate\Auth\Events\Verified($user));

    return response()->json(['ok' => true]);

})->middleware('signed')->name('verification.verify');


/*
|--------------------------------------------------------------------------
| Elections + Protected Voting Routes
|--------------------------------------------------------------------------
*/

Route::middleware('jwt.cookie')->group(function () {

    /*
    | Fetch ballot
    */
    Route::get('/elections/{election}/ballot', [BallotController::class, 'show']);

    /*
    | Elections open to this voter, and resident/diaspora status
    */
    Route::get('/elections', [VoterElectionsController::class, 'index']);
    Route::put('/me/voter-status', [VoterElectionsController::class, 'updateStatus'])->middleware('throttle:20,1');

    /*
    | Cast an encrypted ballot (proofs checked server-side). The old plaintext
    | endpoint is kept only to answer 410 Gone.
    */
    Route::post('/elections/{election}/ballots', [VoteController::class, 'cast'])->middleware('throttle:20,1');
    Route::post('/elections/{election}/vote', [VoteController::class, 'legacy']);

    /*
    | Passkeys (WebAuthn) for the signed-in account
    */
    Route::get('/webauthn/credentials', [WebAuthnController::class, 'index']);
    Route::post('/webauthn/register/options', [WebAuthnController::class, 'registerOptions']);
    Route::post('/webauthn/register', [WebAuthnController::class, 'register'])->middleware('throttle:10,1');
    Route::delete('/webauthn/credentials/{id}', [WebAuthnController::class, 'destroy']);

    /*
    | Trustees: key ceremony and decryption ceremony
    */
    Route::get('/trustee/elections', [TrusteeController::class, 'index']);
    Route::get('/trustee/elections/{election}', [TrusteeController::class, 'show']);
    Route::post('/trustee/elections/{election}/round1', [TrusteeController::class, 'round1']);
    Route::post('/trustee/elections/{election}/round2', [TrusteeController::class, 'round2']);
    Route::get('/trustee/elections/{election}/incoming', [TrusteeController::class, 'incoming']);
    Route::post('/trustee/elections/{election}/round3', [TrusteeController::class, 'round3']);
    Route::get('/trustee/elections/{election}/decryption', [TrusteeController::class, 'decryption']);
    Route::post('/trustee/elections/{election}/partial', [TrusteeController::class, 'partial']);

    /*
    | Verify ballot chain
    */
    Route::get('/audit/ballot-chain/verify', [AuditChainController::class, 'verifyBallots']);

    /*
    | OCR Lebanese ID (front + back)
    */
    Route::post('/ocr/lebanese-id', [LebaneseIdOcrController::class, 'extract']);

    /*
    | Link voter registry record
    */
    Route::post('/registry/link', RegistryLinkController::class);
});


/*
|--------------------------------------------------------------------------
| Receipt verification (public)
|--------------------------------------------------------------------------
*/

Route::get('/receipts/{receiptHash}', [ReceiptController::class, 'show']);

/*
|--------------------------------------------------------------------------
| Public bulletin board, verifier input and live turnout (no auth)
|--------------------------------------------------------------------------
| Audited-ballot publishing is public on purpose: the browser sends it without
| cookies so a spoiled ballot can't be tied to the voter who audited it.
*/

Route::middleware('throttle:120,1')->group(function () {
    Route::get('/board/elections', [BulletinBoardController::class, 'elections']);
    Route::get('/board/elections/{election}', [BulletinBoardController::class, 'show']);
    Route::get('/board/elections/{election}/ballots', [BulletinBoardController::class, 'ballots']);
    Route::get('/board/elections/{election}/lookup/{code}', [BulletinBoardController::class, 'lookup']);
    Route::get('/elections/{election}/turnout', [BulletinBoardController::class, 'turnout']);
});
Route::get('/board/elections/{election}/export', [BulletinBoardController::class, 'export'])->middleware('throttle:20,1');
Route::post('/elections/{election}/audited-ballots', [VoteController::class, 'audit'])->middleware('throttle:10,1');


/*
|--------------------------------------------------------------------------
| Admin panel (role-guarded)
|--------------------------------------------------------------------------
| All routes require a valid JWT cookie AND an admin role (EnsureAdmin).
*/

Route::middleware(['jwt.cookie', 'admin'])->prefix('admin')->group(function () {

    /* Overview: pick an election, then read its figures. */
    Route::get('/overview', [OverviewController::class, 'index']);
    Route::get('/overview/elections/{election}', [OverviewController::class, 'show']);

    /* Elections */
    Route::get('/constituencies', [ElectionAdminController::class, 'constituencies']);
    Route::get('/elections', [ElectionAdminController::class, 'index']);
    Route::post('/elections', [ElectionAdminController::class, 'store']);
    Route::get('/elections/{election}', [ElectionAdminController::class, 'show']);
    Route::put('/elections/{election}', [ElectionAdminController::class, 'update']);
    Route::patch('/elections/{election}/status', [ElectionAdminController::class, 'updateStatus']);
    Route::put('/elections/{election}/constituencies', [ElectionAdminController::class, 'syncConstituencies']);

    /* Lists */
    Route::get('/elections/{election}/lists', [ListAdminController::class, 'index']);
    Route::post('/elections/{election}/lists', [ListAdminController::class, 'store']);
    Route::put('/lists/{list}', [ListAdminController::class, 'update']);
    Route::delete('/lists/{list}', [ListAdminController::class, 'destroy']);
    Route::get('/lists/{list}/available-candidacies', [ListAdminController::class, 'availableCandidacies']);
    Route::post('/lists/{list}/candidates', [ListAdminController::class, 'addCandidate']);
    Route::delete('/lists/{list}/candidates/{listCandidate}', [ListAdminController::class, 'removeCandidate']);

    /* Spreadsheet import (lists + candidates + membership in one sheet) */
    Route::get('/elections/{election}/import/template', [CandidateImportController::class, 'template']);
    Route::get('/elections/{election}/export', [CandidateImportController::class, 'export']);
    Route::post('/elections/{election}/import/preview', [CandidateImportController::class, 'preview']);
    Route::post('/elections/{election}/import', [CandidateImportController::class, 'store']);

    /* Candidacies */
    Route::get('/elections/{election}/candidacies', [CandidateAdminController::class, 'index']);
    Route::post('/elections/{election}/candidacies', [CandidateAdminController::class, 'store']);
    Route::patch('/candidacies/{candidacy}/status', [CandidateAdminController::class, 'updateStatus']);

    /* Results & audit */
    Route::get('/elections/{election}/results', [ResultsController::class, 'results']);
    Route::get('/elections/{election}/geo-results', [ResultsController::class, 'geoResults']);
    Route::get('/elections/{election}/turnout-timeline', [ResultsController::class, 'turnoutTimeline']);
    Route::get('/audit/logs', [ResultsController::class, 'auditLogs']);

    /* Trustees, tally, participation map, verification and report */
    Route::get('/trustee-candidates', [E2eAdminController::class, 'trusteeCandidates']);
    Route::get('/elections/{election}/ceremony', [E2eAdminController::class, 'ceremony']);
    Route::put('/elections/{election}/trustees', [E2eAdminController::class, 'assignTrustees']);
    Route::post('/elections/{election}/ceremony/reset', [E2eAdminController::class, 'resetCeremony']);
    Route::post('/elections/{election}/tally', [E2eAdminController::class, 'startTally']);
    Route::get('/elections/{election}/participation', [E2eAdminController::class, 'participation']);
    Route::get('/elections/{election}/verify', [E2eAdminController::class, 'verify']);
    Route::get('/elections/{election}/report', [E2eAdminController::class, 'report']);
    Route::get('/audit/chain', [ResultsController::class, 'verifyChain']);
});