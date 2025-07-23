import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

import { getFoundationModel, listFoundationModels } from './apis/index.js';
import {
  awsTitanConverse,
  awsTitanStreamConverse,
  multiTurnChat,
  structuredResponse,
} from './apis/converse.js';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  /*
  const models = await listFoundationModels();
  const models = await getFoundationModel();
  console.log(models);
  await awsTitanConverse();
  (async () => {
    await awsTitanStreamConverse();
  })();
  await multiTurnChat();
  await structuredResponse();
  */
}

app.get('/converse', async (req, res) => {
  try {
    const result = await structuredResponse();
    res.json(result);
  } catch (error) {
    console.error('Error in /structured route:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
