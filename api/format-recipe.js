export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { rawText } = req.body;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY in Vercel Environment Variables.' });
    }

    const prompt = `You are a professional chef and recipe formatter. Take the following raw text and format it into a clean, readable recipe. 
    DO NOT include a title in your response, as the user provides the title separately. 
    Start with "Ingredients:" followed by a to-do list format for each ingredient (e.g., "- [ ] 1 cup almond butter"). 
    Then add a newline and "Instructions:" followed by a numbered list (e.g., "1. Preheat the oven..."). 
    Return ONLY the formatted text, do not include any conversational filler.\n\nRaw Text: ${rawText}`;

    // Using Gemini 3.5 Flash Lite
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 }
      })
    });

    const data = await response.json();

    if (!response.ok || !data.candidates || !data.candidates[0]) {
      console.error("Gemini API Error:", data);
      return res.status(500).json({ error: `Gemini API Error: ${data.error?.message || 'Unknown error'}` });
    }

    const formattedText = data.candidates[0].content.parts[0].text;
    res.status(200).json({ formattedText });
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
