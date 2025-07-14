import fetch from 'node-fetch';

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const togetherModels = [
  'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
  'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free',
  'nim/nvidia/llama-3.3-nemotron-super-49b-v1',
  'google/gemma-2b-it'
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

  const { text, direction, model: selectedModel } = req.body;
  if (!text || !direction) {
    return res.status(400).json({ result: 'Invalid input.' });
  }

  const prompt =
    direction === 'to_genz'
      ? `Your job is to rephrase the following sentence into current Gen Z slang. Use trendy but widely understood slang, memes, abbreviations, and emojis. The result should sound natural to a Gen Z speaker, be funny if possible, and maintain the original meaning clearly. Do NOT explain or add commentary — output only the Gen Z version in one sentence.Even don't add any thoughts too\n\nInput: "${text}"`
      : `You are a formal English translator. Convert the following Gen Z slang into a clear, professional sentence. Do not add commentary or multiple options — return only one accurate, grammatically correct translation that preserves the original meaning in plain English.Even don't add any thoughts too\n\nInput: "${text}"`;

  // ✅ If the user selected a model
  if (selectedModel && selectedModel !== 'auto') {
    const isTogether = togetherModels.includes(selectedModel);
    const endpoint = isTogether
      ? 'https://api.together.xyz/v1/chat/completions'
      : 'https://openrouter.ai/api/v1/chat/completions';

    const headers = {
      'Authorization': `Bearer ${isTogether ? TOGETHER_API_KEY : OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: selectedModel,
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
          model: selectedModel,
          provider: isTogether ? 'Together.ai' : 'OpenRouter',
        });
      } else {
        console.warn(`Model failed (${selectedModel}):`, data);
      }
    } catch (err) {
      console.error(`Selected model ${selectedModel} error:`, err);
    }
  }

  // 🔁 Auto-fallback to Together models
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
          model,
          provider: 'Together.ai',
        });
      }
    } catch (err) {
      console.error(`Together fallback ${model} error:`, err);
    }
  }

  // 🔁 Auto-fallback to OpenRouter models
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
          model,
          provider: 'OpenRouter',
        });
      }
    } catch (err) {
      console.error(`OpenRouter fallback ${model} error:`, err);
    }
  }

  return res.status(500).json({ result: 'All models failed. Try again later.' });
}
