<?php

namespace App\Http\Controllers;

use App\Http\Requests\LebaneseIdOcrRequest;
use App\Services\LebaneseIdOcrService;
use Illuminate\Http\JsonResponse;

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

        $data = $service->extractFromImages(
            $frontImage->getRealPath(),
            $backImage->getRealPath()
        );

        return response()->json([
            'ok' => true,
            'data' => $data,
        ]);
    }
}