import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const pk = generatePrivateKey();
const account = privateKeyToAccount(pk);

console.log("Testnet-only wallet generated.");
console.log("ADDRESS=" + account.address);
console.log("PRIVATE_KEY=" + pk);
console.log("\nFund this address with Base Sepolia ETH + testnet USDC before use.");
