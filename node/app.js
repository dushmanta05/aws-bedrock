import express from 'express';
import 'dotenv/config';

import { getFoundationModel, listFoundationModels } from './sdk/index.js';
import {
  awsTitanConverse,
  awsTitanStreamConverse,
  multiTurnChat,
  structuredResponse,
} from './sdk/converse.js';
import {
  generateContent,
  generateStructuredContent,
  multiTurnChatREST,
  streamConverse,
} from './rest-api/index.js';

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

app.get('/converse', async (_, res) => {
  const result = await awsTitanConverse();
  res.status(result.success ? 200 : 500).json(result);
});

app.get('/converse/stream', async (_, res) => {
  try {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.flushHeaders?.();

    for await (const chunk of awsTitanStreamConverse()) {
      res.write(`${chunk} \n\n`);
      res.flush?.();
    }

    res.end();
  } catch (err) {
    console.error('Stream error:', err);
    res.status(500).send(`Error: ${err.message}`);
  }
});

app.get('/converse/multi-turn', async (_, res) => {
  const result = await multiTurnChat();
  res.status(result.success ? 200 : 500).json(result);
});

app.get('/structured/course', async (_, res) => {
  const result = await structuredResponse('coursePrompt');
  res.status(result.success ? 200 : 500).json(result);
});

app.get('/structured/driver', async (_, res) => {
  const result = await structuredResponse('driverPrompt');
  res.status(result.success ? 200 : 500).json(result);
});

app.get('/models', async (_, res) => {
  try {
    const models = await listFoundationModels();
    res.json({ success: true, data: models });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

app.get('/model', async (_, res) => {
  try {
    const model = await getFoundationModel();
    res.json({ success: true, data: model });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

app.post('/bedrock/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(422).json({ error: 'prompt is required' });

  const result = await generateContent(prompt);
  res
    .status(result.success ? 200 : 500)
    .json(
      result.success
        ? { data: result.data, response: result?.response }
        : { error: 'Failed to generate response from Bedrock' }
    );
});

app.post('/bedrock/stream', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(422).json({ error: 'prompt is required' });

  await streamConverse(prompt);

  res.status(200).json({ success: true, message: 'Stream complete. Check terminal for logs.' });
});

app.get('/bedrock/multi-turn', async (_, res) => {
  const result = await multiTurnChatREST();
  res
    .status(result.success ? 200 : 500)
    .json(
      result.success
        ? { success: true, response: result.response, data: result.data }
        : { error: 'Failed to generate structured content' }
    );
});

app.get('/bedrock/structured', async (_, res) => {
  const result = await generateStructuredContent();
  res
    .status(result.success ? 200 : 500)
    .json(
      result.success
        ? { success: true, text: result.text, data: result.data, response: result?.response }
        : { error: 'Failed to generate structured content' }
    );
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
