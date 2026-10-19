// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {Script} from "forge-std/Script.sol";
import {OFLToken} from "../src/OFLToken.sol";
import {OpenFund} from "../src/OpenFund.sol";

/// @notice Run with the issuer's Foundry keystore/hardware wallet after deployment.
contract RegisterProtocol is Script {
    function run() external {
        address core = vm.envAddress("OPENFUND_ADDRESS");
        OFLToken token = OFLToken(OpenFund(core).oflToken());
        require(OpenFund(core).deploymentChainId() == block.chainid, "Wrong deployment chain");
        require(!token.protectedFunds(core), "Already protected");
        vm.startBroadcast();
        token.registerProtectedFund(core);
        vm.stopBroadcast();
    }
}
