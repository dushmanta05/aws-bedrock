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
