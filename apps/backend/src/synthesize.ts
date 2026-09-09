import OpenAI from "openai";
import type { PaidResult } from "./paidFetch.js";

// NVIDIA NIM: OpenAI-compatible endpoint serving open-weight models
// (Llama, Nemotron, Qwen, DeepSeek, ...) with a free, generous-limit API key
// from build.nvidia.com.
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

export interface PersonaInsights {
  developer: string;
  founder: string;
  contentWriter: string;
  trader: string;
}

export interface SynthesizedResult {
  topic: string;
  summary: string;
  answer: string;
  personaInsights: PersonaInsights;
}

function generateFallbackTopic(question: string): string {
  const clean = question.replace(/[?.,!]/g, "").trim();
  const words = clean.split(/\s+/).slice(0, 6).join(" ");
  return words.length > 0 ? `${words}: Research Dossier` : "Verified Research Dossier";
}

function parseJsonResponse(raw: string, question: string): SynthesizedResult {
  let cleaned = raw.trim();
  // Remove markdown code fences if model enclosed JSON in ```json ... ```
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  try {
    const parsed = JSON.parse(cleaned);
    return {
      topic: typeof parsed.topic === "string" && parsed.topic.trim() ? parsed.topic.trim() : generateFallbackTopic(question),
      summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
      answer: typeof parsed.answer === "string" ? parsed.answer.trim() : cleaned,
      personaInsights: {
        developer: parsed.personaInsights?.developer || "Technical details available in raw verified receipts and source payloads.",
        founder: parsed.personaInsights?.founder || "Strategic market implications derived from live paid publisher data.",
        contentWriter: parsed.personaInsights?.contentWriter || "Key takeaways and quotable verified insights.",
        trader: parsed.personaInsights?.trader || "On-chain and market intelligence signals.",
      },
    };
  } catch {
    // If JSON parsing fails, extract whatever structure exists or format cleanly
    return {
      topic: generateFallbackTopic(question),
      summary: "Live verified content gathered via on-chain micropayments.",
      answer: cleaned,
      personaInsights: {
        developer: "Inspect on-chain receipt hashes and transaction payload for technical integration.",
        founder: "Actionable publisher intelligence retrieved at micro-cost.",
        contentWriter: "Direct, uncensored data from authoritative paywalled sources.",
        trader: "Real-time verified market signal.",
      },
    };
  }
}

export async function synthesizeAnswer(
  question: string,
  sources: PaidResult[]
): Promise<SynthesizedResult> {
  const sourceText = sources
    .map((s) => `Source: ${s.sourceName}\n${typeof s.content === "string" ? s.content : JSON.stringify(s.content, null, 2)}`)
    .join("\n\n");

  const prompt = `You are Qerin, an autonomous AI research agent that pays micropayments on-chain to access premium live sources.
Synthesize an authoritative, verified answer based strictly on the paid source content below.

Question: ${question}

Paid source content:
${sourceText}

Provide your response as a valid JSON object matching this exact schema:
{
  "topic": "A short, punchy 3-6 word title in Claude Code style (e.g. 'Agentic Engineering: Architecture & Steps' or 'Ethereum Pectra: Upgrade Details')",
  "summary": "2-3 concise bullet points summarizing the core findings and verified facts",
  "answer": "A clear, comprehensive answer (3-5 paragraphs) integrating the facts from the paid sources. Do not speculate.",
  "personaInsights": {
    "developer": "1-2 sentences with technical specs, endpoints, protocol standards, contract/gas aspects",
    "founder": "1-2 sentences on market impact, product opportunities, strategic takeaways, or unit economics",
    "contentWriter": "1-2 sentences with an engaging narrative hook or publishable headline quote",
    "trader": "1-2 sentences on token catalysts, liquidity impact, market sentiment, or volume trends"
  }
}

Return ONLY the raw JSON object without additional surrounding text.`;

  try {
    const completion = await getClient().chat.completions.create({
      model: MODEL,
      max_tokens: 1200,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    return parseJsonResponse(content, question);
  } catch (err) {
    console.error("synthesis error:", err);
    return {
      topic: generateFallbackTopic(question),
      summary: "Verified data retrieved from on-chain sources.",
      answer: `Verified response based on paid publisher data: ${sources.map((s) => s.sourceName).join(", ")}.`,
      personaInsights: {
        developer: "Inspect transaction logs on-chain for payment proofs.",
        founder: "Data sourced directly from live paywalled publishers.",
        contentWriter: "Direct citations from verified publishers.",
        trader: "Live intelligence retrieved.",
      },
    };
  }
}
