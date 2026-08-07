// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {QerinReceiptRegistry} from "../src/QerinReceiptRegistry.sol";

/// @dev Usage:
///   forge script script/DeployQerinReceiptRegistry.s.sol \
///     --rpc-url $BASE_RPC_URL --account deployer --broadcast \
///     --sig "run(address)" <qerin-backend-wallet-address>
contract DeployQerinReceiptRegistry is Script {
    function run(address qerinBackend) external returns (QerinReceiptRegistry registry) {
        vm.startBroadcast();
        registry = new QerinReceiptRegistry(qerinBackend);
        vm.stopBroadcast();

        console.log("QerinReceiptRegistry deployed at:", address(registry));
    }
}
