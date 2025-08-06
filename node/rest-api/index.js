import axios from 'axios';

const {
  AWS_REGION: region,
  AWS_BEDROCK_MODEL: modelId,
  AWS_BEARER_TOKEN_BEDROCK: apiKey,
} = process.env;

const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${modelId}/converse`;

const generateContent = async (prompt) => {
  const payload = {
    messages: [
      {
        role: 'user',
        content: [{ text: prompt }],
      },
    ],
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const content = response.data?.output?.message?.content;
    const text = content?.find((c) => c.text)?.text;
    return { success: true, data: text || null, response: response?.data };
  } catch (err) {
    return {
      success: false,
      message: err.response?.data || err.message,
    };
  }
};

const multiTurnChatREST = async () => {
  const buildMessage = (role, text) => ({
    role,
    content: [{ text }],
  });

  const firstUserMessage = 'Tell me about Max Verstappen.';
  const firstConversation = [buildMessage('user', firstUserMessage)];

  try {
    const firstResponse = await axios.post(
      url,
      { messages: firstConversation },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    const firstAssistantReply = firstResponse.data.output.message.content?.find(
      (c) => c.text
    )?.text;

    const secondUserMessage = 'What team does he drive for?';
    const secondConversation = [
      buildMessage('user', firstUserMessage),
      buildMessage('assistant', firstAssistantReply),
      buildMessage('user', secondUserMessage),
    ];

    const secondResponse = await axios.post(
      url,
      { messages: secondConversation },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    const secondAssistantReply = secondResponse.data.output.message.content?.find(
      (c) => c.text
    )?.text;

    return {
      success: true,
      data: {
        firstReply: firstAssistantReply,
        secondReply: secondAssistantReply,
      },
      response: {
        firstResponse: firstResponse.data,
        secondResponse: secondResponse.data,
      },
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message: err.response?.data || err.message,
    };
  }
};

const streamConverse = async (prompt) => {
  const streamURL = `${url}-stream`;
  const fetch = global.fetch;

  const payload = {
    messages: [
      {
        role: 'user',
        content: [{ text: prompt }],
      },
    ],
  };

  try {
    const response = await fetch(streamURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    console.log('[Stream Start]');
    let buffer = '';
    const allChunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log('[Stream End]');
        console.log('\n[Final Response]:', allChunks.join(''));
        console.log('\n[Total Chunks]:', allChunks.length);
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const cleanLine = line.replace(/[^\x20-\x7E\n\r\t]/g, '').trim();

        if (!cleanLine) continue;

        let searchIndex = 0;
        while (true) {
          const messageTypeIndex = cleanLine.indexOf(':message-typeevent', searchIndex);
          if (messageTypeIndex === -1) break;

          const jsonStart = messageTypeIndex + ':message-typeevent'.length;

          let braceCount = 0;
          let jsonEnd = jsonStart;
          let foundStart = false;

          for (let i = jsonStart; i < cleanLine.length; i++) {
            const char = cleanLine[i];
            if (char === '{') {
              if (!foundStart) foundStart = true;
              braceCount++;
            } else if (char === '}') {
              braceCount--;
              if (foundStart && braceCount === 0) {
                jsonEnd = i + 1;
                break;
              }
            }
          }

          if (foundStart && braceCount === 0) {
            const jsonString = cleanLine.substring(jsonStart, jsonEnd);

            try {
              const data = JSON.parse(jsonString);

              if (data?.delta?.text) {
                console.log('[Chunk]:', data.delta.text);
                allChunks.push(data.delta.text);
              }
            } catch (err) {
              console.error('[JSON Parse Error]:', err.message, 'Raw JSON:', jsonString);
            }
          }

          searchIndex = messageTypeIndex + 1;
        }
      }
    }
  } catch (err) {
    console.error('[Stream Error]', err.message);
  }
};

const generateStructuredContent = async () => {
  const prompt = `Generate a structured JavaScript course.
The course should have a title and a list of chapters.
Each chapter should include a title and a short description.

Only return structured JSON using the provided schema and return chapters as an array of JSON objects, not a stringified JSON.`;

  const messages = [
    {
      role: 'user',
      content: [{ text: prompt }],
    },
  ];

  const tools = [
    {
      toolSpec: {
        name: 'javascript_course_generator',
        description: 'Generates a structured JavaScript course with multiple chapters',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              courseTitle: {
                type: 'string',
                description: 'Title of the course',
              },
              chapters: {
                type: 'array',
                description: 'List of course chapters',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'Title of the chapter' },
                    description: { type: 'string', description: 'Description of the chapter' },
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
  ];

  const payload = {
    messages,
    toolConfig: {
      tools,
      toolChoice: { auto: {} },
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const content = response.data?.output?.message?.content || [];
    const result = { text: null, data: null };

    for (const item of content) {
      if (item.toolUse?.input) result.data = item.toolUse.input;
      if (item.text) result.text = item.text;
    }

    return { success: true, ...result, response: response?.data };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message: err.response?.data || err.message,
    };
  }
};

export { generateContent, multiTurnChatREST, streamConverse, generateStructuredContent };
