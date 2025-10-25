// This is the Next.js API route for handling translations.
// This code ONLY runs on the server, so it's safe to use API keys here.
// Path: /app/api/translate/route.js

import { NextResponse } from "next/server";

export async function POST(request) {
  // 1. Read the incoming request body (text and targetLang)
  const { text, targetLang } = await request.json();

  // 2. Get the DeepL API key and URL from environment variables
  const apiKey = process.env.DEEPL_API_KEY;
  const apiUrl = process.env.DEEPL_API_URL;

  // 3. Basic validation
  if (!apiKey || !apiUrl) {
    return NextResponse.json(
      { message: "Server configuration error: API key or URL not set." },
      { status: 500 }
    );
  }

  if (!text || !targetLang) {
    return NextResponse.json(
      { message: "Bad request: 'text' and 'targetLang' are required." },
      { status: 400 }
    );
  }

  // 4. Prepare the data for the DeepL API
  const body = JSON.stringify({
    text: [text], // DeepL API expects text to be an array of strings
    target_lang: targetLang,
  });

  try {
    // 5. Make the POST request to the DeepL API
    const deeplResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        // Use the "DeepL-Auth-Key" header for authentication
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: body,
    });

    // 6. Handle a bad response from DeepL
    if (!deeplResponse.ok) {
      const errorData = await deeplResponse.json();
      console.error("DeepL API Error:", errorData);
      const status = deeplResponse.status;

      let message = "Translation failed.";
      if (status === 403) {
        message = "Authentication failed. Check your DeepL API key.";
      } else if (status === 400) {
        message = `Bad request. Check parameters. ${errorData.message || ""}`;
      } else if (status === 429) {
        message = "Too many requests. Please wait.";
      } else if (status === 456) {
        message = "Quota exceeded. Check your DeepL plan limits.";
      }

      return NextResponse.json({ message }, { status: status });
    }

    // 7. Handle a successful response from DeepL
    const data = await deeplResponse.json();
    const translation = data.translations[0].text;

    // 8. Send the successful translation back to the client
    return NextResponse.json({ translation });
  } catch (error) {
    console.error("Internal Server Error:", error);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
