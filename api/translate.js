import fetch from 'node-fetch';

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

const togetherModels = [
  'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
  'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free',
  
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
  'tiiuae/falcon-7b-instruct',
  'google/flan-t5-xl',
  'meta-llama/Llama-3.1-8B-Instruct'
];

function fetchWithTimeout(url, options, timeout = 15000) {
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, direction, model: selectedModel } = req.body;
  if (!text || !direction) return res.status(400).json({ result: 'Invalid input.' });

  const prompt = direction === 'to_genz'
    ? `Your job is to rephrase the following sentence into current Gen Z slang. Use trendy but widely understood slang, memes, abbreviations, and emojis. Output only one sentence with no explanation.\n\nInput: "${text}"`
    : `Convert the following Gen Z slang into professional English. Output only one grammatically correct sentence.\n\nInput: "${text}"`;

  const tryModel = async (model, provider, url, headers, bodyFormatter) => {
    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body: bodyFormatter(model)
      }, 15000);

      const data = await response.json();
      const result =
        provider === 'HuggingFace'
          ? data[0]?.generated_text
          : data.choices?.[0]?.message?.content;

      if (result) {
        return { result, model, provider };
      }
    } catch (err) {
      console.error(`${provider} model (${model}) failed:`, err.message);
    }
    return null;
  };

  // 🎯 If specific model selected
  if (selectedModel && selectedModel !== 'auto') {
    if (togetherModels.includes(selectedModel)) {
      const headers = {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json'
      };
      return res.json(await tryModel(
        selectedModel, 'Together.ai',
        'https://api.together.xyz/v1/chat/completions',
        headers,
        (model) => JSON.stringify({ model, messages: [{ role: 'system', content: 'Be precise' }, { role: 'user', content: prompt }] })
      ) || { result: 'Failed', model: selectedModel });
    }

    if (openrouterModels.includes(selectedModel)) {
      const headers = {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      };
      return res.json(await tryModel(
        selectedModel, 'OpenRouter',
        'https://openrouter.ai/api/v1/chat/completions',
        headers,
        (model) => JSON.stringify({ model, messages: [{ role: 'system', content: 'Be precise' }, { role: 'user', content: prompt }] })
      ) || { result: 'Failed', model: selectedModel });
    }

    if (huggingfaceModels.includes(selectedModel)) {
      const headers = {
        'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json'
      };
      return res.json(await tryModel(
        selectedModel, 'HuggingFace',
        `https://api-inference.huggingface.co/models/${selectedModel}`,
        headers,
        () => JSON.stringify(formatHFInput(prompt))
      ) || { result: 'Failed', model: selectedModel });
    }
  }

  // 🔁 Auto fallback sequence
  const fallback = [
    ...togetherModels.map((m) => ({ model: m, provider: 'Together.ai', url: 'https://api.together.xyz/v1/chat/completions', headers: { 'Authorization': `Bearer ${TOGETHER_API_KEY}`, 'Content-Type': 'application/json' } })),
    ...huggingfaceModels.map((m) => ({ model: m, provider: 'HuggingFace', url: `https://api-inference.huggingface.co/models/${m}`, headers: { 'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`, 'Content-Type': 'application/json' } })),
    ...openrouterModels.map((m) => ({ model: m, provider: 'OpenRouter', url: 'https://openrouter.ai/api/v1/chat/completions', headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' } }))
  ];

  for (const { model, provider, url, headers } of fallback) {
    const result = await tryModel(
      model,
      provider,
      url,
      headers,
      provider === 'HuggingFace'
        ? () => JSON.stringify(formatHFInput(prompt))
        : (model) => JSON.stringify({ model, messages: [{ role: 'system', content: 'Be precise' }, { role: 'user', content: prompt }] })
    );
    if (result) return res.status(200).json(result);
  }

  return res.status(500).json({ result: 'All models failed. Try again later.' });
}
