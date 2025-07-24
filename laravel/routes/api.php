<?php

use App\Http\Controllers\BedrockController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/bedrock/generate', [BedrockController::class, 'generate']);
Route::get('/bedrock/structured', [BedrockController::class, 'generateStructuredContent']);
