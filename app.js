import { fileURLToPath } from "node:url";
import 'dotenv/config'
import {
  BedrockClient,
  ListFoundationModelsCommand,
} from "@aws-sdk/client-bedrock";

export const listFoundationModels = async () => {
  const client = new BedrockClient();

  const input = {
    /** input parameters */
  };

  const command = new ListFoundationModelsCommand(input);
  const response = await client.send(command);
  return response.modelSummaries;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const models = await listFoundationModels();
  console.log(models);
}
