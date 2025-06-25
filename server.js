const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { OpenAI } = require("openai");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/api/translate", async (req, res) => {
  const { text, direction } = req.body;

  let prompt = "";
  if (direction === "to_genz") {
    prompt = `Translate the following into Gen Z slang, using current memes, emojis, and abbreviations. Be humorous but clear:\n\n"${text}"`;
  } else {
    prompt = `Translate the following Gen Z slang into formal standard English, suitable for academic or adult understanding:\n\n"${text}"`;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a funny but accurate Gen Z translator." },
        { role: "user", content: prompt }
      ]
    });

    const reply = completion.choices[0].message.content;
    res.json({ result: reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ result: "Error translating. Try again." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));