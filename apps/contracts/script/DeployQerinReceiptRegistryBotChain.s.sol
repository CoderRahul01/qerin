// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {QerinReceiptRegistry} from "../src/QerinReceiptRegistry.sol";

/// @dev Usage:
///   forge script script/DeployQerinReceiptRegistryBotChain.s.sol:DeployQerinReceiptRegistryBotChain \
///     --rpc-url botchain \
///     --broadcast \
///     --private-key $QERIN_WALLET_PRIVATE_KEY
contract DeployQerinReceiptRegistryBotChain is Script {
    // Qerin Backend Wallet Address (funds agentic operations & writes on-chain delivery receipts)
    address constant QERIN_BACKEND = 0x5b2131e9b28a46Ec10D260A14B9DEB34554311F2;

    function run() external returns (QerinReceiptRegistry registry) {
        vm.startBroadcast();
        registry = new QerinReceiptRegistry(QERIN_BACKEND);
        vm.stopBroadcast();

        console.log("=== BOT Chain Deployment Complete ===");
        console.log("Network: BOT Chain Mainnet (Chain ID 677)");
        console.log("QerinReceiptRegistry deployed at:", address(registry));
        console.log("Authorized Writer:", QERIN_BACKEND);
    }
}
