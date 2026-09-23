<?php

namespace App\Http\Controllers;

use App\Exceptions\UnsupportedIdImageException;
use App\Services\IdImagePreparer;
use App\Services\Ocr\IdentityDocumentOcrService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

/**
 * Scans the identity document a voter chose — national ID (front + back),
 * ikhraj qayd (one page) or passport (photo page) — and returns the fields
 * for the registry-link form. The voter always reviews and can correct them.
 */
class IdentityDocumentOcrController extends Controller
{
    public function extract(Request $request, IdentityDocumentOcrService $service, IdImagePreparer $preparer): JsonResponse
    {
        $auth = $request->attributes->get('auth');
        if (!$auth || !isset($auth->sub)) {
            return response()->json(['ok' => false, 'message' => 'Unauthenticated'], 401);
        }

        $data = $request->validate([
            'document_type' => ['required', Rule::in(IdentityDocumentOcrService::TYPES)],
            'front_image' => ['required', 'file', 'max:20480'],
            'back_image' => ['required_if:document_type,national_id', 'nullable', 'file', 'max:20480'],
        ], [
            'back_image.required_if' => 'A national ID card needs a photo of the back as well.',
        ]);

        try {
            $front = $preparer->prepare($request->file('front_image'), $data['document_type'] === 'national_id' ? 'front' : 'document');
            $back = $data['document_type'] === 'national_id' ? $preparer->prepare($request->file('back_image'), 'back') : null;
        } catch (UnsupportedIdImageException $e) {
            $preparer->cleanup();

            return response()->json(['ok' => false, 'message' => $e->getMessage()], 422);
        }

        try {
            $result = $service->extract($data['document_type'], $front, $back);
        } catch (\Throwable $e) {
            // Provider errors can carry project identifiers; log them, never return them.
            Log::error('Identity document OCR failed', ['user_id' => $auth->sub, 'type' => $data['document_type'], 'exception' => $e]);

            return response()->json(['ok' => false, 'message' => 'Document scanning is temporarily unavailable. You can type your details instead.'], 503);
        } finally {
            $preparer->cleanup();
        }

        return response()->json(['ok' => true] + $result);
    }
}
