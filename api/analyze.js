export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { mealText } = req.body;
    const ZAI_API_KEY = process.env.ZAI_API_KEY;

    if (!ZAI_API_KEY) {
      return res.status(500).json({ error: 'Missing ZAI_API_KEY in Vercel Environment Variables.' });
    }

    const systemPrompt = `You are a professional nutritionist. Analyze the following meal description. Return ONLY a valid JSON object with the keys: calories (integer), protein (integer), fiber (integer), total_sugar (integer), added_sugar (integer), sodium (integer). Do not include any other text or markdown formatting. Meal: "${mealText}"`;

    // Using the official Z.ai international API endpoint
    const response = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'glm-4-plus',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: mealText }
        ],
        temperature: 0.1
      })
    });

    const data = await response.json();

    // If Z.ai rejected the request, show us EXACTLY what it said
    if (!response.ok || !data.choices || !data.choices[0]) {
      console.error("Z.ai API Error:", data);
      return res.status(500).json({ error: `Z.ai API Error (${response.status}): ${JSON.stringify(data)}` });
    }

    const aiContent = data.choices[0].message.content;

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
