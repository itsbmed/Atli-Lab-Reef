<?php

use App\Http\Controllers\AnalysisController;
use App\Http\Controllers\AquariumController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\VoucherController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::middleware('throttle:10,1')->group(function () {
        Route::post('register', [AuthController::class, 'register']);
        Route::post('login', [AuthController::class, 'login']);
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
        Route::patch('me', [AuthController::class, 'updateProfile']);
        Route::put('password', [AuthController::class, 'updatePassword'])->middleware('throttle:10,1');
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('aquariums', AquariumController::class);

    Route::get('analyses', [AnalysisController::class, 'index']);
    Route::get('analyses/{analysis}', [AnalysisController::class, 'show']);
    // Begrenzt, damit sich Barcodes nicht durchprobieren lassen.
    Route::middleware('throttle:20,1')->group(function () {
        Route::post('analyses', [AnalysisController::class, 'store']);
        Route::get('vouchers/{code}', [VoucherController::class, 'show']);
    });
});
