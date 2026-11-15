import OpenAI from "openai";

// All AI code lives in this one file, so switching provider means editing only this file.
const DEFAULT_MODEL = "gpt-4.1-mini";

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function analyzeImage(
  imageDataUrl: string,
  prompt: string,
): Promise<string> {
  const client = new OpenAI(); // reads OPENAI_API_KEY from the environment

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    instructions:
      "You help people improve photos for social media and online shops. Answer clearly in under 200 words.",
    max_output_tokens: 500,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: imageDataUrl, detail: "auto" },
        ],
      },
    ],
  });

  return response.output_text;
}
