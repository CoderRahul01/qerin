import OpenAI from "openai";
import type { PaidResult } from "./paidFetch.js";

// NVIDIA NIM: OpenAI-compatible endpoint serving open-weight models
// (Llama, Nemotron, Qwen, DeepSeek, ...) with a free, generous-limit API key
// from build.nvidia.com. Swap QERIN_LLM_MODEL to try other hosted models.
// Lazily constructed so a missing key fails a request, not server startup.
let nim: OpenAI | null = null;
function getClient(): OpenAI {
  if (!nim) {
    nim = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: "https://integrate.api.nvidia.com/v1",
    });
  }
  return nim;
}

const MODEL = process.env.QERIN_LLM_MODEL || "meta/llama-3.3-70b-instruct";

export async function synthesizeAnswer(question: string, sources: PaidResult[]): Promise<string> {
  const sourceText = sources
    .map((s) => `Source: ${s.sourceName}\n${JSON.stringify(s.content)}`)
    .join("\n\n");

  const completion = await getClient().chat.completions.create({
    model: MODEL,
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Question: ${question}\n\nPaid source content:\n${sourceText}\n\nWrite a short, direct answer (3-4 sentences) based only on the source content above. Do not speculate beyond what the sources say.`,
      },
    ],
  });

  return completion.choices[0]?.message?.content ?? "";
}
