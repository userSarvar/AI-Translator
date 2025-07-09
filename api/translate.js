// === backend/api/translate.js ===
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a funny but accurate Gen Z translator.' },
        { role: 'user', content: prompt }
      ]
    });

    const reply = completion.choices[0].message.content;
    res.status(200).json({ result: reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: 'Error from OpenAI.' });
  }
}
