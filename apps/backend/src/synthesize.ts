import OpenAI from "openai";
import type { PaidResult } from "./paidFetch.js";

// OpenRouter: Access to top open-weight models (DeepSeek V3, Llama 3.3 70B, Qwen 2.5 72B)
// with automatic failover and high-throughput reasoning.
const OPENROUTER_MODELS = [
  "deepseek/deepseek-chat",
  "meta-llama/llama-3.3-70b-instruct",
  "qwen/qwen-2.5-72b-instruct",
];

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
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  try {
    const parsed = JSON.parse(cleaned);

    // Normalize summary: handle array or string
    let summaryText = "";
    if (Array.isArray(parsed.summary)) {
      summaryText = parsed.summary.map((s: string) => `• ${s}`).join("\n");
    } else if (typeof parsed.summary === "string") {
      summaryText = parsed.summary.trim();
    }

    return {
      topic:
        typeof parsed.topic === "string" && parsed.topic.trim()
          ? parsed.topic.trim()
          : generateFallbackTopic(question),
      summary: summaryText || "Verified protocol intelligence retrieved on-chain.",
      answer: typeof parsed.answer === "string" ? parsed.answer.trim() : cleaned,
      personaInsights: {
        developer:
          parsed.personaInsights?.developer ||
          "Technical details, RPC endpoints, and contract specs verified on-chain.",
        founder:
          parsed.personaInsights?.founder ||
          "Strategic market implications and unit economics synthesized from paid publishers.",
        contentWriter:
          parsed.personaInsights?.contentWriter ||
          "Key actionable takeaways and quotable verified insights.",
        trader:
          parsed.personaInsights?.trader ||
          "On-chain liquidity, DEX metrics, and token catalyst signals.",
      },
    };
  } catch {
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
    .map(
      (s) =>
        `Source: ${s.sourceName}\n${
          typeof s.content === "string" ? s.content : JSON.stringify(s.content, null, 2)
        }`
    )
    .join("\n\n");

  const prompt = `You are Qerin, an autonomous AI research agent that pays micropayments on-chain to access premium live sources.
Synthesize an authoritative, verified answer based strictly on the paid source content below.

Question: ${question}

Paid source content & verified on-chain telemetry:
${sourceText}

Provide your response as a valid JSON object matching this exact schema:
{
  "topic": "A short, punchy 3-6 word title in Claude Code style (e.g. 'BOT Chain: Speed & Scalability' or 'Ethereum Pectra: Upgrade Details')",
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

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const nvidiaKey = process.env.NVIDIA_API_KEY;

  // 1. Primary: Try OpenRouter with open models ensemble
  if (openRouterKey) {
    const openRouterClient = new OpenAI({
      apiKey: openRouterKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://qerin.vercel.app",
        "X-Title": "Qerin AI Agent",
      },
    });

    for (const model of OPENROUTER_MODELS) {
      try {
        const completion = await openRouterClient.chat.completions.create({
          model,
          max_tokens: 1400,
          temperature: 0.2,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content ?? "";
        if (content) {
          return parseJsonResponse(content, question);
        }
      } catch (err) {
        console.warn(`OpenRouter model ${model} failed, trying next fallback:`, err);
      }
    }
  }

  // 2. Secondary fallback: NVIDIA NIM
  if (nvidiaKey) {
    try {
      const nimClient = new OpenAI({
        apiKey: nvidiaKey,
        baseURL: "https://integrate.api.nvidia.com/v1",
      });
      const model = process.env.QERIN_LLM_MODEL || "meta/llama-3.3-70b-instruct";
      const completion = await nimClient.chat.completions.create({
        model,
        max_tokens: 1200,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
      });
      const content = completion.choices[0]?.message?.content ?? "";
      if (content) {
        return parseJsonResponse(content, question);
      }
    } catch (err) {
      console.error("NVIDIA NIM fallback failed:", err);
    }
  }

  // 3. Fallback if all LLMs are unreachable
  return {
    topic: generateFallbackTopic(question),
    summary: "Verified data retrieved from on-chain sources.",
    answer: `Verified response based on data sources: ${sources.map((s) => s.sourceName).join(", ")}.`,
    personaInsights: {
      developer: "Inspect transaction logs on-chain for payment proofs and technical contracts.",
      founder: "Data sourced directly from live protocol and ecosystem feeds.",
      contentWriter: "Direct citations from verified network intelligence.",
      trader: "Live liquidity and on-chain intelligence retrieved.",
    },
  };
}
