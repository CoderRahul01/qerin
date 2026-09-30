const CONTRACT_ADDRESS = "0xb35788922a5b9c8938de8aedf725b88d26eeea45";
const OPERATOR_ADDRESS = "0x5b2131e9b28a46ec10d260a14b9deb34554311f2";
const RPC_URL = "https://rpc.botchain.ai";

async function checkKPIStatus() {
  console.log("=================================================");
  console.log("🔍 BOT CHAIN KPI 6 LIVE VALIDATOR STATUS");
  console.log("=================================================");
  console.log(`Registry Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Qerin Operator:    ${OPERATOR_ADDRESS}`);
  console.log(`Network RPC:       ${RPC_URL}\n`);

  try {
    const logsRes = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getLogs",
        params: [{ address: CONTRACT_ADDRESS, fromBlock: "0x0" }],
        id: 1,
      }),
    });
    const logs = ((await logsRes.json())).result || [];
    const txSet = new Set(logs.map((l) => l.transactionHash));

    const senders = new Map();
    for (const txHash of txSet) {
      const txRes = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_getTransactionByHash",
          params: [txHash],
          id: 1,
        }),
      });
      const tx = ((await txRes.json())).result;
      if (tx?.from) {
        const addr = tx.from.toLowerCase();
        senders.set(addr, (senders.get(addr) ?? 0) + 1);
      }
    }

    console.log("📊 [ON-CHAIN TRANSACTIONS]");
    console.log(`• Total Receipts Logged:       ${logs.length}`);
    console.log(`• Distinct Transaction Hashes: ${txSet.size}`);
    console.log(`• Unique Sender Wallets:       ${senders.size}\n`);

    console.log("👛 [PARTICIPATING WALLETS]");
    for (const [addr, count] of senders.entries()) {
      console.log(`  - ${addr} (${count} txs)`);
    }

    console.log("\n🎯 [KPI 6 COMPLIANCE CHECK]");
    const meetsWallets = senders.size >= 3;
    const meetsTxs = txSet.size >= 5;

    if (meetsWallets && meetsTxs) {
      console.log("✅ RESULT: PASS — All BOT Chain KPI 6 requirements are MET!");
      console.log("   (Wallets >= 3, Txs >= 5)");
    } else {
      console.log("❌ RESULT: INCOMPLETE");
      console.log(`   • Wallets: ${senders.size}/3 ${meetsWallets ? "✅" : "⚠️ Need at least 3 unique wallets"}`);
      console.log(`   • Transactions: ${txSet.size}/5 ${meetsTxs ? "✅" : "⚠️ Need at least 5 transactions"}`);
    }
    console.log("=================================================\n");
  } catch (err) {
    console.error("Error querying BOT Chain RPC:", err);
  }
}

checkKPIStatus();
