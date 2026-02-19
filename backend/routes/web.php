<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;


Route::get('/', function () {
    return view('welcome');
});
/* Route::get('/api/ping', function (Request $request) {
    return response()->json([
        'ok' => true,
        'origin' => $request->header('origin'),
    ]);
}); */
