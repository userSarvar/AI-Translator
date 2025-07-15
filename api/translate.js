import fetch from 'node-fetch';

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

const togetherModels = [
  'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
  'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free'
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

const huggingfaceModels = [
  'mistralai/Mistral-Nemo-Instruct-2407',
  'cutycat2000x/MeowGPT-3.5',
  'cutycat2000/MeowGPT-2'
];

// Timeout helper
function fetchWithTimeout(url, options, timeout = 10000) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), timeout)
    )
  ]);
}

function formatHFInput(prompt) {
  return {
    inputs: prompt,
    options: { wait_for_model: true }
  };
}

async function tryModel({ model, provider, url, headers, formatBody }) {
  try {
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: formatBody(model)
    });

    const data = await response.json();

    const result =
      provider === 'HuggingFace'
        ? data[0]?.generated_text || null
        : data.choices?.[0]?.message?.content;

    if (result) {
      return { result, model, provider };
    }

    console.warn(`[${provider}] ${model} returned no result.`);
  } catch (err) {
    console.error(`[${provider}] ${model} error:`, err.message);
  }

  return null;
}

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
      ? `Your job is to rephrase the following sentence into current Gen Z slang. Use trendy but widely understood slang, memes, abbreviations, and emojis. Output only one sentence with no explanation.\n\nInput: "${text}"`
      : `Convert the following Gen Z slang into professional English. Output only one grammatically correct sentence.\n\nInput: "${text}"`;

  const allModels = [
    ...togetherModels.map((model) => ({
      model,
      provider: 'Together.ai',
      url: 'https://api.together.xyz/v1/chat/completions',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      formatBody: (m) =>
        JSON.stringify({
          model: m,
          messages: [
            { role: 'system', content: 'Be precise' },
            { role: 'user', content: prompt }
          ]
        })
    })),
    ...huggingfaceModels.map((model) => ({
      model,
      provider: 'HuggingFace',
      url: `https://api-inference.huggingface.co/models/${model}`,
      headers: {
        'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      formatBody: () => JSON.stringify(formatHFInput(prompt))
    })),
    ...openrouterModels.map((model) => ({
      model,
      provider: 'OpenRouter',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      formatBody: (m) =>
        JSON.stringify({
          model: m,
          messages: [
            { role: 'system', content: 'Be precise' },
            { role: 'user', content: prompt }
          ]
        })
    }))
  ];

  // Specific model chosen
  if (selectedModel && selectedModel !== 'auto') {
    const modelConfig = allModels.find((m) => m.model === selectedModel);
    if (modelConfig) {
      const result = await tryModel(modelConfig);
      if (result) return res.status(200).json(result);
      return res.status(500).json({ result: 'Selected model failed.', model: selectedModel });
    } else {
      return res.status(400).json({ result: 'Model not recognized.' });
    }
  }

  // Auto fallback mode
  for (const config of allModels) {
    const result = await tryModel(config);
    if (result) return res.status(200).json(result);
  }

  return res.status(500).json({ result: 'All models failed. Try again later.', model: 'N/A' });

}
