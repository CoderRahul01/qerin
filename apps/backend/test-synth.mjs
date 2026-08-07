process.env.NVIDIA_API_KEY = process.argv[2];
process.env.QERIN_LLM_MODEL = "meta/llama-3.3-70b-instruct";
const { synthesizeAnswer } = await import("./dist/synthesize.js");
try {
  const answer = await synthesizeAnswer("What happened in the CryptoSlate hack this week?", [
    { content: { headline: "Exchange reports unusual withdrawal activity", published: "2026-08-01" }, sourceName: "CryptoSlate", amountPaid: "0.02", txHash: "0xabc", timestamp: new Date().toISOString() },
  ]);
  console.log("ANSWER:", answer);
} catch (e) {
  console.error("ERROR:", e);
}
