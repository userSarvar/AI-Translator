// === backend/api/translate.js ===
import fetch from 'node-fetch';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY; // You'll need to get this from openrouter.ai

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, direction } = req.body;

  const prompt = direction === 'to_genz'
    ? `Translate the following into Gen Z slang:

"${text}"`
    : `Translate the following Gen Z slang into standard English:

"${text}"`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a funny but accurate Gen Z translator." },
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;
    res.status(200).json({ result: reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: 'Error from OpenRouter.' });
  }
}
