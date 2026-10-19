// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {Script} from "forge-std/Script.sol";
import {OFLToken} from "../src/OFLToken.sol";
import {OpenFund} from "../src/OpenFund.sol";

/// @notice Use a Foundry keystore / hardware wallet. Deployer and issuer may differ.
contract DeployProtocol is Script {
    function run() external returns (OFLToken token, OpenFund core) {
        address issuer = vm.envAddress("OFL_ISSUER");
        vm.startBroadcast();
        token = new OFLToken(issuer);
        core = new OpenFund(address(token));
        // Registration must be signed by issuer; a different deployer should register separately.
        vm.stopBroadcast();
    }
}
