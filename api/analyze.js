export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { mealText, imageBase64 } = req.body;
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: 'Missing GROQ_API_KEY in Vercel Environment Variables.' });
    }

    // Updated prompt to force high added sugar estimates for processed meats
    const systemPrompt = `You are a professional nutritionist. Estimate the nutritional values for the following meal. Assume standard RESTAURANT portions if the user does not specify exact measurements (e.g., if they say "fried egg", assume 2 large eggs). Be accurate and use USDA standard averages. IMPORTANT: For processed meats (like ham, bacon, sausages, hotdogs), marinades, sauces, and baked goods, ALWAYS assume they contain added sugars and estimate the added_sugar on the HIGHER end (minimum 3-5g per serving). Return ONLY a valid JSON object with the keys: calories, protein, fiber, total_sugar, added_sugar, sodium. The value for each key MUST be a string representing a range (e.g., "200-250"). Do not include any other text or markdown formatting.`;

    let model = 'llama-3.3-70b-versatile';
    let content = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: mealText }
    ];

    if (imageBase64) {
      model = 'llama-3.2-90b-vision-preview';
      content = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: [
          { type: 'text', text: mealText || "Analyze this food photo and estimate the macros." },
          { type: 'image_url', image_url: { url: imageBase64 } }
        ]}
      ];
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        messages: content,
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();

    if (!response.ok || !data.choices || !data.choices[0]) {
      console.error("Groq API Error:", data);
      return res.status(500).json({ error: `Groq API Error: ${data.error?.message || 'Unknown error'}` });
    }

    const aiContent = data.choices[0].message.content;

    try {
      const nutritionData = JSON.parse(aiContent);
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
