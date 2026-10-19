// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC1363Receiver} from "@openzeppelin/contracts/interfaces/IERC1363Receiver.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IOpenFund} from "./interfaces/IOpenFund.sol";

/// @notice One immutable, isolated ledger per fund ID. There is deliberately no protocol administrator.
contract OpenFund is IOpenFund, IERC1363Receiver, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error UnknownFund();
    error UnknownProposal();
    error InvalidConfig();
    error Unauthorized();
    error InvalidState();
    error InvalidDonation();
    error InvalidAction();
    error DuplicateApproval();
    error ProposalUnavailable();
    error InsufficientFundBalance();
    error NoRefund();
    error OutstandingBalance();
    error UnprotectedProtocol();

    address public immutable oflToken;
    uint256 public immutable deploymentChainId;
    uint256 public fundCount;
    uint256 public proposalCount;
    uint256 public totalAccountedOFL;
    uint64 public constant APPROVAL_WINDOW = 7 days;
    uint64 public constant EXECUTION_WINDOW = 7 days;
    uint64 public constant TIMELOCK = 1 days;

    mapping(uint256 => Fund) private funds;
    mapping(uint256 => address[]) private approvers;
    mapping(uint256 => mapping(address => bool)) private approverMember;
    mapping(uint256 => mapping(address => bool)) private recipients;
    mapping(uint256 => mapping(address => uint256)) private contributions;
    mapping(uint256 => Proposal) private proposals;
    mapping(uint256 => mapping(address => bool)) private votes;

    event FundCreated(uint256 indexed fundId, address indexed creator, address indexed manager, string title);
    event FundMetadataUpdated(uint256 indexed fundId, string uri, bytes32 contentHash);
    event DonationReceived(uint256 indexed fundId, address indexed donor, uint256 amount, uint256 totalRaised);
    event FundGoalReached(uint256 indexed fundId);
    event FundClosureStarted(uint256 indexed fundId);
    event FundClosed(uint256 indexed fundId);
    event ProposalCreated(
        uint256 indexed fundId, uint256 indexed proposalId, address indexed proposer, ActionKind kind
    );
    event ProposalApproved(
        uint256 indexed fundId, uint256 indexed proposalId, address indexed approver, uint16 approvals
    );
    event ProposalCancelled(uint256 indexed fundId, uint256 indexed proposalId);
    event ProposalExecuted(uint256 indexed fundId, uint256 indexed proposalId);
    event GovernanceChanged(uint256 indexed fundId, address indexed manager, uint16 threshold, uint64 version);
    event ApproverChanged(uint256 indexed fundId, address indexed approver, bool added);
    event RecipientChanged(uint256 indexed fundId, address indexed recipient, bool added, uint64 version);
    event PayoutExecuted(
        uint256 indexed fundId,
        uint256 indexed proposalId,
        address indexed recipient,
        uint256 amount,
        bytes32 purposeHash
    );
    event RefundClaimed(uint256 indexed fundId, address indexed donor, uint256 amount);
    event ReportPublished(
        uint256 indexed fundId,
        uint256 indexed proposalId,
        address indexed author,
        string title,
        string contentURI,
        bytes32 contentHash
    );

    constructor(address token) {
        if (token.code.length == 0) revert InvalidConfig();
        oflToken = token;
        deploymentChainId = block.chainid;
    }

    function isOpenFundProtocol() external pure returns (bool) {
        return true;
    }

    function createFund(
        CreateParams calldata p,
        address[] calldata initialApprovers,
        address[] calldata initialRecipients
    ) external nonReentrant returns (uint256 id) {
        // Registration is mandatory BEFORE any fund can accept a donation.
        (bool ok, bytes memory result) =
            oflToken.staticcall(abi.encodeWithSignature("protectedFunds(address)", address(this)));
        if (!ok || result.length != 32 || !abi.decode(result, (bool))) revert UnprotectedProtocol();
        uint256 count = initialApprovers.length;
        if (
            p.manager == address(0) || count == 0 || count > 10 || p.minimumApprovalThreshold == 0
                || p.minimumApprovalThreshold > p.threshold || p.threshold > count || p.termsHash == bytes32(0)
                || bytes(p.title).length == 0 || bytes(p.title).length > 120 || bytes(p.summary).length > 600
                || bytes(p.category).length > 64 || bytes(p.metadataURI).length > 300 || bytes(p.termsURI).length > 300
        ) revert InvalidConfig();
        uint64 deadline;
        if (p.fundingMode == FundingMode.TARGETED) {
            if (p.fundingGoal == 0 || p.duration < 1 days || p.duration > 365 days) revert InvalidConfig();
            deadline = uint64(block.timestamp) + p.duration;
        } else if (p.fundingGoal != 0 || p.duration != 0 || p.underfundingPolicy != UnderfundingPolicy.REFUND) {
            revert InvalidConfig();
        }
        if (
            initialRecipients.length > 100
                || (p.recipientPolicy == RecipientPolicy.OPEN && initialRecipients.length != 0)
        ) revert InvalidConfig();
        id = ++fundCount;
        Fund storage f = funds[id];
        f.config = FundConfig(
            p.fundingMode,
            p.underfundingPolicy,
            p.recipientPolicy,
            p.fundingGoal,
            deadline,
            p.minimumApprovalThreshold,
            p.termsHash
        );
        f.creator = msg.sender;
        f.manager = p.manager;
        f.title = p.title;
        f.summary = p.summary;
        f.category = p.category;
        f.metadataURI = p.metadataURI;
        f.termsURI = p.termsURI;
        f.createdAt = uint64(block.timestamp);
        f.governanceVersion = 1;
        f.recipientRulesVersion = 1;
        f.threshold = p.threshold;
        emit FundCreated(id, msg.sender, p.manager, p.title);
        for (uint256 i; i < count; ++i) {
            address a = initialApprovers[i];
            if (a == address(0) || approverMember[id][a]) revert InvalidConfig();
            approvers[id].push(a);
            approverMember[id][a] = true;
            emit ApproverChanged(id, a, true);
        }
        for (uint256 i; i < initialRecipients.length; ++i) {
            address a = initialRecipients[i];
            if (!_validRecipient(a) || recipients[id][a]) revert InvalidConfig();
            recipients[id][a] = true;
            emit RecipientChanged(id, a, true, 1);
        }
        emit GovernanceChanged(id, p.manager, p.threshold, 1);
    }

    function getFund(uint256 id) external view returns (Fund memory) {
        return _fund(id);
    }

    function getFundBalance(uint256 id) external view returns (uint256) {
        return _fund(id).balance;
    }

    function getGovernance(uint256 id)
        external
        view
        returns (uint16 threshold, uint16 minimum, uint64 version, uint64 recipientVersion)
    {
        Fund storage f = _fund(id);
        return (f.threshold, f.config.minimumApprovalThreshold, f.governanceVersion, f.recipientRulesVersion);
    }

    function getApprovers(uint256 id) external view returns (address[] memory) {
        _fund(id);
        return approvers[id];
    }

    function isApprover(uint256 id, address a) external view returns (bool) {
        _fund(id);
        return approverMember[id][a];
    }

    function isAllowedRecipient(uint256 id, address a) external view returns (bool) {
        Fund storage f = _fund(id);
        return _validRecipient(a) && (f.config.recipientPolicy == RecipientPolicy.OPEN || recipients[id][a]);
    }

    function getEffectiveFundStatus(uint256 id) public view returns (FundStatus) {
        Fund storage f = _fund(id);
        if (f.closed) return FundStatus.CLOSED;
        if (f.closing) return FundStatus.CLOSING;
        if (f.config.fundingMode == FundingMode.CONTINUOUS || f.totalRaised == f.config.fundingGoal) {
            return FundStatus.ACTIVE;
        }
        if (block.timestamp < f.config.deadline) return FundStatus.FUNDRAISING;
        return f.config.underfundingPolicy == UnderfundingPolicy.REFUND ? FundStatus.REFUNDABLE : FundStatus.ACTIVE;
    }

    function onTransferReceived(address, address from, uint256 amount, bytes calldata data)
        external
        nonReentrant
        returns (bytes4)
    {
        if (msg.sender != oflToken) revert Unauthorized();
        if (data.length != 32 || amount == 0 || from == address(0)) revert InvalidDonation();
        uint256 id = abi.decode(data, (uint256));
        Fund storage f = _fund(id);
        FundStatus status = getEffectiveFundStatus(id);
        if (f.config.fundingMode == FundingMode.TARGETED) {
            if (status != FundStatus.FUNDRAISING || amount > f.config.fundingGoal - f.totalRaised) {
                revert InvalidDonation();
            }
        } else if (status != FundStatus.ACTIVE) {
            revert InvalidDonation();
        }
        f.balance += amount;
        f.totalRaised += amount;
        totalAccountedOFL += amount;
        if (f.config.fundingMode == FundingMode.TARGETED && f.config.underfundingPolicy == UnderfundingPolicy.REFUND) {
            contributions[id][from] += amount;
        }
        emit DonationReceived(id, from, amount, f.totalRaised);
        if (f.config.fundingMode == FundingMode.TARGETED && f.totalRaised == f.config.fundingGoal) {
            emit FundGoalReached(id);
        }
        return IERC1363Receiver.onTransferReceived.selector;
    }

    function createProposal(uint256 id, Action calldata action) external nonReentrant returns (uint256 pid) {
        Fund storage f = _fund(id);
        bool recovery = action.kind == ActionKind.CHANGE_MANAGER || action.kind == ActionKind.ADD_APPROVER
            || action.kind == ActionKind.REMOVE_APPROVER || action.kind == ActionKind.CHANGE_THRESHOLD;
        if (msg.sender != f.manager && !(recovery && approverMember[id][msg.sender])) revert Unauthorized();
        _validateAction(id, action);
        pid = ++proposalCount;
        Proposal storage p = proposals[pid];
        p.fundId = id;
        p.proposer = msg.sender;
        p.action = action;
        p.createdAt = uint64(block.timestamp);
        p.governanceVersion = f.governanceVersion;
        p.recipientRulesVersion = f.recipientRulesVersion;
        emit ProposalCreated(id, pid, msg.sender, action.kind);
    }

    function approveProposal(uint256 pid) external nonReentrant {
        Proposal storage p = _proposal(pid);
        if (!approverMember[p.fundId][msg.sender]) revert Unauthorized();
        if (_proposalStatus(p) != ProposalStatus.PENDING || block.timestamp >= p.createdAt + APPROVAL_WINDOW) {
            revert ProposalUnavailable();
        }
        if (votes[pid][msg.sender]) revert DuplicateApproval();
        votes[pid][msg.sender] = true;
        ++p.approvals;
        if (p.approvals == funds[p.fundId].threshold) p.approvedAt = uint64(block.timestamp);
        emit ProposalApproved(p.fundId, pid, msg.sender, p.approvals);
    }

    function executeProposal(uint256 pid) external nonReentrant {
        Proposal storage p = _proposal(pid);
        if (_proposalStatus(p) != ProposalStatus.EXECUTABLE) revert ProposalUnavailable();
        _validateAction(p.fundId, p.action);
        Fund storage f = funds[p.fundId];
        Action storage a = p.action;
        p.executed = true;
        if (a.kind == ActionKind.PAYOUT) {
            if (a.amount > f.balance) revert InsufficientFundBalance();
            f.balance -= a.amount;
            f.totalWithdrawn += a.amount;
            totalAccountedOFL -= a.amount;
            IERC20(oflToken).safeTransfer(a.target, a.amount);
            emit PayoutExecuted(p.fundId, pid, a.target, a.amount, keccak256(bytes(a.purpose)));
        } else if (a.kind == ActionKind.ADD_RECIPIENT || a.kind == ActionKind.REMOVE_RECIPIENT) {
            bool add = a.kind == ActionKind.ADD_RECIPIENT;
            recipients[p.fundId][a.target] = add;
            ++f.recipientRulesVersion;
            emit RecipientChanged(p.fundId, a.target, add, f.recipientRulesVersion);
        } else {
            if (a.kind == ActionKind.CHANGE_MANAGER) {
                f.manager = a.target;
            } else if (a.kind == ActionKind.CHANGE_THRESHOLD) {
                f.threshold = a.value;
            } else if (a.kind == ActionKind.ADD_APPROVER) {
                approvers[p.fundId].push(a.target);
                approverMember[p.fundId][a.target] = true;
                emit ApproverChanged(p.fundId, a.target, true);
            } else if (a.kind == ActionKind.REMOVE_APPROVER) {
                address[] storage list = approvers[p.fundId];
                for (uint256 i; i < list.length; ++i) {
                    if (list[i] == a.target) {
                        list[i] = list[list.length - 1];
                        list.pop();
                        break;
                    }
                }
                approverMember[p.fundId][a.target] = false;
                emit ApproverChanged(p.fundId, a.target, false);
            } else if (a.kind == ActionKind.START_CLOSURE) {
                f.closing = true;
                emit FundClosureStarted(p.fundId);
            }
            ++f.governanceVersion;
            emit GovernanceChanged(p.fundId, f.manager, f.threshold, f.governanceVersion);
        }
        emit ProposalExecuted(p.fundId, pid);
    }

    function cancelProposal(uint256 pid) external nonReentrant {
        Proposal storage p = _proposal(pid);
        if (msg.sender != p.proposer && msg.sender != funds[p.fundId].manager) revert Unauthorized();
        ProposalStatus s = _proposalStatus(p);
        if (s != ProposalStatus.PENDING && s != ProposalStatus.TIMELOCKED && s != ProposalStatus.EXECUTABLE) {
            revert ProposalUnavailable();
        }
        p.cancelled = true;
        emit ProposalCancelled(p.fundId, pid);
    }

    function getProposal(uint256 pid)
        external
        view
        returns (Proposal memory proposal, ProposalStatus status, uint64 executableAt, uint64 expiresAt)
    {
        Proposal storage p = _proposal(pid);
        executableAt = p.approvedAt == 0 ? 0 : p.approvedAt + (p.action.kind == ActionKind.PAYOUT ? 0 : TIMELOCK);
        expiresAt = p.approvedAt == 0 ? p.createdAt + APPROVAL_WINDOW : executableAt + EXECUTION_WINDOW;
        return (p, _proposalStatus(p), executableAt, expiresAt);
    }

    function hasApproved(uint256 pid, address a) external view returns (bool) {
        _proposal(pid);
        return votes[pid][a];
    }

    function getRefundableAmount(uint256 id, address donor) public view returns (uint256) {
        return getEffectiveFundStatus(id) == FundStatus.REFUNDABLE ? contributions[id][donor] : 0;
    }

    function claimRefund(uint256 id) external nonReentrant {
        uint256 amount = getRefundableAmount(id, msg.sender);
        if (amount == 0) revert NoRefund();
        Fund storage f = funds[id];
        contributions[id][msg.sender] = 0;
        f.balance -= amount;
        f.totalRefunded += amount;
        totalAccountedOFL -= amount;
        IERC20(oflToken).safeTransfer(msg.sender, amount);
        emit RefundClaimed(id, msg.sender, amount);
    }

    function finalizeClose(uint256 id) external nonReentrant {
        Fund storage f = _fund(id);
        FundStatus s = getEffectiveFundStatus(id);
        if (s != FundStatus.CLOSING && s != FundStatus.REFUNDABLE) revert InvalidState();
        if (f.balance != 0) revert OutstandingBalance();
        // There are no reserved proposals. At zero balance no positive payout is executable.
        // Closing invalidates all proposals in O(1); no unbounded obligation scan is required.
        f.closed = true;
        ++f.governanceVersion;
        emit FundClosed(id);
    }

    function updateMetadata(uint256 id, string calldata uri, bytes32 contentHash) external nonReentrant {
        Fund storage f = _fund(id);
        if (msg.sender != f.manager) revert Unauthorized();
        if (f.closed || bytes(uri).length > 300) revert InvalidState();
        f.metadataURI = uri;
        f.metadataHash = contentHash;
        emit FundMetadataUpdated(id, uri, contentHash);
    }

    function publishReport(uint256 id, uint256 pid, string calldata title, string calldata uri, bytes32 contentHash)
        external
        nonReentrant
    {
        Fund storage f = _fund(id);
        if (msg.sender != f.manager) revert Unauthorized();
        if (
            bytes(title).length == 0 || bytes(title).length > 160 || bytes(uri).length == 0 || bytes(uri).length > 300
                || contentHash == bytes32(0)
        ) revert InvalidConfig();
        if (pid != 0) {
            Proposal storage p = _proposal(pid);
            if (p.fundId != id || !p.executed || p.action.kind != ActionKind.PAYOUT) revert InvalidAction();
        }
        emit ReportPublished(id, pid, msg.sender, title, uri, contentHash);
    }

    function _fund(uint256 id) internal view returns (Fund storage f) {
        if (id == 0 || id > fundCount) revert UnknownFund();
        return funds[id];
    }

    function _proposal(uint256 pid) internal view returns (Proposal storage p) {
        if (pid == 0 || pid > proposalCount) revert UnknownProposal();
        return proposals[pid];
    }

    function _validRecipient(address a) internal view returns (bool) {
        if (a == address(0) || a == address(this)) return false;
        (bool ok, bytes memory data) = oflToken.staticcall(abi.encodeWithSignature("protectedFunds(address)", a));
        return ok && data.length == 32 && !abi.decode(data, (bool));
    }

    function _validateAction(uint256 id, Action memory a) internal view {
        Fund storage f = funds[id];
        FundStatus s = getEffectiveFundStatus(id);
        if (s == FundStatus.REFUNDABLE || s == FundStatus.CLOSED) revert InvalidState();
        if (bytes(a.purpose).length > 240 || bytes(a.evidenceURI).length > 300) revert InvalidAction();
        if (a.kind == ActionKind.PAYOUT) {
            if (
                (s != FundStatus.ACTIVE && s != FundStatus.CLOSING) || a.amount == 0 || !_validRecipient(a.target)
                    || bytes(a.purpose).length == 0 || a.value != 0
                    || (f.config.recipientPolicy == RecipientPolicy.ALLOWLIST && !recipients[id][a.target])
            ) revert InvalidAction();
        } else {
            if (a.amount != 0) revert InvalidAction();
            if (a.kind != ActionKind.CHANGE_THRESHOLD && a.value != 0) revert InvalidAction();
            if (a.kind == ActionKind.CHANGE_MANAGER) {
                if (a.target == address(0) || a.target == f.manager) revert InvalidAction();
            } else if (a.kind == ActionKind.ADD_APPROVER) {
                if (a.target == address(0) || approverMember[id][a.target] || approvers[id].length >= 10) {
                    revert InvalidAction();
                }
            } else if (a.kind == ActionKind.REMOVE_APPROVER) {
                if (!approverMember[id][a.target] || approvers[id].length <= f.threshold) revert InvalidAction();
            } else if (a.kind == ActionKind.CHANGE_THRESHOLD) {
                if (
                    a.target != address(0) || a.value < f.config.minimumApprovalThreshold
                        || a.value > approvers[id].length || a.value == f.threshold
                ) revert InvalidAction();
            } else if (a.kind == ActionKind.ADD_RECIPIENT || a.kind == ActionKind.REMOVE_RECIPIENT) {
                if (
                    f.config.recipientPolicy != RecipientPolicy.ALLOWLIST || !_validRecipient(a.target)
                        || recipients[id][a.target] == (a.kind == ActionKind.ADD_RECIPIENT)
                ) revert InvalidAction();
            } else if (a.kind == ActionKind.START_CLOSURE) {
                if (a.target != address(0) || s != FundStatus.ACTIVE) revert InvalidAction();
            }
        }
    }

    function _proposalStatus(Proposal storage p) internal view returns (ProposalStatus) {
        if (p.executed) return ProposalStatus.EXECUTED;
        if (p.cancelled) return ProposalStatus.CANCELLED;
        Fund storage f = funds[p.fundId];
        FundStatus s = getEffectiveFundStatus(p.fundId);
        if (
            f.closed || s == FundStatus.REFUNDABLE || p.governanceVersion != f.governanceVersion
                || (p.action.kind == ActionKind.PAYOUT && p.recipientRulesVersion != f.recipientRulesVersion)
        ) return ProposalStatus.INVALIDATED;
        if (p.approvedAt == 0) {
            return block.timestamp >= p.createdAt + APPROVAL_WINDOW ? ProposalStatus.EXPIRED : ProposalStatus.PENDING;
        }
        uint64 ready = p.approvedAt + (p.action.kind == ActionKind.PAYOUT ? 0 : TIMELOCK);
        if (block.timestamp >= ready + EXECUTION_WINDOW) return ProposalStatus.EXPIRED;
        if (block.timestamp < ready) return ProposalStatus.TIMELOCKED;
        return ProposalStatus.EXECUTABLE;
    }
}
