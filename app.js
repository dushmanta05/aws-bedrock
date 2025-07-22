import { fileURLToPath } from 'node:url';
import 'dotenv/config';

import { getFoundationModel, listFoundationModels } from './apis/index.js';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // const models = await listFoundationModels();
  const models = await getFoundationModel();
  console.log(models);
}
