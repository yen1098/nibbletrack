export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { mealText, imageBase64 } = req.body;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY in Vercel Environment Variables.' });
    }

    const systemPrompt = `You are a professional nutritionist. Estimate the nutritional values for the following meal. Assume standard RESTAURANT portions if the user does not specify exact measurements (e.g., if they say "fried egg", assume 2 large eggs). Be accurate and use USDA standard averages. IMPORTANT: For processed meats (like ham, bacon, sausages, hotdogs), marinades, sauces, and baked goods, ALWAYS assume they contain added sugars and estimate the added_sugar on the HIGHER end (minimum 3-5g per serving). Return ONLY a valid JSON object with the keys: calories, protein, fiber, total_sugar, added_sugar, sodium. The value for each key MUST be a string representing a range (e.g., "200-250"). Do not include any other text or markdown formatting.`;

    // Using Gemini 3.5 Flash Lite
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent`;

    let payload = {
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [
        { role: 'user', parts: [{ text: mealText }] }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    };

    if (imageBase64) {
      const base64Data = imageBase64.split(',')[1];
      const mimeType = imageBase64.split(',')[0].split(':')[1].split(';')[0];
      
      payload.contents = [
        { 
          role: 'user', 
          parts: [
            { text: mealText || "Analyze this food photo and estimate the macros based on the instructions provided." },
            { inline_data: { mime_type: mimeType, data: base64Data } }
          ] 
        }
      ];
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

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
