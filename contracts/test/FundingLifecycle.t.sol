// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {TestBase} from "./TestBase.sol";
import {IOpenFund as T} from "../src/interfaces/IOpenFund.sol";
import {OpenFund} from "../src/OpenFund.sol";

contract FundingLifecycleTest is TestBase {
    function testAtomicDonationAndGoalNeverReopensAfterPayout() public {
        uint256 id = create(true, true);
        donate(id, alice, 100 ether);
        assertEq(uint256(core.getEffectiveFundStatus(id)), uint256(T.FundStatus.ACTIVE));
        uint256 pid = payout(id, 10 ether);
        core.approveProposal(pid);
        core.executeProposal(pid);
        vm.expectRevert(OpenFund.InvalidDonation.selector);
        donate(id, bob, 1 ether);
        assertEq(core.getFund(id).totalRaised, 100 ether);
        assertAccounting();
    }

    function testZeroOverGoalUnknownAndMalformedRevertAtomically() public {
        uint256 id = create(true, true);
        vm.expectRevert(OpenFund.InvalidDonation.selector);
        donate(id, alice, 0);
        vm.expectRevert(OpenFund.InvalidDonation.selector);
        donate(id, alice, 101 ether);
        vm.expectRevert(OpenFund.UnknownFund.selector);
        donate(99, alice, 1 ether);
        assertEq(token.balanceOf(alice), 1_000_000 ether);
        assertEq(core.getFundBalance(id), 0);
        vm.expectRevert(OpenFund.Unauthorized.selector);
        core.onTransferReceived(alice, bob, 1 ether, abi.encode(id));
    }

    function testExactDeadlineAndPolicyDivergenceWithoutKeeper() public {
        uint256 a = create(true, true);
        uint256 b = create(true, false);
        donate(a, alice, 20 ether);
        donate(b, alice, 20 ether);
        vm.warp(core.getFund(a).config.deadline);
        vm.expectRevert(OpenFund.InvalidDonation.selector);
        donate(a, alice, 80 ether);
        assertEq(uint256(core.getEffectiveFundStatus(a)), uint256(T.FundStatus.REFUNDABLE));
        assertEq(uint256(core.getEffectiveFundStatus(b)), uint256(T.FundStatus.ACTIVE));
        assertEq(core.getRefundableAmount(a, alice), 20 ether);
        assertEq(core.getRefundableAmount(b, alice), 0);
        vm.expectRevert(OpenFund.InvalidState.selector);
        payout(a, 1 ether);
        uint256 pid = payout(b, 5 ether);
        core.approveProposal(pid);
        core.executeProposal(pid);
        assertAccounting();
    }

    function testContinuousHasNoFailureRefundAndAcceptsMultipleDonors() public {
        uint256 id = create(false, false);
        donate(id, alice, 1 ether);
        vm.warp(vm.getBlockTimestamp() + 500 days);
        donate(id, bob, 3 ether);
        assertEq(core.getRefundableAmount(id, alice), 0);
        assertEq(core.getFundBalance(id), 4 ether);
        assertAccounting();
    }

    function testCreationRejectsContradictionsAndBounds() public {
        T.CreateParams memory p = params(true, true);
        p.manager = address(0);
        reject(p, group(1));
        p = params(true, true);
        p.threshold = 0;
        reject(p, group(1));
        p = params(true, true);
        p.minimumApprovalThreshold = 2;
        reject(p, group(1));
        p = params(true, true);
        p.duration = 1 days - 1;
        reject(p, group(1));
        p.duration = 365 days + 1;
        reject(p, group(1));
        p = params(true, true);
        p.fundingGoal = 0;
        reject(p, group(1));
        p = params(false, false);
        p.duration = 1;
        reject(p, group(1));
        p = params(false, false);
        p.underfundingPolicy = T.UnderfundingPolicy.KEEP_FUNDS;
        reject(p, group(1));
        p = params(true, true);
        reject(p, new address[](0));
        reject(p, group(11));
        address[] memory a = group(2);
        a[1] = a[0];
        reject(p, a);
        a[1] = address(0);
        reject(p, a);
    }

    function reject(T.CreateParams memory p, address[] memory a) internal {
        vm.expectRevert(OpenFund.InvalidConfig.selector);
        core.createFund(p, a, new address[](0));
    }

    function testUnknownQueriesAndUnregisteredCreation() public {
        vm.expectRevert(OpenFund.UnknownFund.selector);
        core.getFund(0);
        vm.expectRevert(OpenFund.UnknownProposal.selector);
        core.getProposal(1);
        OpenFund other = new OpenFund(address(token));
        T.CreateParams memory p = params(false, false);
        address[] memory a = group(1);
        vm.expectRevert(OpenFund.UnprotectedProtocol.selector);
        other.createFund(p, a, new address[](0));
    }

    function testFuzzPreciseDonations(uint96 x, uint96 y) public {
        uint256 id = create(false, false);
        uint256 a = bound(x, 1, 1000 ether);
        uint256 b = bound(y, 1, 1000 ether);
        donate(id, alice, a);
        donate(id, bob, b);
        assertEq(core.getFundBalance(id), a + b);
        assertAccounting();
    }
}
