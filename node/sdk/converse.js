import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';

const { AWS_REGION: awsRegion, AWS_BEDROCK_MODEL: modelId } = process.env;

const client = new BedrockRuntimeClient({ region: awsRegion });

const inferenceConfig = {
  maxTokens: 4096,
  temperature: 0.5,
  topP: 0.9,
};

const buildMessage = (role, text) => ({
  role,
  content: [{ text }],
});

export const awsTitanConverse = async () => {
  const conversation = [{ role: 'user', content: [{ text: 'Tell me about Max Verstappen.' }] }];

  const command = new ConverseCommand({
    modelId,
    messages: conversation,
    inferenceConfig,
  });

  try {
    const response = await client.send(command);
    const responseText = response.output.message.content[0].text;
    return { success: true, data: responseText, response: response };
  } catch (err) {
    return { success: false, data: null, message: err.message };
  }
};

export const awsTitanStreamConverse = async function* () {
  const conversation = [
    {
      role: 'user',
      content: [
        { text: 'Tell me about Max Verstappen, Red Bull Racing and his career over the years.' },
      ],
    },
  ];

  const command = new ConverseStreamCommand({
    modelId,
    messages: conversation,
    inferenceConfig,
  });

  try {
    const response = await client.send(command);
    for await (const item of response.stream) {
      if (item.contentBlockDelta?.delta?.text) {
        const chunk = item.contentBlockDelta.delta.text;
        console.log(`${chunk}\n----`);
        yield chunk;
      }
    }
  } catch (err) {
    throw new Error(err.message);
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
    console.log(firstAssistantReply);

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

    return {
      success: true,
      data: {
        firstReply: firstAssistantReply,
        secondReply: secondAssistantReply,
      },
      response: secondResponse,
    };
  } catch (err) {
    return { success: false, data: null, message: err.message };
  }
};

const toolsData = {
  driverTool: [
    {
      toolSpec: {
        name: 'race_driver_info',
        description: 'Returns information about a Formula 1 driver in structured format',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              about: { type: 'string' },
              name: { type: 'string' },
              birthDate: { type: 'string' },
              nationality: { type: 'string' },
              team: { type: 'string' },
              championshipsWon: { type: 'integer' },
            },
            required: ['name', 'birthDate', 'nationality', 'team', 'championshipsWon'],
          },
        },
      },
    },
  ],
  courseTool: [
    {
      toolSpec: {
        name: 'javascript_course_generator',
        description: 'Generates a structured JavaScript course with multiple chapters',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              courseTitle: { type: 'string' },
              chapters: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                  },
                  required: ['title', 'description'],
                },
              },
            },
            required: ['courseTitle', 'chapters'],
          },
        },
      },
    },
  ],
};

const driverPrompt = `
Extract structured information about the following Formula 1 driver.
Only return structured JSON using the provided schema.

Driver: Max Verstappen
`;

const coursePrompt = `
Generate a structured JavaScript course.
The course should have a title and a list of chapters.
Each chapter should include a title and a short description.

Only return structured JSON using the provided schema and return chapters as an array of JSON objects, not a stringified JSON.
`;

export const structuredResponse = async (prompt = 'coursePrompt') => {
  const conversation = [
    {
      role: 'user',
      content: [{ text: prompt === 'coursePrompt' ? coursePrompt : driverPrompt }],
    },
  ];

  const command = new ConverseCommand({
    modelId,
    messages: conversation,
    inferenceConfig,
    toolConfig: {
      tools: prompt === 'coursePrompt' ? toolsData.courseTool : toolsData.driverTool,
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
    }

    return { success: true, text: textResponse, data: outputResponse, response };
  } catch (error) {
    console.log(error);
    return { success: false, data: null, message: error.message };
  }
};
