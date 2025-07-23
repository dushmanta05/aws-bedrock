import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';

const { AWS_REGION: awsRegion, AWS_BEDROCK_MODEL: modelId } = process.env;

const client = new BedrockRuntimeClient({ region: awsRegion });

const userMessage = 'Tell me about Max Verstappen.';

const conversation = [
  {
    role: 'user',
    content: [{ text: userMessage }],
  },
];

const inferenceConfig = {
  maxTokens: 512,
  temperature: 0.5,
  topP: 0.9,
};

const buildMessage = (role, text) => ({
  role,
  content: [{ text }],
});

export const awsTitanConverse = async () => {
  const command = new ConverseCommand({
    modelId,
    messages: conversation,
    inferenceConfig,
  });

  try {
    const response = await client.send(command);
    const responseText = response.output.message.content[0].text;
    console.log(responseText);
  } catch (err) {
    console.error(`ERROR: Can't invoke '${modelId}'. Reason: ${err}`);
    process.exit(1);
  }
};

export const awsTitanStreamConverse = async () => {
  const command = new ConverseStreamCommand({
    modelId,
    messages: conversation,
    inferenceConfig,
  });

  try {
    const response = await client.send(command);
    for await (const item of response.stream) {
      if (item.contentBlockDelta?.delta?.text) {
        process.stdout.write(item.contentBlockDelta.delta.text);
      }
    }
  } catch (err) {
    console.error(`ERROR: Can't invoke '${modelId}'. Reason: ${err}`);
    process.exit(1);
  }
};

export const multiTurnChat = async () => {
  const firstUserMessage = 'Tell me about Max Verstappen.';
  const firstConversation = [buildMessage('user', firstUserMessage)];

  try {
    const firstCommand = new ConverseCommand({
      modelId,
      messages: firstConversation,
      inferenceConfig,
    });

    const firstResponse = await client.send(firstCommand);
    const firstAssistantReply = firstResponse.output.message.content[0].text;
    console.log(`Assistant (1st reply): ${firstAssistantReply}`);

    const secondUserMessage = 'What team does he drive for?';
    const secondConversation = [
      buildMessage('user', firstUserMessage),
      buildMessage('assistant', firstAssistantReply),
      buildMessage('user', secondUserMessage),
    ];

    const secondCommand = new ConverseCommand({
      modelId,
      messages: secondConversation,
      inferenceConfig,
    });

    const secondResponse = await client.send(secondCommand);
    const secondAssistantReply = secondResponse.output.message.content[0].text;
    console.log(`Assistant (2nd reply): ${secondAssistantReply}`);
  } catch (err) {
    console.error(`ERROR: Can't invoke '${modelId}'. Reason: ${err}`);
    process.exit(1);
  }
};

export const structuredResponse = async () => {
  const tools = [
    {
      toolSpec: {
        name: 'race_driver_info',
        description: 'Returns information about a Formula 1 driver in structured format',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              about: { type: 'string', description: 'Few lines about the driver' },
              name: { type: 'string', description: 'Full name of the driver' },
              birthDate: { type: 'string', description: 'Date of birth in YYYY-MM-DD' },
              nationality: { type: 'string', description: 'Nationality of the driver' },
              team: { type: 'string', description: 'Current F1 team' },
              championshipsWon: { type: 'integer', description: 'Number of world titles won' },
            },
            required: ['name', 'birthDate', 'nationality', 'team', 'championshipsWon'],
          },
        },
      },
    },
  ];

  const structuredPrompt = `
Extract structured information about the following Formula 1 driver. 
Only return structured JSON using the provided schema.

Driver: Max Verstappen
`;

  const conversation = [
    {
      role: 'user',
      content: [{ text: structuredPrompt }],
    },
  ];

  const command = new ConverseCommand({
    modelId,
    messages: conversation,
    inferenceConfig,
    toolConfig: {
      tools: tools,
      toolChoice: { auto: {} },
    },
  });

  try {
    const response = await client.send(command);
    const toolResponse = response.output?.message?.content;
    let textResponse;
    let outputResponse;

    if (toolResponse.length === 2) {
      textResponse = toolResponse[0]?.text;
      outputResponse = toolResponse[1]?.toolUse?.input;
    } else if (toolResponse.length === 1) {
      outputResponse = toolResponse[0]?.toolUse?.input;
    } else {
    }
    return { success: true, text: textResponse, data: outputResponse };
  } catch (error) {
    console.error(`ERROR: Structured response failed for '${modelId}': ${error}`);
    return { success: false, response: null, error: error };
  }
};
