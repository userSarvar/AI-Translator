import fetch from 'node-fetch';

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Model lists
const togetherModels = [
  'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
  'serverless-qwen-qwen3-32b-fp8',
];

const openrouterModels = [
  'deepseek/deepseek-r1-0528-qwen3-8b:free',
  'mistralai/mistral-small-3.2-24b-instruct:free',
  'qwen/qwen1.5-7b-chat:free',
  'qwen/qwen3-32b-04-28:free',
  'venice/uncensored:free',
  'google/gemma-3-27b-it:free',
  'meta-llama/llama-4-maverick:free'
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, direction } = req.body;
  if (!text || !direction) {
    return res.status(400).json({ result: 'Invalid input.' });
  }

  const prompt =
    direction === 'to_genz'
      ? `Your job is to rephrase the following sentence into current Gen Z slang. Use trendy but widely understood slang, memes, abbreviations, and emojis. The result should sound natural to a Gen Z speaker, be funny if possible, and maintain the original meaning clearly. Do NOT explain or add commentary — output only the Gen Z version in one sentence.\n\nInput: "${text}"`
      : `You are a formal English translator. Convert the following Gen Z slang into a clear, professional sentence. Do not add commentary or multiple options — return only one accurate, grammatically correct translation that preserves the original meaning in plain English.\n\nInput: "${text}"`;

  // 1. Try Together.ai models
  for (const model of togetherModels) {
    try {
      const response = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOGETHER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                'You are a precise translator who always returns one accurate sentence without adding comments or choices.',
            },
            { role: 'user', content: prompt },
          ],
        }),
      });

      const data = await response.json();
      if (data.choices?.[0]?.message?.content) {
        return res.status(200).json({
          result: data.choices[0].message.content,
          model: model,
          provider: 'Together.ai',
        });
      }
    } catch (err) {
      console.error(`Together model ${model} failed:`, err);
    }
  }

  // 2. Fallback to OpenRouter if Together fails
  for (const model of openrouterModels) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                'You are a precise translator who always returns one accurate sentence without adding comments or choices.',
            },
            { role: 'user', content: prompt },
          ],
        }),
      });

      const data = await response.json();
      if (data.choices?.[0]?.message?.content) {
        return res.status(200).json({
          result: data.choices[0].message.content,
          model: model,
          provider: 'OpenRouter',
        });
      }
    } catch (err) {
      console.error(`OpenRouter model ${model} failed:`, err);
    }
  }

  return res.status(500).json({ result: 'All models failed. Try again later.' });
}
