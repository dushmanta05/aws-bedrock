import axios from 'axios';

const apiKey = process.env.AWS_BEARER_TOKEN_BEDROCK;
const modelId = process.env.AWS_BEDROCK_MODEL;
const region = process.env.AWS_REGION;

const generateContent = async (prompt) => {
  const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${modelId}/converse`;

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
    return { success: true, data: text || null };
  } catch (err) {
    return {
      success: false,
      message: err.response?.data || err.message,
    };
  }
};

const generateStructuredContent = async () => {
  const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${modelId}/converse`;

  const prompt = `Generate a structured JavaScript course.
The course should have a title and a list of chapters.
Each chapter should include a title and a short description.

Only return structured JSON using the provided schema.`;

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

    return { success: true, ...result };
  } catch (err) {
    return {
      success: false,
      message: err.response?.data || err.message,
    };
  }
};

export { generateContent, generateStructuredContent };
