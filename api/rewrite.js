// /api/rewrite.js

// This is a Node.js server-side script.
// It receives the email text from your add-in, calls OpenAI, and returns the result.

export default async function handler(request, response) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Get the API key securely from the server's environment variables
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

  if (!OPENAI_API_KEY) {
    return response.status(500).json({ error: 'API key is not configured on the server.' });
  }

  try {
    const { emailText } = request.body;
    if (!emailText) {
      return response.status(400).json({ error: 'emailText is required' });
    }

    const prompt = `
      You are an expert business communication editor. Your task is to analyze an email and rewrite its core message.

      **CRITICAL INSTRUCTIONS:**
      1.  **Analyze and Deconstruct:** First, silently identify the original email's greeting, core message, and signature.
      2.  **Aggressively Rewrite the Core Message:**
          -   Your primary goal is to **transform** the message, not just make minor edits.
          -   **Drastically shorten** sentences and eliminate redundant words to improve conciseness and impact.
          -   Use formal, polished business language. Use complete sentences and proper grammar. Do not use contractions.
          -   The rewritten body **MUST** begin with the phrase "Hope all is well."
          -   Preserve the original meaning. **DO NOT** add new information, facts, or sentiments.
      3.  **Use Paragraphs:** Structure the rewritten body with paragraph breaks (using '\\n') for readability.
      4.  **Required JSON Output:** Your entire response **MUST** be a single, valid JSON object with four string keys: "subject", "original_greeting", "rewritten_body", and "original_signature".

      ---
      **USER'S EMAIL TEXT TO PROCESS:**
      ${emailText}
    `;

    const apiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ "role": "system", "content": prompt }, { "role": "user", "content": emailText }],
        temperature: 0.5,
        response_format: { type: "json_object" }
      })
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      throw new Error(`OpenAI API request failed: ${errorBody}`);
    }

    const data = await apiResponse.json();
    const suggestion = JSON.parse(data.choices[0].message.content);

    // Send the successful response back to the add-in
    return response.status(200).json(suggestion);

  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'An error occurred while processing your request.' });
  }
}