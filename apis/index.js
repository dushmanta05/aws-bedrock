import {
  BedrockClient,
  GetFoundationModelCommand,
  ListFoundationModelsCommand,
} from '@aws-sdk/client-bedrock';

const { AWS_REGION: awsRegion, AWS_BEDROCK_MODEL: modelIdentifier } = process.env;

/**
 * List the available Amazon Bedrock foundation models.
 *
 * @return {FoundationModelSummary[]} - The list of available bedrock foundation models.
 */
export const listFoundationModels = async () => {
  const client = new BedrockClient({
    region: awsRegion,
  });

  const input = {
    /** input parameters */
  };

  const command = new ListFoundationModelsCommand(input);
  const response = await client.send(command);
  console.log(response?.modelSummaries);
  return response.modelSummaries;
};

/**
 * Get details about an Amazon Bedrock foundation model.
 *
 * @return {FoundationModelDetails} - The list of available bedrock foundation models.
 */
export const getFoundationModel = async () => {
  const client = new BedrockClient();

  const command = new GetFoundationModelCommand({
    modelIdentifier: modelIdentifier,
  });

  const response = await client.send(command);

  return response.modelDetails;
};
