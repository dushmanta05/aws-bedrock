<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\BedrockService;

class BedrockController extends Controller
{
    protected BedrockService $bedrock;

    public function __construct(BedrockService $bedrock)
    {
        $this->bedrock = $bedrock;
    }

    /**
     * Handle prompt input and return Bedrock response.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function generate(Request $request)
    {
        $request->validate([
            'prompt' => 'required|string',
        ]);

        $response = $this->bedrock->generateContent($request->input('prompt'));

        if ($response === null) {
            return response()->json(['error' => 'Failed to generate response from Bedrock'], 500);
        }

        return response()->json(['response' => $response]);
    }

    /**
     * Generate structured content using the Bedrock service.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function generateStructuredContent()
    {
        $response = $this->bedrock->generateStructuredContent();

        if (!$response) {
            return response()->json(['error' => 'Failed to generate structured content'], 500);
        }

        return response()->json([
            'success' => true,
            'text' => $response['text'],
            'data' => $response['data']
        ]);
    }
}
