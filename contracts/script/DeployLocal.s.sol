// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {Script} from "forge-std/Script.sol";
import {OFLToken} from "../src/OFLToken.sol";
import {OpenFund} from "../src/OpenFund.sol";

/// @dev PUBLIC ANVIL DEVELOPMENT MNEMONIC ONLY. Never send real funds to these accounts.
contract DeployLocal is Script {
    function run() external returns (OFLToken token, OpenFund core) {
        require(block.chainid == 31337, "Anvil only");
        string memory mnemonic = "test test test test test test test test test test test junk";
        uint256 key = vm.deriveKey(mnemonic, 0);
        vm.startBroadcast(key);
        token = new OFLToken(vm.addr(key));
        core = new OpenFund(address(token));
        token.registerProtectedFund(address(core));
        for (uint32 i; i < 6; i++) {
            token.mint(vm.addr(vm.deriveKey(mnemonic, i)), 10_000_000 ether);
        }
        vm.stopBroadcast();
    }
}
