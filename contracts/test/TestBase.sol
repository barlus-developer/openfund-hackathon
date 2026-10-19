// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {Test} from "forge-std/Test.sol";
import {OFLToken} from "../src/OFLToken.sol";
import {OpenFund} from "../src/OpenFund.sol";
import {IOpenFund as T} from "../src/interfaces/IOpenFund.sol";

abstract contract TestBase is Test {
    OFLToken internal token;
    OpenFund internal core;
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal recipient = makeAddr("recipient");
    address internal second = makeAddr("approver2");
    address internal third = makeAddr("approver3");

    function setUp() public virtual {
        vm.warp(1_800_000_000);
        token = new OFLToken(address(this));
        core = new OpenFund(address(token));
        token.registerProtectedFund(address(core));
        token.mint(alice, 1_000_000 ether);
        token.mint(bob, 1_000_000 ether);
    }

    function params(bool targeted, bool refund) internal view returns (T.CreateParams memory p) {
        p = T.CreateParams({
            fundingMode: targeted ? T.FundingMode.TARGETED : T.FundingMode.CONTINUOUS,
            underfundingPolicy: targeted && !refund ? T.UnderfundingPolicy.KEEP_FUNDS : T.UnderfundingPolicy.REFUND,
            recipientPolicy: T.RecipientPolicy.OPEN,
            fundingGoal: targeted ? 100 ether : 0,
            duration: targeted ? 1 days : 0,
            threshold: 1,
            minimumApprovalThreshold: 1,
            termsHash: keccak256("immutable terms"),
            manager: address(this),
            title: "Community health",
            summary: "Public equipment funding",
            category: "Healthcare",
            metadataURI: "",
            termsURI: ""
        });
    }

    function group(uint256 n) internal view returns (address[] memory a) {
        a = new address[](n);
        a[0] = address(this);
        if (n > 1) a[1] = second;
        if (n > 2) a[2] = third;
        for (uint256 i = 3; i < n; i++) {
            a[i] = address(uint160(i + 100));
        }
    }

    function create(bool targeted, bool refund) internal returns (uint256) {
        return core.createFund(params(targeted, refund), group(1), new address[](0));
    }

    function donate(uint256 id, address donor, uint256 amount) internal {
        vm.prank(donor);
        token.transferAndCall(address(core), amount, abi.encode(id));
    }

    function action(T.ActionKind kind, address target, uint256 amount, uint16 value)
        internal
        pure
        returns (T.Action memory)
    {
        return T.Action(kind, target, amount, value, "Community supplies", "ipfs://evidence", keccak256("evidence"));
    }

    function payout(uint256 id, uint256 amount) internal returns (uint256) {
        return core.createProposal(id, action(T.ActionKind.PAYOUT, recipient, amount, 0));
    }

    function approved(uint256 id, T.Action memory a) internal returns (uint256 pid) {
        pid = core.createProposal(id, a);
        core.approveProposal(pid);
    }

    function status(uint256 pid) internal view returns (T.ProposalStatus s) {
        (, s,,) = core.getProposal(pid);
    }

    function assertAccounting() internal view {
        uint256 sum;
        for (uint256 i = 1; i <= core.fundCount(); i++) {
            T.Fund memory f = core.getFund(i);
            assertEq(f.balance, f.totalRaised - f.totalWithdrawn - f.totalRefunded);
            sum += f.balance;
        }
        assertEq(sum, core.totalAccountedOFL());
        assertGe(token.balanceOf(address(core)), sum);
    }
}
