import { encodeFunctionData, parseUnits, stringToHex } from "viem";

const BASE_CHAIN_ID_HEX = "0x2105"; // 8453

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

function getProvider(): EthereumProvider {
  if (!window.ethereum) {
    throw new Error("No wallet found — install Coinbase Wallet, MetaMask, or open this in a wallet browser.");
  }
  return window.ethereum;
}

async function ensureBaseNetwork(provider: EthereumProvider): Promise<void> {
  const chainId = await provider.request({ method: "eth_chainId" });
  if (chainId === BASE_CHAIN_ID_HEX) return;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_CHAIN_ID_HEX }],
    });
  } catch (err) {
    // 4902 = chain not added to the wallet yet — add it, then the user is
    // already on it (most wallets switch automatically after adding).
    if ((err as { code?: number })?.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: BASE_CHAIN_ID_HEX,
            chainName: "Base",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://mainnet.base.org"],
            blockExplorerUrls: ["https://basescan.org"],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

export interface CryptoTopupResult {
  txHash: string;
  signature: string;
}

/**
 * Connects the user's injected wallet (Coinbase Wallet, MetaMask, or a
 * wallet-app in-app browser), sends amountUsd worth of USDC to Qerin's
 * wallet on Base, then has the same wallet sign a message binding this
 * specific transaction to the account. The backend (cryptoTopup.ts) only
 * credits the balance once it independently confirms both the on-chain
 * transfer and that signature.
 */
export async function sendUsdcTopup(accountId: string, amountUsd: number): Promise<CryptoTopupResult> {
  const provider = getProvider();

  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const from = accounts[0];
  if (!from) throw new Error("No wallet account available");

  await ensureBaseNetwork(provider);

  const infoRes = await fetch("/api/network-info");
  const info = await infoRes.json();
  if (!infoRes.ok || !info.payTo || !info.usdc) {
    throw new Error(info?.error || "Could not load network info");
  }

  const amountAtomic = parseUnits(amountUsd.toString(), 6);
  const data = encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    functionName: "transfer",
    args: [info.payTo as `0x${string}`, amountAtomic],
  });

  const txHash = (await provider.request({
    method: "eth_sendTransaction",
    params: [{ from, to: info.usdc, data }],
  })) as string;

  // Must exactly match buildTopupSignMessage on the backend
  // (apps/backend/src/cryptoTopup.ts) — any drift breaks verification.
  const message = `Qerin top-up confirmation\naccount:${accountId}\ntx:${txHash}`;
  const signature = (await provider.request({
    method: "personal_sign",
    params: [stringToHex(message), from],
  })) as string;

  return { txHash, signature };
}
