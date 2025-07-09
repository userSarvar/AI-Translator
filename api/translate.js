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
    ? `Translate the following sentence into modern Gen Z slang. Use current slang, emojis, and casual tone, but keep the meaning clear and avoid excessive filler or random jokes.

Text: "${text}"

Translation (Gen Z slang):`
    : `Translate the following Gen Z slang into clear, professional English. The result should sound natural and suitable for polite conversation, not too academic or robotic.

Text: "${text}"

Translation (Standard English):`;
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
          { role: 'system', content: 'You are a funny but accurate Gen Z translator.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await response.json();

    // ✅ Defensive check: OpenRouter might fail or quota might be exceeded
    if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid API response:', data);
      return res.status(500).json({ result: "Translation failed. Try again later." });
    }

    const reply = data.choices[0].message.content;
    res.status(200).json({ result: reply });

  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ result: 'Server error. Please try again.' });
  }
}
