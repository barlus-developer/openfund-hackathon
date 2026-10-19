// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {TestBase} from "./TestBase.sol";
import {IOpenFund as T} from "../src/interfaces/IOpenFund.sol";
import {OpenFund} from "../src/OpenFund.sol";

contract GovernanceTest is TestBase {
    function testQuorumsOneTwoAndThree() public {
        for (uint16 threshold = 1; threshold <= 3; threshold++) {
            T.CreateParams memory p = params(false, false);
            p.threshold = threshold;
            uint256 id = core.createFund(p, group(threshold == 3 ? 5 : threshold == 2 ? 3 : 1), new address[](0));
            donate(id, alice, 10 ether);
            uint256 pid = payout(id, 1 ether);
            core.approveProposal(pid);
            if (threshold >= 2) {
                vm.prank(second);
                core.approveProposal(pid);
            }
            if (threshold == 3) {
                vm.prank(third);
                core.approveProposal(pid);
            }
            core.executeProposal(pid);
            assertEq(core.getFundBalance(id), 9 ether);
        }
        assertAccounting();
    }

    function testRolesDuplicatesCancellationAndNoImplicitVote() public {
        T.CreateParams memory p = params(false, false);
        p.threshold = 2;
        uint256 id = core.createFund(p, group(3), new address[](0));
        donate(id, alice, 10 ether);
        T.Action memory a = action(T.ActionKind.PAYOUT, recipient, 1 ether, 0);
        vm.prank(alice);
        vm.expectRevert(OpenFund.Unauthorized.selector);
        core.createProposal(id, a);
        uint256 pid = core.createProposal(id, a);
        assertFalse(core.hasApproved(pid, address(this)));
        vm.prank(alice);
        vm.expectRevert(OpenFund.Unauthorized.selector);
        core.approveProposal(pid);
        core.approveProposal(pid);
        vm.expectRevert(OpenFund.DuplicateApproval.selector);
        core.approveProposal(pid);
        vm.expectRevert(OpenFund.ProposalUnavailable.selector);
        core.executeProposal(pid);
        core.cancelProposal(pid);
        assertEq(uint256(status(pid)), uint256(T.ProposalStatus.CANCELLED));
        vm.expectRevert(OpenFund.ProposalUnavailable.selector);
        core.approveProposal(pid);
    }

    function testTimelockRecoveryAndVersionInvalidation() public {
        uint256 id = create(false, false);
        donate(id, alice, 10 ether);
        uint256 old = payout(id, 1 ether);
        uint256 recovery = approved(id, action(T.ActionKind.CHANGE_MANAGER, bob, 0, 0));
        vm.expectRevert(OpenFund.ProposalUnavailable.selector);
        core.executeProposal(recovery);
        vm.warp(vm.getBlockTimestamp() + 1 days);
        core.executeProposal(recovery);
        assertEq(core.getFund(id).manager, bob);
        assertEq(uint256(status(old)), uint256(T.ProposalStatus.INVALIDATED));
        // An approver can recover a lost manager under the SAME existing threshold.
        uint256 next = approved(id, action(T.ActionKind.CHANGE_MANAGER, alice, 0, 0));
        vm.warp(vm.getBlockTimestamp() + 1 days);
        core.executeProposal(next);
        assertEq(core.getFund(id).manager, alice);
        vm.prank(recipient);
        vm.expectRevert(OpenFund.Unauthorized.selector);
        core.createProposal(id, action(T.ActionKind.CHANGE_MANAGER, bob, 0, 0));
    }

    function testSeparateApprovalAndExecutionWindows() public {
        uint256 id = create(false, false);
        donate(id, alice, 10 ether);
        uint256 expired = payout(id, 1 ether);
        vm.warp(vm.getBlockTimestamp() + 7 days);
        assertEq(uint256(status(expired)), uint256(T.ProposalStatus.EXPIRED));
        vm.expectRevert(OpenFund.ProposalUnavailable.selector);
        core.approveProposal(expired);
        uint256 pid = payout(id, 1 ether);
        vm.warp(vm.getBlockTimestamp() + 7 days - 1);
        core.approveProposal(pid);
        vm.warp(vm.getBlockTimestamp() + 7 days - 1);
        core.executeProposal(pid);
        uint256 last = approved(id, action(T.ActionKind.CHANGE_MANAGER, bob, 0, 0));
        vm.warp(vm.getBlockTimestamp() + 8 days);
        assertEq(uint256(status(last)), uint256(T.ProposalStatus.EXPIRED));
    }

    function testThresholdMinimumAndApproverChanges() public {
        T.CreateParams memory p = params(false, false);
        p.threshold = 2;
        p.minimumApprovalThreshold = 2;
        uint256 id = core.createFund(p, group(3), new address[](0));
        vm.expectRevert(OpenFund.InvalidAction.selector);
        core.createProposal(id, action(T.ActionKind.CHANGE_THRESHOLD, address(0), 0, 1));
        uint256 pid = core.createProposal(id, action(T.ActionKind.REMOVE_APPROVER, third, 0, 0));
        core.approveProposal(pid);
        vm.prank(second);
        core.approveProposal(pid);
        vm.warp(vm.getBlockTimestamp() + 1 days);
        core.executeProposal(pid);
        assertFalse(core.isApprover(id, third));
        vm.expectRevert(OpenFund.InvalidAction.selector);
        core.createProposal(id, action(T.ActionKind.REMOVE_APPROVER, second, 0, 0));
    }

    function testAllowlistChangesInvalidatePayoutsAndCannotFlipPolicy() public {
        T.CreateParams memory p = params(false, false);
        p.recipientPolicy = T.RecipientPolicy.ALLOWLIST;
        address[] memory r = new address[](1);
        r[0] = recipient;
        uint256 id = core.createFund(p, group(1), r);
        donate(id, alice, 20 ether);
        vm.expectRevert(OpenFund.InvalidAction.selector);
        core.createProposal(id, action(T.ActionKind.PAYOUT, bob, 1 ether, 0));
        uint256 old = payout(id, 1 ether);
        core.approveProposal(old);
        uint256 remove = approved(id, action(T.ActionKind.REMOVE_RECIPIENT, recipient, 0, 0));
        vm.warp(vm.getBlockTimestamp() + 1 days);
        core.executeProposal(remove);
        assertEq(uint256(status(old)), uint256(T.ProposalStatus.INVALIDATED));
        assertFalse(core.isAllowedRecipient(id, recipient));
        uint256 add = approved(id, action(T.ActionKind.ADD_RECIPIENT, bob, 0, 0));
        vm.warp(vm.getBlockTimestamp() + 1 days);
        core.executeProposal(add);
        assertTrue(core.isAllowedRecipient(id, bob));
    }

    function testConcurrentPayoutsCannotCrossSpendOrExecuteTwice() public {
        uint256 a = create(false, false);
        uint256 b = create(false, false);
        donate(a, alice, 10 ether);
        donate(b, bob, 100 ether);
        uint256 first = payout(a, 8 ether);
        uint256 next = payout(a, 8 ether);
        core.approveProposal(first);
        core.approveProposal(next);
        core.executeProposal(first);
        vm.expectRevert(OpenFund.InsufficientFundBalance.selector);
        core.executeProposal(next);
        vm.expectRevert(OpenFund.ProposalUnavailable.selector);
        core.executeProposal(first);
        assertEq(core.getFundBalance(b), 100 ether);
        assertAccounting();
    }

    function testProtectedRecipientAndFundraisingPayoutRejected() public {
        uint256 id = create(true, true);
        vm.expectRevert(OpenFund.InvalidAction.selector);
        payout(id, 1);
        uint256 active = create(false, false);
        vm.expectRevert(OpenFund.InvalidAction.selector);
        core.createProposal(active, action(T.ActionKind.PAYOUT, address(core), 1, 0));
        vm.expectRevert(OpenFund.InvalidAction.selector);
        core.createProposal(active, action(T.ActionKind.PAYOUT, address(0), 1, 0));
    }
}
