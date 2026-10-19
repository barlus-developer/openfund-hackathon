// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {TestBase} from "./TestBase.sol";
import {OFLToken} from "../src/OFLToken.sol";
import {OpenFund} from "../src/OpenFund.sol";
import {IERC1363Receiver} from "@openzeppelin/contracts/interfaces/IERC1363Receiver.sol";

contract Receiver is IERC1363Receiver {
    address public immutable oflToken;
    uint256 public immutable deploymentChainId;
    bool public attackBlocked;
    bool public allowanceAttackBlocked;

    constructor(address t) {
        oflToken = t;
        deploymentChainId = block.chainid;
    }

    function donateTo(address protocol, uint256 id, uint256 amount) external {
        OFLToken(oflToken).transferAndCall(protocol, amount, abi.encode(id));
    }

    function isOpenFundProtocol() external pure returns (bool) {
        return true;
    }

    function onTransferReceived(address, address from, uint256, bytes calldata) external returns (bytes4) {
        require(msg.sender == oflToken);
        (bool success,) = oflToken.call(abi.encodeWithSignature("transfer(address,uint256)", address(this), 1));
        attackBlocked = !success;
        (success,) =
            oflToken.call(abi.encodeWithSignature("transferFrom(address,address,uint256)", from, address(this), 1));
        allowanceAttackBlocked = !success;
        return IERC1363Receiver.onTransferReceived.selector;
    }
}

contract OFLTokenTest is TestBase {
    function testWalletTransferAllowanceAndOwnBurn() public {
        vm.startPrank(alice);
        token.transfer(bob, 1 ether);
        token.approve(bob, 2 ether);
        vm.stopPrank();
        vm.prank(bob);
        token.transferFrom(alice, recipient, 2 ether);
        vm.prank(recipient);
        token.burn(1 ether);
        assertEq(token.balanceOf(recipient), 1 ether);
        assertEq(token.decimals(), 18);
    }

    function testRegistrationValidationAndAppendOnly() public {
        vm.expectRevert(OFLToken.AlreadyProtected.selector);
        token.registerProtectedFund(address(core));
        vm.expectRevert(OFLToken.InvalidProtocol.selector);
        token.registerProtectedFund(alice);
        vm.prank(alice);
        vm.expectRevert(OFLToken.UnauthorizedIssuer.selector);
        token.registerProtectedFund(address(core));
        OFLToken other = new OFLToken(address(this));
        OpenFund wrong = new OpenFund(address(other));
        vm.expectRevert(OFLToken.InvalidProtocol.selector);
        token.registerProtectedFund(address(wrong));
        assertTrue(token.protectedFunds(address(core)));
    }

    function testRejectEveryOrdinaryIngressPath() public {
        create(false, false);
        vm.startPrank(alice);
        token.approve(bob, 10 ether);
        vm.expectRevert(OFLToken.ProtectedIngress.selector);
        token.transfer(address(core), 1 ether);
        vm.expectRevert(OFLToken.ProtectedIngress.selector);
        token.transferAndCall(address(core), 1 ether);
        vm.expectRevert(OFLToken.ProtectedIngress.selector);
        token.transferAndCall(address(core), 1 ether, hex"01");
        vm.stopPrank();
        vm.startPrank(bob);
        vm.expectRevert(OFLToken.ProtectedIngress.selector);
        token.transferFrom(alice, address(core), 1 ether);
        vm.expectRevert(OFLToken.ProtectedIngress.selector);
        token.transferFromAndCall(alice, address(core), 1 ether, abi.encode(uint256(1)));
        vm.expectRevert(OFLToken.ProtectedIngress.selector);
        token.transferFromAndCall(alice, address(core), 1 ether);
        vm.stopPrank();
        vm.expectRevert(OFLToken.ProtectedIngress.selector);
        token.mint(address(core), 1 ether);
        assertEq(token.balanceOf(address(core)), 0);
    }

    function testOneUsePermissionConsumedBeforeCallback() public {
        Receiver receiver = new Receiver(address(token));
        token.registerProtectedFund(address(receiver));
        vm.startPrank(alice);
        token.approve(address(receiver), 100 ether);
        token.transferAndCall(address(receiver), 10 ether, abi.encode(uint256(123)));
        vm.stopPrank();
        assertTrue(receiver.attackBlocked());
        assertTrue(receiver.allowanceAttackBlocked());
        assertEq(token.balanceOf(address(receiver)), 10 ether);
        vm.prank(alice);
        vm.expectRevert(OFLToken.ProtectedIngress.selector);
        token.transfer(address(receiver), 1);
    }

    function testUnprotectedERC1363Receiver() public {
        Receiver receiver = new Receiver(address(token));
        vm.prank(alice);
        token.transferAndCall(address(receiver), 5 ether);
        assertEq(token.balanceOf(address(receiver)), 5 ether);
    }

    function testIssuerCannotSeizeBurnOrWithdrawTreasury() public {
        uint256 id = create(false, false);
        donate(id, alice, 5 ether);
        (bool ok,) = address(token)
            .call(abi.encodeWithSignature("forceTransfer(address,address,uint256)", address(core), alice, 1));
        assertFalse(ok);
        (ok,) = address(token).call(abi.encodeWithSignature("burn(address,uint256)", address(core), 1));
        assertFalse(ok);
        (ok,) = address(token).call(abi.encodeWithSignature("unprotect(address)", address(core)));
        assertFalse(ok);
        (ok,) = address(core).call(abi.encodeWithSignature("withdraw(uint256)", 1));
        assertFalse(ok);
        assertAccounting();
    }
}
