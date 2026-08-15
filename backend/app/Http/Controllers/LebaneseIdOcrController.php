<?php

namespace App\Http\Controllers;

use App\Exceptions\UnsupportedIdImageException;
use App\Http\Requests\LebaneseIdOcrRequest;
use App\Services\IdImagePreparer;
use App\Services\LebaneseIdOcrService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class LebaneseIdOcrController extends Controller
{
    public function extract(
        LebaneseIdOcrRequest $request,
        LebaneseIdOcrService $service,
        IdImagePreparer $preparer
    ): JsonResponse {
        $auth = $request->attributes->get('auth');

        if (!$auth || !isset($auth->sub)) {
            return response()->json([
                'ok' => false,
                'message' => 'Unauthenticated',
            ], 401);
        }

        $frontImage = $request->file('front_image');
        $backImage = $request->file('back_image');

        if (!$frontImage || !$backImage) {
            return response()->json([
                'ok' => false,
                'message' => 'Both front_image and back_image are required.',
            ], 422);
        }

        // Format problems belong to the uploader, not the provider: a HEIC
        // photo or an unreadable file gets a 422 saying so, rather than the
        // generic "temporarily unavailable" below.
        try {
            $front = $preparer->prepare($frontImage, 'front');
            $back = $preparer->prepare($backImage, 'back');
        } catch (UnsupportedIdImageException $e) {
            $preparer->cleanup();

            return response()->json([
                'ok' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        try {
            $data = $service->extractFromImages($front, $back);
        } catch (\Throwable $e) {
            // The provider response can carry project identifiers and internal
            // URLs, so it is logged server-side and never returned to the client.
            Log::error('Lebanese ID OCR extraction failed', [
                'user_id' => $auth->sub,
                'exception' => $e,
            ]);

            return response()->json([
                'ok' => false,
                'message' => 'ID verification is temporarily unavailable. Please try again later.',
            ], 503);
        } finally {
            $preparer->cleanup();
        }

        return response()->json([
            'ok' => true,
            'data' => $data,
        ]);
    }
}