export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { message, history } = req.body;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
    }

    const systemPrompt = `You are NibbleBot, a friendly and helpful nutrition assistant inside the NibbleTrack app.
Your primary goal is to help users log their meals and answer nutrition questions.

When the user indicates they are eating or logging a meal (e.g., "I ate...", "Had...", "Just ate..."), you MUST estimate the macros and return a JSON object with this EXACT structure:
{
  "type": "food_suggestion",
  "text": "Here are the estimated macros for your meal. Tap 'Add to Log' to save it!",
  "meal": {
    "description": "Exact description of what they ate",
    "calories": "string range (e.g., '200-250')",
    "protein": "string range",
    "fiber": "string range",
    "total_sugar": "string range",
    "added_sugar": "string range",
    "sodium": "string range"
  }
}

Rules for meal estimation:
- Assume standard RESTAURANT portions if not specified.
- For processed meats, assume added sugars slightly above average.
- All macro values MUST be strings representing a range.

If the user is NOT logging a meal (asking a question, saying hello, etc.), return:
{
  "type": "chat",
  "text": "Your conversational response"
}

You MUST return valid JSON.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent`;

    let contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: "Understood! I will return JSON." }] }
    ];

    if (history && history.length > 0) {
      history.forEach(h => {
        contents.push({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text }] });
      });
    }
    
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: contents,
        generationConfig: { 
          temperature: 0.3,
          responseMimeType: "application/json" // Force JSON output
        }
      })
    });

    const data = await response.json();

    if (!response.ok || !data.candidates || !data.candidates[0]) {
      return res.status(500).json({ error: 'AI Error' });
    }

    const replyText = data.candidates[0].content.parts[0].text;
    res.status(200).json({ reply: replyText }); // Frontend will parse this JSON
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
