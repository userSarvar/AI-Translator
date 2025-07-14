import fetch from 'node-fetch';

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

// Model lists by provider
const huggingfaceModels = [
  'tiiuae/falcon-7b-instruct',
  'google/flan-t5-xl'
];

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

// Timeout helper
function fetchWithTimeout(url, options, timeout = 15000) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeout))
  ]);
}

// Format Hugging Face prompt
function formatHFInput(prompt) {
  return {
    inputs: prompt,
    options: { wait_for_model: true }
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, direction, model: selectedModel } = req.body;
  if (!text || !direction) {
    return res.status(400).json({ result: 'Invalid input.' });
  }

  const prompt = direction === 'to_genz'
    ? `Your job is to rephrase the following sentence into current Gen Z slang. Use trendy but widely understood slang, memes, abbreviations, and emojis. The result should sound natural to a Gen Z speaker, be funny if possible, and maintain the original meaning clearly. Do NOT explain or add commentary — output only the Gen Z version in one sentence.\n\nInput: "${text}"`
    : `You are a formal English translator. Convert the following Gen Z slang into a clear, professional sentence. Do not add commentary or multiple options — return only one accurate, grammatically correct translation that preserves the original meaning in plain English.\n\nInput: "${text}"`;

  // If user selected specific model
  if (selectedModel && selectedModel !== 'auto') {
    const isTogether = togetherModels.includes(selectedModel);
    const isHuggingFace = huggingfaceModels.includes(selectedModel);
    const endpoint = isTogether
      ? 'https://api.together.xyz/v1/chat/completions'
      : isHuggingFace
        ? `https://api-inference.huggingface.co/models/${selectedModel}`
        : 'https://openrouter.ai/api/v1/chat/completions';

    const headers = isHuggingFace
      ? { Authorization: `Bearer ${HUGGINGFACE_API_KEY}`, 'Content-Type': 'application/json' }
      : {
          Authorization: `Bearer ${isTogether ? TOGETHER_API_KEY : OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        };

    const body = isHuggingFace
      ? JSON.stringify(formatHFInput(prompt))
      : JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: 'You are a precise translator who always returns one accurate sentence without adding comments or choices.' },
            { role: 'user', content: prompt }
          ]
        });

    try {
      const response = await fetchWithTimeout(endpoint, { method: 'POST', headers, body }, 15000);
      const data = await response.json();

      const result = isHuggingFace
        ? data[0]?.generated_text || null
        : data.choices?.[0]?.message?.content;

      if (result) {
        return res.status(200).json({
          result,
          model: selectedModel,
          provider: isHuggingFace ? 'HuggingFace' : isTogether ? 'Together.ai' : 'OpenRouter'
        });
      }
    } catch (err) {
      console.error(`Selected model (${selectedModel}) failed:`, err.message);
    }
  }

  // Fallback attempts: Together → Hugging Face → OpenRouter
  const fallbackProviders = [
    { models: togetherModels, provider: 'Together.ai', url: 'https://api.together.xyz/v1/chat/completions', key: TOGETHER_API_KEY },
    { models: huggingfaceModels, provider: 'HuggingFace', key: HUGGINGFACE_API_KEY },
    { models: openrouterModels, provider: 'OpenRouter', url: 'https://openrouter.ai/api/v1/chat/completions', key: OPENROUTER_API_KEY }
  ];

  for (const { models, provider, url, key } of fallbackProviders) {
    for (const model of models) {
      try {
        const isHF = provider === 'HuggingFace';
        const endpoint = isHF ? `https://api-inference.huggingface.co/models/${model}` : url;

        const headers = {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        };

        const body = isHF
          ? JSON.stringify(formatHFInput(prompt))
          : JSON.stringify({
              model,
              messages: [
                { role: 'system', content: 'You are a precise translator who always returns one accurate sentence without adding comments or choices.' },
                { role: 'user', content: prompt }
              ]
            });

        const response = await fetchWithTimeout(endpoint, { method: 'POST', headers, body }, 15000);
        const data = await response.json();

        const result = isHF ? data[0]?.generated_text || null : data.choices?.[0]?.message?.content;

        if (result) {
          return res.status(200).json({ result, model, provider });
        }
      } catch (err) {
        console.error(`${provider} model (${model}) failed:`, err.message);
      }
    }
  }

  return res.status(500).json({ result: 'All models failed. Try again later.' });
}
