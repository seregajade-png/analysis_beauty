import OpenAI from "openai";
import "dotenv/config";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

console.log("Testing OpenAI streaming...");
console.log("API Key:", process.env.OPENAI_API_KEY?.substring(0, 20) + "...");

try {
  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 100,
    messages: [
      { role: "system", content: "Ты помощник." },
      { role: "user", content: "Скажи привет одним предложением." },
    ],
    stream: true,
  });

  let text = "";
  let chunks = 0;
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      text += delta;
      chunks++;
      process.stdout.write(delta);
    }
  }

  console.log(`\n\nOK: ${chunks} chunks, ${text.length} chars`);
} catch (e) {
  console.error("FAILED:", e.message);
}
