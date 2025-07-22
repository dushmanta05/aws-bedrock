import { fileURLToPath } from 'node:url';
import 'dotenv/config';

import { getFoundationModel, listFoundationModels } from './apis/index.js';
import { awsTitanConverse, awsTitanStreamConverse, multiTurnChat } from './apis/converse.js';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  /*
  const models = await listFoundationModels();
  const models = await getFoundationModel();
  console.log(models);
  await awsTitanConverse();
  (async () => {
    await awsTitanStreamConverse();
    })();
    */
  await multiTurnChat();
}
