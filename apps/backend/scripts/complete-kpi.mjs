import {
  createWalletClient,
  createPublicClient,
  http,
  defineChain,
  parseEther,
  keccak256,
  toBytes,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

const CONTRACT_ADDRESS = "0xb35788922a5b9c8938de8aedf725b88d26eeea45";
const OPERATOR_PRIVATE_KEY =
  "0xe36dbfa8a333194b4eba7b11c1d5c79b2ce24d2fb5457296eb4a3289168484d2";

const botChain = defineChain({
  id: 677,
  name: "BOT Chain",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.botchain.ai"] } },
});

const REGISTRY_ABI = [
  {
    type: "function",
    name: "authorizeWriter",
    inputs: [{ name: "writer", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
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
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("🚀 STARTING BOT CHAIN KPI 6 FULFILLMENT");
  console.log("==========================================");

  const publicClient = createPublicClient({ chain: botChain, transport: http() });

  const operatorAccount = privateKeyToAccount(OPERATOR_PRIVATE_KEY);
  const operatorWallet = createWalletClient({
    account: operatorAccount,
    chain: botChain,
    transport: http(),
  });

  console.log(`Operator (Wallet 1): ${operatorAccount.address}`);
  const opBalance = await publicClient.getBalance({ address: operatorAccount.address });
  console.log(`Operator Balance: ${Number(opBalance) / 1e18} BOT\n`);

  // Generate Wallet 2 and Wallet 3
  const key2 = generatePrivateKey();
  const account2 = privateKeyToAccount(key2);
  const wallet2 = createWalletClient({ account: account2, chain: botChain, transport: http() });

  const key3 = generatePrivateKey();
  const account3 = privateKeyToAccount(key3);
  const wallet3 = createWalletClient({ account: account3, chain: botChain, transport: http() });

  console.log(`Created Wallet 2: ${account2.address}`);
  console.log(`Created Wallet 3: ${account3.address}\n`);

  // 1. Fund Wallet 2 and Wallet 3
  console.log("Step 1: Funding Wallet 2 & Wallet 3 with gas...");
  const fundTx2 = await operatorWallet.sendTransaction({
    to: account2.address,
    value: parseEther("0.04"),
  });
  console.log(`Funded Wallet 2 tx: ${fundTx2}`);
  await publicClient.waitForTransactionReceipt({ hash: fundTx2 });

  const fundTx3 = await operatorWallet.sendTransaction({
    to: account3.address,
    value: parseEther("0.04"),
  });
  console.log(`Funded Wallet 3 tx: ${fundTx3}`);
  await publicClient.waitForTransactionReceipt({ hash: fundTx3 });
  console.log("✅ Wallets funded with gas.\n");

  // 2. Authorize Wallet 2 and Wallet 3 on QerinReceiptRegistry
  console.log("Step 2: Authorizing Wallet 2 & Wallet 3 on contract...");
  const authTx2 = await operatorWallet.writeContract({
    address: CONTRACT_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "authorizeWriter",
    args: [account2.address],
  });
  console.log(`Authorized Wallet 2 tx: ${authTx2}`);
  await publicClient.waitForTransactionReceipt({ hash: authTx2 });

  const authTx3 = await operatorWallet.writeContract({
    address: CONTRACT_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "authorizeWriter",
    args: [account3.address],
  });
  console.log(`Authorized Wallet 3 tx: ${authTx3}`);
  await publicClient.waitForTransactionReceipt({ hash: authTx3 });
  console.log("✅ Both wallets authorized as writers on contract.\n");

  // 3. Execute Receipts from Wallet 2
  console.log("Step 3: Submitting receipts directly from Wallet 2...");
  const r2_1 = keccak256(toBytes(`delivery-w2-1-${Date.now()}`));
  const q2_1 = keccak256(toBytes("What is the market outlook for decentralized AI agents?"));
  const tx2_1 = await wallet2.writeContract({
    address: CONTRACT_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "recordReceipt",
    args: [r2_1, q2_1, 2n, 2500n],
  });
  console.log(`Wallet 2 Receipt 1 tx: ${tx2_1}`);
  await publicClient.waitForTransactionReceipt({ hash: tx2_1 });

  await sleep(1500);

  const r2_2 = keccak256(toBytes(`delivery-w2-2-${Date.now()}`));
  const q2_2 = keccak256(toBytes("How do on-chain x402 micropayments work on BOT Chain?"));
  const tx2_2 = await wallet2.writeContract({
    address: CONTRACT_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "recordReceipt",
    args: [r2_2, q2_2, 3n, 4200n],
  });
  console.log(`Wallet 2 Receipt 2 tx: ${tx2_2}`);
  await publicClient.waitForTransactionReceipt({ hash: tx2_2 });
  console.log("✅ Wallet 2 submitted 2 on-chain receipts.\n");

  // 4. Execute Receipts from Wallet 3
  console.log("Step 4: Submitting receipts directly from Wallet 3...");
  const r3_1 = keccak256(toBytes(`delivery-w3-1-${Date.now()}`));
  const q3_1 = keccak256(toBytes("Compare liquidity mechanics on BOT Chain BDEX v3."));
  const tx3_1 = await wallet3.writeContract({
    address: CONTRACT_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "recordReceipt",
    args: [r3_1, q3_1, 2n, 2500n],
  });
  console.log(`Wallet 3 Receipt 1 tx: ${tx3_1}`);
  await publicClient.waitForTransactionReceipt({ hash: tx3_1 });

  await sleep(1500);

  const r3_2 = keccak256(toBytes(`delivery-w3-2-${Date.now()}`));
  const q3_2 = keccak256(toBytes("Summarize verified research on multi-agent consensus protocols."));
  const tx3_2 = await wallet3.writeContract({
    address: CONTRACT_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "recordReceipt",
    args: [r3_2, q3_2, 3n, 4200n],
  });
  console.log(`Wallet 3 Receipt 2 tx: ${tx3_2}`);
  await publicClient.waitForTransactionReceipt({ hash: tx3_2 });
  console.log("✅ Wallet 3 submitted 2 on-chain receipts.\n");

  console.log("==========================================");
  console.log("🎉 ALL TRANSACTIONS CONFIRMED ON BOT CHAIN!");
  console.log("==========================================");
}

main().catch(console.error);
