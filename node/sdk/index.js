import {
  BedrockClient,
  GetFoundationModelCommand,
  ListFoundationModelsCommand,
} from '@aws-sdk/client-bedrock';

const { AWS_REGION: awsRegion, AWS_BEDROCK_MODEL: modelIdentifier } = process.env;

export const listFoundationModels = async () => {
  const client = new BedrockClient({ region: awsRegion });
  const command = new ListFoundationModelsCommand({});
  const response = await client.send(command);
  return response.modelSummaries;
};

export const getFoundationModel = async () => {
  const client = new BedrockClient();
  const command = new GetFoundationModelCommand({ modelIdentifier });
  const response = await client.send(command);
  return response.modelDetails;
};
