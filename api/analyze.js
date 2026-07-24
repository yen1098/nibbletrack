export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { mealText } = req.body;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY in Vercel Environment Variables.' });
    }

    const systemPrompt = `You are a professional nutritionist. Analyze the following meal description. Return ONLY a valid JSON object with the keys: calories (integer), protein (integer), fiber (integer), total_sugar (integer), added_sugar (integer), sodium (integer). Do not include any other text or markdown formatting. Meal: "${mealText}"`;

    // Call Google Gemini API using the Header for authentication
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-002:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY // <-- Key is now safely in the headers!
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          { parts: [{ text: mealText }] }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      })
    });

    const data = await response.json();

    // If Gemini rejected the request, show us exactly why
    if (!response.ok || !data.candidates || !data.candidates[0]) {
      console.error("Gemini API Error:", data);
      return res.status(500).json({ error: `Gemini API Error: ${data.error?.message || 'Unknown error'}` });
    }

    const aiContent = data.candidates[0].content.parts[0].text;

    try {
      const cleanJson = aiContent.replace(/```json/g, '').replace(/```/g, '').trim();
      const nutritionData = JSON.parse(cleanJson);
      res.status(200).json(nutritionData);
    } catch (parseError) {
      console.error("AI JSON Parse Error:", aiContent);
      res.status(500).json({ error: 'AI did not return valid JSON' });
    }

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
