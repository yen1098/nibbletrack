export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { rawText } = req.body;
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: 'Missing GROQ_API_KEY in Vercel Environment Variables.' });
    }

    const prompt = `You are a professional chef and recipe formatter. Take the following raw text and format it into a clean, readable recipe. Include an "Ingredients:" section (as a bulleted list) and an "Instructions:" section (as a numbered list). Return ONLY the formatted text, do not include any conversational filler.\n\nRaw Text: ${rawText}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })
    });

    const data = await response.json();

    if (!response.ok || !data.choices || !data.choices[0]) {
      console.error("Groq API Error:", data);
      return res.status(500).json({ error: `Groq API Error: ${data.error?.message || 'Unknown error'}` });
    }

    const formattedText = data.choices[0].message.content;
    res.status(200).json({ formattedText });
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
