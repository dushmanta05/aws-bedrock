<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class BedrockService
{
    protected string $apiKey;
    protected string $modelId;
    protected string $region;

    public function __construct()
    {
        $this->apiKey = config('services.bedrock.api_key');
        $this->modelId = config('services.bedrock.model_id');
        $this->region = config('services.bedrock.region');
    }

    /**
     * Send prompt to Bedrock model and get response.
     *
     * @param string $prompt
     * @return string|null
     */
    public function generateContent(string $prompt): ?string
    {
        $url = "https://bedrock-runtime.{$this->region}.amazonaws.com/model/{$this->modelId}/converse";

        $payload = [
            'messages' => [
                [
                    'role' => 'user',
                    'content' => [
                        ['text' => $prompt]
                    ]
                ]
            ]
        ];

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'Authorization' => "Bearer {$this->apiKey}",
            ])->post($url, $payload);

            if ($response->successful()) {
                $json = $response->json();
                Log::info($json);
                return $json['output']['message']['content'][0]['text'] ?? null;
            } else {
                Log::error('Bedrock API error', ['status' => $response->status(), 'body' => $response->body()]);
                return null;
            }
        } catch (Exception $e) {
            Log::error('BedrockService Exception: ' . $e->getMessage());
            return null;
        }
    }

    public function generateStructuredContent(): ?array
    {
        $url = "https://bedrock-runtime.{$this->region}.amazonaws.com/model/{$this->modelId}/converse";

        $prompt = <<<PROMPT
Generate a structured JavaScript course.
The course should have a title and a list of chapters.
Each chapter should include a title and a short description.

Only return structured JSON using the provided schema.
PROMPT;

        $messages = [
            [
                'role' => 'user',
                'content' => [
                    ['text' => $prompt],
                ],
            ],
        ];

        $inferenceConfig = [
            'maxTokens' => 512,
            'temperature' => 0.5,
            'topP' => 0.9,
        ];

        $tools = [
            [
                'toolSpec' => [
                    'name' => 'javascript_course_generator',
                    'description' => 'Generates a structured JavaScript course with multiple chapters',
                    'inputSchema' => [
                        'json' => [
                            'type' => 'object',
                            'properties' => [
                                'courseTitle' => ['type' => 'string', 'description' => 'Title of the course'],
                                'chapters' => [
                                    'type' => 'array',
                                    'description' => 'List of course chapters',
                                    'items' => [
                                        'type' => 'object',
                                        'properties' => [
                                            'title' => ['type' => 'string', 'description' => 'Title of the chapter'],
                                            'description' => ['type' => 'string', 'description' => 'Description of the chapter'],
                                        ],
                                        'required' => ['title', 'description'],
                                    ],
                                ],
                            ],
                            'required' => ['courseTitle', 'chapters'],
                        ],
                    ],
                ],
            ],
        ];

        $payload = [
            'messages' => $messages,
            // 'inferenceConfig' => $inferenceConfig,
            'toolConfig' => [
                'tools' => $tools,
                'toolChoice' => ['auto' => new \stdClass()],
            ],
        ];

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'Authorization' => "Bearer {$this->apiKey}",
            ])->post($url, $payload);

            if ($response->successful()) {
                $json = $response->json();
                Log::info($json);

                $content = $json['output']['message']['content'] ?? [];
                $structured = [
                    'text' => null,
                    'data' => null,
                ];

                foreach ($content as $item) {
                    if (isset($item['toolUse']['input'])) {
                        $structured['data'] = $item['toolUse']['input'];
                    } elseif (isset($item['text'])) {
                        $structured['text'] = $item['text'];
                    }
                }

                return $structured;
            } else {
                Log::error('Structured Bedrock API call failed.', ['status' => $response->status(), 'body' => $response->body()]);
                return null;
            }
        } catch (Exception $e) {
            Log::error('Structured BedrockService error: ' . $e->getMessage());
            return null;
        }
    }
}
