#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const SOURCES = [
  { name: "Superhighway", priceUsd: 0.001, use: "General web search" },
  { name: "CryptoSlate gateway", priceUsd: 0.01, use: "Relevant full CryptoSlate article" },
  { name: "Veles", priceUsd: 0.02, use: "Financial questions" },
  { name: "CoinGecko", priceUsd: 0.01, use: "DEX and liquidity questions" },
  { name: "Otto", priceUsd: 0.001, use: "Crypto news or market feeds" },
];

const REGISTRIES = {
  base: {
    address: process.env.QERIN_REGISTRY_ADDRESS_BASE || "",
    rpc: "https://mainnet.base.org",
    explorer: "https://basescan.org/tx/",
  },
  botchain: {
    address: process.env.QERIN_REGISTRY_ADDRESS_BOTCHAIN || "0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45",
    rpc: "https://rpc.botchain.ai",
    explorer: "https://scan.botchain.ai/tx/",
  },
} as const;

// keccak256("AnswerDelivered(bytes32,bytes32,uint256,uint256)") from
// apps/contracts/src/QerinReceiptRegistry.sol.
const ANSWER_DELIVERED_TOPIC = "0xa5ef1a3b1fa0267f6d8dbf3b66a46519dfe0429ae0edbc288f8d5c1d79be7c0b";
const TX_HASH = /^0x[a-fA-F0-9]{64}$/;

const server = new Server(
  { name: "qerin-mcp", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {} } },
);

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    { uri: "qerin://sources/available", mimeType: "application/json", name: "Qerin source routes", description: "Listed prices and intended use; a paid transaction is required for proof." },
    { uri: "qerin://networks/registry", mimeType: "application/json", name: "Receipt registries", description: "Configured receipt registry addresses." },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const value = request.params.uri === "qerin://sources/available"
    ? SOURCES
    : request.params.uri === "qerin://networks/registry"
      ? Object.fromEntries(Object.entries(REGISTRIES).map(([name, config]) => [name, { address: config.address || null, explorer: config.explorer }]))
      : null;
  if (value === null) throw new Error(`Resource not found: ${request.params.uri}`);
  return { contents: [{ uri: request.params.uri, mimeType: "application/json", text: JSON.stringify(value, null, 2) }] };
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "qerin_verified_query",
      description: "Paid research is available in the Qerin web app. MCP payment support is not enabled yet; this tool will not simulate a result.",
      inputSchema: { type: "object", properties: { question: { type: "string" } }, required: ["question"] },
    },
    {
      name: "qerin_verify_receipt",
      description: "Check a Qerin registry transaction and its AnswerDelivered event on Base or BOT Chain.",
      inputSchema: { type: "object", properties: { txHash: { type: "string" }, network: { type: "string", enum: ["base", "botchain"] } }, required: ["txHash", "network"] },
    },
    { name: "qerin_list_sources", description: "List the source routes and quoted prices used by the web app.", inputSchema: { type: "object", properties: {} } },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  if (name === "qerin_list_sources") {
    return { content: [{ type: "text", text: JSON.stringify({ sourcePaymentNetwork: "Base USDC", sources: SOURCES }, null, 2) }] };
  }
  if (name === "qerin_verified_query") {
    return {
      isError: true,
      content: [{ type: "text", text: "MCP paid queries are not enabled. Use https://qerin.vercel.app/app with your Qerin balance, Direct API billing is paused during early access. No source was paid and no answer was generated." }],
    };
  }
  if (name === "qerin_verify_receipt") {
    const txHash = String(args?.txHash || "");
    const network = String(args?.network || "");
    if (!TX_HASH.test(txHash) || (network !== "base" && network !== "botchain")) {
      return { isError: true, content: [{ type: "text", text: "A transaction hash and either base or botchain are required." }] };
    }
    const config = REGISTRIES[network];
    if (!config.address) {
      return { isError: true, content: [{ type: "text", text: `Qerin has no configured ${network} registry address for this MCP instance.` }] };
    }
    try {
      const response = await fetch(config.rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionReceipt", params: [txHash] }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`RPC returned ${response.status}`);
      const data = await response.json() as { result?: { status?: string; logs?: Array<{ address?: string; topics?: string[] }>; blockNumber?: string } | null };
      const receipt = data.result;
      const verified = receipt?.status === "0x1" && receipt.logs?.some((log) =>
        log.address?.toLowerCase() === config.address.toLowerCase()
        && log.topics?.[0]?.toLowerCase() === ANSWER_DELIVERED_TOPIC
      ) === true;
      return {
        content: [{ type: "text", text: JSON.stringify({
          verified,
          status: !receipt ? "not_found" : verified ? "confirmed" : "not_a_qerin_registry_receipt",
          txHash,
          network,
          registryContract: config.address,
          explorerUrl: `${config.explorer}${txHash}`,
          blockNumber: receipt?.blockNumber || null,
        }, null, 2) }],
      };
    } catch (error) {
      return { isError: true, content: [{ type: "text", text: `Could not verify on-chain receipt: ${error instanceof Error ? error.message : "RPC unavailable"}` }] };
    }
  }
  return { isError: true, content: [{ type: "text", text: `Unknown Qerin tool: ${name}` }] };
});

await server.connect(new StdioServerTransport());
