// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {TestBase} from "./TestBase.sol";
import {IOpenFund as T} from "../src/interfaces/IOpenFund.sol";
import {OpenFund} from "../src/OpenFund.sol";
import {OFLToken} from "../src/OFLToken.sol";
import {Receiver} from "./OFLToken.t.sol";

contract RefundClosureTest is TestBase {
    function testRefundTransferFailureRollsBackAndDisclosesRegistryGriefing() public {
        uint256 id = create(true, true);
        Receiver donor = new Receiver(address(token));
        token.mint(address(donor), 10 ether);
        donor.donateTo(address(core), id, 10 ether);
        // A compatible mimic donor is zero-balance and can be registered by the issuer.
        // This illustrates the residual registry authority: incoming refunds then fail.
        token.registerProtectedFund(address(donor));
        vm.warp(vm.getBlockTimestamp() + 1 days);
        vm.prank(address(donor));
        vm.expectRevert(OFLToken.ProtectedIngress.selector);
        core.claimRefund(id);
        assertEq(core.getRefundableAmount(id, address(donor)), 10 ether);
        assertEq(core.getFundBalance(id), 10 ether);
        assertEq(core.getFund(id).totalRefunded, 0);
        assertAccounting();
    }

    function testDeployerAndIssuerHaveNoRightsInOthersFund() public {
        T.CreateParams memory p = params(false, false);
        p.manager = alice;
        address[] memory a = new address[](1);
        a[0] = alice;
        uint256 id = core.createFund(p, a, new address[](0));
        donate(id, bob, 10 ether);
        T.Action memory spend = action(T.ActionKind.PAYOUT, recipient, 1 ether, 0);
        vm.expectRevert(OpenFund.Unauthorized.selector);
        core.createProposal(id, spend);
        vm.prank(alice);
        uint256 pid = core.createProposal(id, spend);
        vm.expectRevert(OpenFund.Unauthorized.selector);
        core.approveProposal(pid);
        vm.expectRevert(OpenFund.ProposalUnavailable.selector);
        core.executeProposal(pid);
        assertAccounting();
    }

    function testAggregatedRefundNoFeeNoExpiryAndNoForcedClose() public {
        uint256 id = create(true, true);
        donate(id, alice, 10 ether);
        donate(id, alice, 20 ether);
        donate(id, bob, 5 ether);
        vm.warp(vm.getBlockTimestamp() + 10 * 365 days);
        vm.expectRevert(OpenFund.OutstandingBalance.selector);
        core.finalizeClose(id);
        vm.prank(alice);
        core.claimRefund(id);
        assertEq(token.balanceOf(alice), 1_000_000 ether);
        assertEq(core.getFundBalance(id), 5 ether);
        vm.prank(alice);
        vm.expectRevert(OpenFund.NoRefund.selector);
        core.claimRefund(id);
        vm.prank(bob);
        core.claimRefund(id);
        core.finalizeClose(id);
        assertEq(uint256(core.getEffectiveFundStatus(id)), uint256(T.FundStatus.CLOSED));
        assertAccounting();
    }

    function testKeepAndContinuousNeverFailureRefund() public {
        uint256 a = create(true, false);
        uint256 b = create(false, false);
        donate(a, alice, 5 ether);
        donate(b, alice, 5 ether);
        vm.warp(vm.getBlockTimestamp() + 2 days);
        vm.startPrank(alice);
        vm.expectRevert(OpenFund.NoRefund.selector);
        core.claimRefund(a);
        vm.expectRevert(OpenFund.NoRefund.selector);
        core.claimRefund(b);
        vm.stopPrank();
    }

    function testGovernedClosureSettlementAndTerminalArchive() public {
        uint256 id = create(false, false);
        donate(id, alice, 10 ether);
        uint256 old = payout(id, 1 ether);
        uint256 close = approved(id, action(T.ActionKind.START_CLOSURE, address(0), 0, 0));
        vm.warp(vm.getBlockTimestamp() + 1 days);
        core.executeProposal(close);
        assertEq(uint256(status(old)), uint256(T.ProposalStatus.INVALIDATED));
        vm.expectRevert(OpenFund.InvalidDonation.selector);
        donate(id, bob, 1 ether);
        vm.expectRevert(OpenFund.OutstandingBalance.selector);
        core.finalizeClose(id);
        uint256 settle = payout(id, 10 ether);
        core.approveProposal(settle);
        core.executeProposal(settle);
        vm.prank(alice);
        core.finalizeClose(id);
        vm.expectRevert(OpenFund.InvalidState.selector);
        payout(id, 1);
        vm.expectRevert(OpenFund.InvalidState.selector);
        core.finalizeClose(id);
        assertAccounting();
    }

    function testReportsAndMetadataCannotChangeTermsOrMoney() public {
        uint256 id = create(false, false);
        donate(id, alice, 5 ether);
        bytes32 terms = core.getFund(id).config.termsHash;
        uint256 pid = payout(id, 1 ether);
        core.approveProposal(pid);
        core.executeProposal(pid);
        core.updateMetadata(id, "ipfs://metadata", keccak256("metadata"));
        core.publishReport(id, pid, "Equipment receipt", "ipfs://report", keccak256("report"));
        vm.prank(alice);
        vm.expectRevert(OpenFund.Unauthorized.selector);
        core.publishReport(id, pid, "False", "ipfs://false", keccak256("false"));
        assertEq(core.getFund(id).config.termsHash, terms);
        assertEq(core.getFundBalance(id), 4 ether);
        assertAccounting();
    }

    function testNewDeploymentCannotMoveOldFunds() public {
        uint256 old = create(false, false);
        donate(old, alice, 10 ether);
        OpenFund next = new OpenFund(address(token));
        token.registerProtectedFund(address(next));
        next.createFund(params(false, false), group(1), new address[](0));
        assertEq(next.getFundBalance(1), 0);
        assertEq(core.getFundBalance(old), 10 ether);
    }
}
