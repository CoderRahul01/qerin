import { createWalletClient, defineChain, http, keccak256, toBytes, type Chain, type WalletClient } from "viem";
import { base, baseSepolia } from "viem/chains";
import { getQerinAccount } from "./wallet.js";
import { getActiveNetwork, getRegistryAddress, NETWORKS, type SupportedNetwork } from "./networks.js";
import { withTimeout } from "./withTimeout.js";

// The registry write is already non-fatal (wrapped in try/catch below,
// answers still ship without a registryTxHash if this fails) — but with no
// timeout, an RPC node that stalls mid-request used to hold up the entire
// /v1/answer response anyway, since answerHandler.ts awaits this before
// returning. If the underlying write does eventually land on-chain after
// this gives up on it, it's simply not reflected in this answer's receipt.
const REGISTRY_WRITE_TIMEOUT_MS = 10_000;

const REGISTRY_ABI = [
  {
    type: "function",
    name: "recordReceipt",
    inputs: [
      { name: "receiptId", type: "bytes32" },
      { name: "questionHash", type: "bytes32" },
      { name: "sourceCount", type: "uint256" },
      { name: "totalPaidMicroUSDC", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// viem ships Base and Base Sepolia out of the box, but not BOT Chain — define
// both BOT Chain networks from the same config already in networks.ts so the
// RPC URL and explorer link can't drift between the two files.
const botChain: Chain = defineChain({
  id: NETWORKS.botchain.chainId,
  name: NETWORKS.botchain.name,
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: { default: { http: [NETWORKS.botchain.rpcUrl] } },
  blockExplorers: { default: { name: "BOT Scan", url: "https://scan.botchain.ai" } },
});

const botChainTestnet: Chain = defineChain({
  id: NETWORKS.botchain_testnet.chainId,
  name: NETWORKS.botchain_testnet.name,
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: { default: { http: [NETWORKS.botchain_testnet.rpcUrl] } },
  blockExplorers: { default: { name: "BOT Scan", url: "https://scan.botchain.ai" } },
});

function viemChainFor(networkName: SupportedNetwork): Chain {
  switch (networkName) {
    case "mainnet":
      return base;
    case "testnet":
      return baseSepolia;
    case "botchain":
      return botChain;
    case "botchain_testnet":
      return botChainTestnet;
  }
}

// One wallet client per chain, built lazily on first use per network (same
// process.env-timing reason as wallet.ts's getQerinAccount()). Previously
// this was a single client hardcoded to Base — meaning a receipt for an
// answer served on BOT Chain still silently got written to a Base contract,
// or dropped if no Base registry address was set. Same private key everywhere
// (Qerin runs one operational wallet across chains); only the chain and the
// registry address change.
const walletClients = new Map<SupportedNetwork, WalletClient>();

function getWalletClient(networkName: SupportedNetwork): WalletClient {
  let client = walletClients.get(networkName);
  if (!client) {
    client = createWalletClient({ account: getQerinAccount(), chain: viemChainFor(networkName), transport: http() });
    walletClients.set(networkName, client);
  }
  return client;
}

/**
 * Logs a delivered answer to the QerinReceiptRegistry contract on whichever
 * network the answer was actually served on. Attaches the payerAddress
 * deterministically to the receiptId so the delivery is cryptographically
 * attributable to that user's isolated account.
 */
export async function recordReceiptOnChain(
  question: string,
  sourceCount: number,
  totalPaidUsd: number,
  payerAddress?: string | null,
  targetNetwork?: string
): Promise<string | null> {
  const networkName = (targetNetwork && targetNetwork in NETWORKS ? targetNetwork : getActiveNetwork()) as SupportedNetwork;
  const registryAddress = getRegistryAddress(networkName);
  if (!registryAddress) return null;

  try {
    const client = getWalletClient(networkName);
    const payer = payerAddress && payerAddress.startsWith("0x") ? payerAddress.toLowerCase() : "anonymous";
    const questionHash = keccak256(toBytes(question));
    const receiptId = keccak256(toBytes(`${payer}:${Date.now()}:${crypto.randomUUID()}`));
    const totalPaidMicroUSDC = BigInt(Math.round(totalPaidUsd * 1_000_000));

    const hash = await withTimeout(
      client.writeContract({
        address: registryAddress,
        abi: REGISTRY_ABI,
        functionName: "recordReceipt",
        args: [receiptId, questionHash, BigInt(sourceCount), totalPaidMicroUSDC],
        chain: client.chain,
        account: client.account!,
      }),
      REGISTRY_WRITE_TIMEOUT_MS,
      `QerinReceiptRegistry write (${networkName})`
    );
    console.log(`QerinReceiptRegistry (${networkName}) recorded receipt for ${payer}: ${hash}`);
    return hash;
  } catch (err) {
    console.error(`QerinReceiptRegistry (${networkName}) write failed (non-fatal):`, err);
    return null;
  }
}
