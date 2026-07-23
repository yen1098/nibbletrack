// This is your secure backend function. It hides your Z.ai API Key from the public!
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { mealText } = req.body;
    
    // 1. Get your API key from Vercel Environment Variables (We will set this up in Step 3C)
    const ZAI_API_KEY = process.env.ZAI_API_KEY;

    // 2. The strict instruction we give to the AI so it returns perfect JSON data
    const systemPrompt = `You are a professional nutritionist. Analyze the following meal description. Return ONLY a valid JSON object with the keys: calories (integer), protein (integer), fiber (integer), total_sugar (integer), added_sugar (integer), sodium (integer). Do not include any other text or markdown formatting. Meal: "${mealText}"`;

    // 3. Call the Z.ai API (Using standard OpenAI-compatible format)
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'glm-4', // or glm-4-flash if you want it faster/cheaper
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: mealText }
        ],
        temperature: 0.1 // Low temperature means less creativity, more factual numbers
      })
    });

    const data = await response.json();
    const aiContent = data.choices[0].message.content;

    // 4. Parse the JSON and send it back to your app
    try {
      // Sometimes AIs wrap JSON in ```json blocks, so we strip those just in case
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
