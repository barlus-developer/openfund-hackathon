// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {TestBase} from "./TestBase.sol";
import {Test} from "forge-std/Test.sol";
import {OFLToken} from "../src/OFLToken.sol";
import {OpenFund} from "../src/OpenFund.sol";
import {IOpenFund as T} from "../src/interfaces/IOpenFund.sol";

contract Handler is Test {
    OFLToken public token;
    OpenFund public core;
    address public manager;
    address[3] public donors;
    mapping(uint256 => bool) public executed;
    mapping(uint256 => mapping(address => uint256)) public refunded;
    bool public doubleExecution;
    bool public doubleRefund;
    bool public crossFundSpend;
    bool public unauthorizedSpend;
    bool public badDonation;

    constructor(OFLToken t, OpenFund c, address m, address a, address b) {
        token = t;
        core = c;
        manager = m;
        donors = [a, b, address(0xD0)];
    }

    function advance(uint32 seconds_) external {
        vm.warp(vm.getBlockTimestamp() + bound(seconds_, 0, 3 days));
    }

    function donate(uint256 seed, uint256 actor, uint96 raw) external {
        uint256 id = seed % 3 + 1;
        address donor = donors[actor % 3];
        uint256 value = bound(raw, 1, 500 ether);
        if (token.balanceOf(donor) < value) return;
        T.FundStatus beforeStatus = core.getEffectiveFundStatus(id);
        T.Fund memory f = core.getFund(id);
        vm.prank(donor);
        try token.transferAndCall(address(core), value, abi.encode(id)) {
            if (!(beforeStatus == T.FundStatus.FUNDRAISING
                        || (beforeStatus == T.FundStatus.ACTIVE && f.config.fundingMode == T.FundingMode.CONTINUOUS))) {
                badDonation = true;
            }
        } catch {}
    }

    function proposeAndPay(uint256 seed, uint96 raw) external {
        uint256 id = seed % 3 + 1;
        uint256 value = bound(raw, 1, 500 ether);
        T.Action memory a = T.Action(T.ActionKind.PAYOUT, address(0xBEEF), value, 0, "Supplies", "", bytes32(0));
        vm.prank(manager);
        try core.createProposal(id, a) returns (uint256 pid) {
            _approveAll(pid);
            _execute(pid);
        } catch {}
    }

    function executeAgain(uint256 seed) external {
        uint256 count = core.proposalCount();
        if (count > 0) _execute(seed % count + 1);
    }

    function _approveAll(uint256 pid) internal {
        (T.Proposal memory p,,,) = core.getProposal(pid);
        address[] memory members = core.getApprovers(p.fundId);
        uint16 threshold = core.getFund(p.fundId).threshold;
        for (uint256 i; i < threshold; i++) {
            vm.prank(members[i]);
            core.approveProposal(pid);
        }
    }

    function _execute(uint256 pid) internal {
        (T.Proposal memory p,,,) = core.getProposal(pid);
        uint256[3] memory beforeBalance;
        for (uint256 i; i < 3; i++) {
            beforeBalance[i] = core.getFundBalance(i + 1);
        }
        try core.executeProposal(pid) {
            if (executed[pid]) doubleExecution = true;
            executed[pid] = true;
            for (uint256 i; i < 3; i++) {
                if (i + 1 != p.fundId && beforeBalance[i] != core.getFundBalance(i + 1)) crossFundSpend = true;
            }
        } catch {}
    }

    function refund(uint256 seed, uint256 actor) external {
        uint256 id = seed % 3 + 1;
        address donor = donors[actor % 3];
        uint256 owed = core.getRefundableAmount(id, donor);
        uint256 raised = core.getFund(id).totalRaised;
        vm.prank(donor);
        try core.claimRefund(id) {
            refunded[id][donor] += owed;
            if (owed == 0 || refunded[id][donor] > raised) doubleRefund = true;
        } catch {}
    }

    function close(uint256 seed) external {
        uint256 id = seed % 3 + 1;
        vm.prank(manager);
        try core.createProposal(
            id, T.Action(T.ActionKind.START_CLOSURE, address(0), 0, 0, "Closure", "", bytes32(0))
        ) returns (
            uint256 pid
        ) {
            _approveAll(pid);
            vm.warp(vm.getBlockTimestamp() + 1 days);
            try core.executeProposal(pid) {} catch {}
        } catch {}
        try core.finalizeClose(id) {} catch {}
    }

    function governance(uint256 seed) external {
        uint256 id = seed % 3 + 1;
        // Recovery/governance shares the same quorum and invalidates old proposals.
        vm.prank(manager);
        try core.createProposal(
            id, T.Action(T.ActionKind.ADD_APPROVER, address(0xCAFE), 0, 0, "Recovery", "", bytes32(0))
        ) returns (
            uint256 pid
        ) {
            _approveAll(pid);
            vm.warp(vm.getBlockTimestamp() + 1 days);
            try core.executeProposal(pid) {} catch {}
        } catch {}
    }

    function attack(uint256 seed) external {
        uint256 beforeBalance = token.balanceOf(address(core));
        (bool ok,) = address(core).call(abi.encodeWithSignature("withdraw(uint256)", seed));
        if (ok || token.balanceOf(address(core)) != beforeBalance) unauthorizedSpend = true;
        // A donor/issuer is not automatically an approver.
        uint256 count = core.proposalCount();
        if (count > 0) {
            vm.prank(donors[0]);
            try core.approveProposal(seed % count + 1) {
                unauthorizedSpend = true;
            } catch {}
        }
    }
}

contract InvariantsTest is TestBase {
    Handler internal handler;

    function setUp() public override {
        super.setUp();
        T.CreateParams memory p = params(false, false);
        p.threshold = 2;
        p.minimumApprovalThreshold = 2;
        core.createFund(p, group(3), new address[](0));
        p = params(true, true);
        p.threshold = 3;
        p.minimumApprovalThreshold = 3;
        core.createFund(p, group(5), new address[](0));
        create(true, false);
        // The test deployer is an ordinary explicitly listed manager/approver; issuer gives no treasury rights.
        handler = new Handler(token, core, address(this), alice, bob);
        token.mint(address(0xD0), 1_000_000 ether);
        targetContract(address(handler));
        bytes4[] memory selectors = new bytes4[](9);
        selectors[0] = Handler.advance.selector;
        selectors[1] = Handler.donate.selector;
        selectors[2] = Handler.proposeAndPay.selector;
        selectors[3] = Handler.executeAgain.selector;
        selectors[4] = Handler.refund.selector;
        selectors[5] = Handler.close.selector;
        selectors[6] = Handler.governance.selector;
        selectors[7] = Handler.attack.selector;
        selectors[8] = Handler.donate.selector;
        targetSelector(FuzzSelector(address(handler), selectors));
    }

    function invariantFundAndGlobalAccounting() public view {
        assertAccounting();
    }

    function invariantNoDoubleExecutionOrCrossFundSpend() public view {
        assertFalse(handler.doubleExecution());
        assertFalse(handler.crossFundSpend());
    }

    function invariantNoRefundDoubleClaim() public view {
        assertFalse(handler.doubleRefund());
    }

    function invariantNoUnauthorizedDeployerTransfer() public view {
        assertFalse(handler.unauthorizedSpend());
    }

    function invariantNoDonationsOutsideFundingState() public view {
        assertFalse(handler.badDonation());
    }
}
