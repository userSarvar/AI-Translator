import fetch from 'node-fetch';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, direction } = req.body;
  if (!text || !direction) {
    return res.status(400).json({ result: 'Invalid input.' });
  }

  const prompt = direction === 'to_genz'
    ? `Your job is to rephrase the following sentence into current Gen Z slang. Use trendy but widely understood slang, memes, abbreviations, and emojis. The result should sound natural to a Gen Z speaker, be funny if possible, and maintain the original meaning clearly. Do NOT explain or add commentary — output only the Gen Z version in one sentence.

Input: "${text}"`
    :  `You are a formal English translator. Convert the following Gen Z slang into a clear, professional sentence. Do not add commentary or multiple options — return only one accurate, grammatically correct translation that preserves the original meaning in plain English.

Input: "${text}"`;
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1-0528-qwen3-8b:free',
        messages: [
{ role: "system", content: "You are a precise translator who always returns one accurate sentence without adding comments or choices." },

          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await response.json();

    // ✅ Defensive check: OpenRouter might fail or quota might be exceeded
    if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid API response:', data);
      return res.status(500).json({ result: "Somethign went wrong. Try again later." });
    }

    const reply = data.choices[0].message.content;
    res.status(200).json({ result: reply });

  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ result: 'Server error. Please try again.' });
  }
}
