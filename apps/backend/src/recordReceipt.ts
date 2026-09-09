import { createWalletClient, http, keccak256, toBytes, type WalletClient } from "viem";
import { base, baseSepolia } from "viem/chains";
import { getQerinAccount } from "./wallet.js";
import { getActiveNetwork, getRegistryAddress } from "./networks.js";

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

// Lazily built on first call, for the same process.env-timing reason as
// wallet.ts's getQerinAccount().
let walletClient: WalletClient | null = null;

function getWalletClient(): WalletClient | null {
  const registryAddress = getRegistryAddress();
  if (!registryAddress) return null;

  if (!walletClient) {
    const chain = getActiveNetwork() === "mainnet" ? base : baseSepolia;
    walletClient = createWalletClient({ account: getQerinAccount(), chain, transport: http() });
  }
  return walletClient;
}

/**
 * Logs a delivered answer to the QerinReceiptRegistry contract. This is a
 * credibility/audit layer on top of the individual x402 payment tx hashes,
 * not a requirement for the answer flow itself — a failure here must never
 * fail or delay the response already sent to the caller. Fire-and-forget
 * from index.ts (not awaited before responding).
 */
export async function recordReceiptOnChain(
  question: string,
  sourceCount: number,
  totalPaidUsd: number
): Promise<string | null> {
  const registryAddress = getRegistryAddress();
  const client = getWalletClient();
  if (!client || !registryAddress) return null;

  try {
    const questionHash = keccak256(toBytes(question));
    const receiptId = keccak256(toBytes(crypto.randomUUID()));
    const totalPaidMicroUSDC = BigInt(Math.round(totalPaidUsd * 1_000_000));

    const hash = await client.writeContract({
      address: registryAddress,
      abi: REGISTRY_ABI,
      functionName: "recordReceipt",
      args: [receiptId, questionHash, BigInt(sourceCount), totalPaidMicroUSDC],
      chain: client.chain,
      account: client.account!,
    });
    console.log(`QerinReceiptRegistry recorded receipt: ${hash}`);
    return hash;
  } catch (err) {
    console.error("QerinReceiptRegistry write failed (non-fatal):", err);
    return null;
  }
}
