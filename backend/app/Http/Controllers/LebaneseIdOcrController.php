<?php

namespace App\Http\Controllers;

use App\Http\Requests\LebaneseIdOcrRequest;
use App\Services\LebaneseIdOcrService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class LebaneseIdOcrController extends Controller
{
    public function extract(
        LebaneseIdOcrRequest $request,
        LebaneseIdOcrService $service
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

        try {
            $data = $service->extractFromImages(
                $frontImage->getRealPath(),
                $backImage->getRealPath()
            );
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
        }

        return response()->json([
            'ok' => true,
            'data' => $data,
        ]);
    }
}