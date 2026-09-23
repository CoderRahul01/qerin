import OpenAI from "openai";
import type { PaidResult } from "./paidFetch.js";

// OpenRouter: Open-weight models ordered by typical response speed.
// DeepSeek V3 is fastest (1-3s) and high quality; Qwen is a solid second;
// Llama 70B is the most reliable fallback but slower.
const OPENROUTER_MODELS = [
  "deepseek/deepseek-chat",
  "qwen/qwen-2.5-72b-instruct",
  "meta-llama/llama-3.3-70b-instruct",
];

// Per-model attempt budget. 8s is enough for DeepSeek (usually 1-3s) and
// Qwen (usually 2-5s). Llama can occasionally hit 7-8s on warm replicas.
const LLM_TIMEOUT_MS = 8_000;

export interface PersonaInsights {
  developer: string;
  founder: string;
  contentWriter: string;
  trader: string;
}

export interface SourceCitation {
  name: string;
  citation: string;
}

export interface SynthesizedResult {
  topic: string;
  summary: string;
  answer: string;
  personaInsights: PersonaInsights;
  sourceCitations: SourceCitation[];
}

function generateFallbackTopic(question: string): string {
  const clean = question.replace(/[?.,!]/g, "").trim();
  const words = clean.split(/\s+/).slice(0, 6).join(" ");
  return words.length > 0 ? `${words}: Research Dossier` : "Verified Research Dossier";
}

function sourceLabel(source: PaidResult): string {
  if (source.settlement === "x402") {
    return `Paid x402 source settled on-chain (${source.amountPaid} USDC).`;
  }
  if (source.settlement === "telemetry") {
    return "Live public execution-node telemetry (not a paid source).";
  }
  return "Public enrichment source (not a paid source).";
}

function parseJsonResponse(raw: string, question: string, fallbackSources: PaidResult[]): SynthesizedResult {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  try {
    const parsed = JSON.parse(cleaned);

    // Normalize summary: handle array or string
    let summaryText = "";
    if (Array.isArray(parsed.summary)) {
      summaryText = parsed.summary.map((s: string) => `• ${String(s).replace(/^[•*-]\s*/, "")}`).join("\n");
    } else if (typeof parsed.summary === "string") {
      summaryText = parsed.summary.trim();
    }

    // Normalize answer: handle array of paragraphs or single string
    let answerText = "";
    if (Array.isArray(parsed.answer)) {
      answerText = parsed.answer.map((p: unknown) => String(p).trim()).filter(Boolean).join("\n\n");
    } else if (typeof parsed.answer === "string") {
      answerText = parsed.answer.trim();
    } else {
      answerText = cleaned;
    }

    // Normalize source citations
    // Source provenance is system-derived, never taken from the model. A
    // model may summarize content, but it must not be able to turn public
    // enrichment into a paid citation by changing a label in its JSON.
    const citations: SourceCitation[] = fallbackSources.map((s) => ({
      name: s.sourceName,
      citation: sourceLabel(s),
    }));

    return {
      topic:
        typeof parsed.topic === "string" && parsed.topic.trim()
          ? parsed.topic.trim()
          : generateFallbackTopic(question),
      summary: summaryText || "Research synthesized from paid sources and clearly labeled public enrichment.",
      answer: answerText || cleaned,
      personaInsights: {
        developer:
          parsed.personaInsights?.developer ||
          "Technical details, RPC endpoints, and contract specs drawn from the supplied sources.",
        founder:
          parsed.personaInsights?.founder ||
          "Strategic market implications and unit economics synthesized from the supplied research.",
        contentWriter:
          parsed.personaInsights?.contentWriter ||
          "Key actionable takeaways and quotable verified insights.",
        trader:
          parsed.personaInsights?.trader ||
          "On-chain liquidity, DEX metrics, and token catalyst signals.",
      },
      sourceCitations: citations,
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
      sourceCitations: fallbackSources.map((s) => ({
        name: s.sourceName,
      citation: sourceLabel(s),
      })),
    };
  }
}

export async function synthesizeAnswer(
  question: string,
  sources: PaidResult[]
): Promise<SynthesizedResult> {
  const sourceText = sources
    .map((s) => {
      const raw = typeof s.content === "string" ? s.content : JSON.stringify(s.content, null, 2);
      // Keep LLM input bounded for the small early-access budget. The full
      // retrieved payload remains in the answer receipt for the user.
      return `Source: ${s.sourceName}\n${raw.slice(0, 12_000)}${raw.length > 12_000 ? "\n[Source excerpt ends; full data is in the receipt.]" : ""}`;
    })
    .join("\n\n")
    .slice(0, 30_000);

  const prompt = `You are Qerin, an autonomous AI research agent. Synthesize an authoritative, in-depth research dossier based on the question and gathered intelligence below.

Question: ${question}

Gathered source intelligence. Sources are labelled as paid x402 settlements, public enrichment, or public telemetry. Never describe public enrichment or telemetry as paid, premium, or settled:
${sourceText}

Provide your response as a valid JSON object matching this exact schema:
{
  "topic": "A short, punchy 3-6 word title in Claude Code style (e.g. 'Trading Agents: Hallucination Risks' or 'BOT Chain: Architecture & Speed')",
  "summary": [
    "Key finding 1: Core fact, mechanism, or performance metric",
    "Key finding 2: Primary vulnerability, structural risk, or trade-off",
    "Key finding 3: Empirical solution, on-chain safeguard, or future outlook"
  ],
  "answer": "A deep, comprehensive, and highly informative answer (4-5 rich paragraphs). Break it into clear logical sections with markdown bold headings (e.g. **Architectural Overview & Core Mechanics**, **Vulnerabilities & Risk Profile**, **Verification & Safeguards**, **Empirical Outlook**). Provide substantive analysis with concrete examples, not shallow one-liners.",
  "sources": [
    { "name": "Exact name of each consulted source", "citation": "1-2 sentences on the specific findings, metrics, or data extracted from this source" }
  ],
  "personaInsights": {
    "developer": "2 sentences with technical specs, endpoints, protocol standards, contract/gas aspects",
    "founder": "2 sentences on market impact, product opportunities, strategic takeaways, or unit economics",
    "contentWriter": "2 sentences with an engaging narrative hook or publishable headline quote",
    "trader": "2 sentences on token catalysts, liquidity impact, market sentiment, or volume trends"
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
      timeout: LLM_TIMEOUT_MS,
      defaultHeaders: {
        "HTTP-Referer": "https://qerin.vercel.app",
        "X-Title": "Qerin AI Agent",
      },
    });

    for (const model of OPENROUTER_MODELS) {
      try {
        const completion = await openRouterClient.chat.completions.create({
          model,
          max_tokens: 1200,
          temperature: 0.2,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content ?? "";
        if (content) {
          return parseJsonResponse(content, question, sources);
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
        timeout: LLM_TIMEOUT_MS,
      });
      const model = process.env.QERIN_LLM_MODEL || "meta/llama-3.3-70b-instruct";
      const completion = await nimClient.chat.completions.create({
        model,
        max_tokens: 1000,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
      });
      const content = completion.choices[0]?.message?.content ?? "";
      if (content) {
        return parseJsonResponse(content, question, sources);
      }
    } catch (err) {
      console.error("NVIDIA NIM fallback failed:", err);
    }
  }

  // 3. Fallback if all LLMs are unreachable
  return {
    topic: generateFallbackTopic(question),
    summary: "• Research assembled from the sources listed below.\n• Paid sources and public enrichment are distinguished in the receipt.\n• Settlement evidence is recorded only for verified x402 payments.",
    answer: `**Research Dossier**\n\nThis dossier was synthesized from: ${sources.map((s) => s.sourceName).join(", ")}.\n\n**Settlement evidence**\n\nOnly sources explicitly marked as x402 settlements have an associated paid transaction and are eligible for the on-chain receipt registry.`,
    personaInsights: {
      developer: "Inspect the source labels and transaction links before relying on settlement evidence.",
      founder: "Distinguish paid research from public enrichment when evaluating coverage.",
      contentWriter: "Use the source labels and citations to attribute claims accurately.",
      trader: "Validate market-sensitive information against the cited source and timestamp.",
    },
    sourceCitations: sources.map((s) => ({
      name: s.sourceName,
      citation: sourceLabel(s),
    })),
  };
}
