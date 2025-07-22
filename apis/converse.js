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
