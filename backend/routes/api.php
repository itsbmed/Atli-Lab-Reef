<?php

use App\Http\Controllers\AquariumController;
use App\Http\Controllers\AuthController;
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
});
