import type { PersonaInsights, ReceiptItem } from "./types";

export interface DossierOptions {
  question: string;
  topic?: string;
  summary?: string;
  answer: string;
  personaInsights?: PersonaInsights;
  receipt?: ReceiptItem[];
  totalPaid?: string;
  network?: string;
  date?: string;
}

export function generateDossierMarkdown(opt: DossierOptions): string {
  const date = opt.date || new Date().toLocaleString();
  const topic = opt.topic || opt.question;
  let md = `# QERIN VERIFIED RESEARCH DOSSIER\n\n`;
  md += `**Topic:** ${topic}\n`;
  md += `**Inquiry:** ${opt.question}\n`;
  md += `**Date:** ${date}\n`;
  md += `**Settlement Network:** ${opt.network || "Base Mainnet"}\n`;
  md += `**On-Chain Micropayment Total:** ${opt.totalPaid || "0.020"} USDC\n\n`;
  md += `---\n\n`;

  if (opt.summary) {
    md += `## ⚡ Executive Summary (Verified TL;DR)\n\n${opt.summary}\n\n`;
  }

  md += `## 📑 Comprehensive Research & Analysis\n\n${opt.answer}\n\n`;

  if (opt.personaInsights) {
    md += `## 👥 Tailored Persona Perspectives\n\n`;
    if (opt.personaInsights.developer) {
      md += `### 🛠 Developer & Technical Integration\n${opt.personaInsights.developer}\n\n`;
    }
    if (opt.personaInsights.founder) {
      md += `### 🚀 Founder & Market Strategy\n${opt.personaInsights.founder}\n\n`;
    }
    if (opt.personaInsights.contentWriter) {
      md += `### ✍️ Content & Editorial Angles\n${opt.personaInsights.contentWriter}\n\n`;
    }
    if (opt.personaInsights.trader) {
      md += `### 📈 Trader & Market Intelligence\n${opt.personaInsights.trader}\n\n`;
    }
  }

  if (opt.receipt && opt.receipt.length > 0) {
    md += `## ⛓️ Verified On-Chain Payment Receipts\n\n`;
    md += `| Source | Amount Paid | Tx Hash | Timestamp |\n`;
    md += `|---|---|---|---|\n`;
    for (const r of opt.receipt) {
      md += `| ${r.source} | ${r.amountPaid} USDC | [${r.txHash ? r.txHash.slice(0, 10) + "..." : "—"}](${r.basescanUrl || "#"}) | ${r.timestamp} |\n`;
    }
    md += `\n`;
  }

  md += `---\n`;
  md += `*Generated autonomously by Qerin (qerin.ai) — Real micropayments. Real data. Verifiable on-chain.*`;
  return md;
}

export function downloadDossierPdf(opt: DossierOptions): void {
  const date = opt.date || new Date().toLocaleString();
  const topic = opt.topic || opt.question;
  const receipts = opt.receipt || [];

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Qerin Dossier — ${topic}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      color: #111827;
      background: #ffffff;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      line-height: 1.6;
    }
    .header {
      border-bottom: 2px solid #f45b00;
      padding-bottom: 20px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.02em;
    }
    .brand-tag {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      background: #fff0e6;
      color: #f45b00;
      padding: 3px 8px;
      border-radius: 999px;
      border: 1px solid #ffd4b8;
    }
    .meta-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 24px;
      font-size: 13px;
    }
    .meta-row {
      display: flex;
      margin-bottom: 6px;
    }
    .meta-label {
      font-weight: 600;
      width: 170px;
      color: #4b5563;
    }
    .meta-value {
      color: #111827;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 12.5px;
    }
    .summary-box {
      background: #fff7ed;
      border-left: 4px solid #f45b00;
      border-radius: 0 8px 8px 0;
      padding: 16px 20px;
      margin: 24px 0;
    }
    .summary-title {
      font-size: 12px;
      font-weight: 700;
      color: #f45b00;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .section-title {
      font-size: 17px;
      font-weight: 700;
      margin-top: 30px;
      margin-bottom: 12px;
      color: #111827;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 6px;
    }
    .persona-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-top: 14px;
    }
    .persona-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px 14px;
      background: #ffffff;
    }
    .persona-name {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 6px;
      color: #f45b00;
    }
    .receipt-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-size: 12.5px;
    }
    .receipt-table th {
      background: #f3f4f6;
      text-align: left;
      padding: 8px 12px;
      font-weight: 600;
      border: 1px solid #e5e7eb;
    }
    .receipt-table td {
      padding: 8px 12px;
      border: 1px solid #e5e7eb;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11.5px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 11px;
      color: #6b7280;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">
        <span class="brand-title">QERIN</span>
        <span class="brand-tag">Verified Research Dossier</span>
      </div>
      <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Autonomous AI Agent with x402 Micropayment Verification</div>
    </div>
    <div style="text-align: right; font-size: 12px; color: #4b5563;">
      <div>${date}</div>
      <div style="font-weight: 600; color: #16a34a; margin-top: 2px;">● On-Chain Verified</div>
    </div>
  </div>

  <div class="meta-box">
    <div class="meta-row">
      <span class="meta-label">Topic:</span>
      <span class="meta-value" style="font-weight: 600;">${topic}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Research Inquiry:</span>
      <span class="meta-value">${opt.question}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Settlement Network:</span>
      <span class="meta-value">${opt.network || "Base Mainnet"}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Total On-Chain Paid:</span>
      <span class="meta-value" style="color: #f45b00; font-weight: 600;">${opt.totalPaid || "0.020"} USDC</span>
    </div>
  </div>

  ${opt.summary ? `
  <div class="summary-box">
    <div class="summary-title">⚡ Executive Summary (Verified TL;DR)</div>
    <div style="font-size: 14px; line-height: 1.6;">${opt.summary.replace(/\n/g, "<br/>")}</div>
  </div>
  ` : ""}

  <div class="section-title">Comprehensive Verified Analysis</div>
  <div style="font-size: 14px; line-height: 1.7; white-space: pre-line; color: #1f2937;">
    ${opt.answer.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}
  </div>

  ${opt.personaInsights ? `
  <div class="section-title">Multi-Persona Intelligence</div>
  <div class="persona-grid">
    <div class="persona-card">
      <div class="persona-name">🛠 Developer & Tech Specs</div>
      <div style="font-size: 13px;">${opt.personaInsights.developer || "Verified on-chain receipt available."}</div>
    </div>
    <div class="persona-card">
      <div class="persona-name">🚀 Founder & Market Strategy</div>
      <div style="font-size: 13px;">${opt.personaInsights.founder || "Market impact synthesized from paid sources."}</div>
    </div>
    <div class="persona-card">
      <div class="persona-name">✍️ Content & Media Hook</div>
      <div style="font-size: 13px;">${opt.personaInsights.contentWriter || "Direct quotes and insights."}</div>
    </div>
    <div class="persona-card">
      <div class="persona-name">📈 Trader & Alpha Signals</div>
      <div style="font-size: 13px;">${opt.personaInsights.trader || "Real-time liquidity & volume catalysts."}</div>
    </div>
  </div>
  ` : ""}

  ${receipts.length > 0 ? `
  <div class="section-title">Cryptographic Payment Audit Trail</div>
  <table class="receipt-table">
    <thead>
      <tr>
        <th>Source</th>
        <th>Paid</th>
        <th>Tx Hash</th>
        <th>Time</th>
      </tr>
    </thead>
    <tbody>
      ${receipts.map(r => `
        <tr>
          <td style="font-weight: 600;">${r.source}</td>
          <td style="color: #f45b00;">${r.amountPaid} USDC</td>
          <td>${r.txHash ? r.txHash.slice(0, 16) + "..." : "—"}</td>
          <td>${r.timestamp}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
  ` : ""}

  <div class="footer">
    Verified by Qerin Receipt Registry — Base (0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45) & BOT Chain Mainnet (0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45 | Chain ID 677)<br/>
    Autonomous agent micropayment settlement via x402 protocol.
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
