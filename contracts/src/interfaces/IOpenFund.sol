// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface IOpenFund {
    enum FundingMode {
        TARGETED,
        CONTINUOUS
    }
    enum UnderfundingPolicy {
        REFUND,
        KEEP_FUNDS
    }
    enum RecipientPolicy {
        OPEN,
        ALLOWLIST
    }
    enum FundStatus {
        FUNDRAISING,
        ACTIVE,
        REFUNDABLE,
        CLOSING,
        CLOSED
    }
    enum ActionKind {
        PAYOUT,
        CHANGE_MANAGER,
        ADD_APPROVER,
        REMOVE_APPROVER,
        CHANGE_THRESHOLD,
        ADD_RECIPIENT,
        REMOVE_RECIPIENT,
        START_CLOSURE
    }
    enum ProposalStatus {
        PENDING,
        TIMELOCKED,
        EXECUTABLE,
        EXECUTED,
        CANCELLED,
        EXPIRED,
        INVALIDATED
    }

    struct CreateParams {
        FundingMode fundingMode;
        UnderfundingPolicy underfundingPolicy;
        RecipientPolicy recipientPolicy;
        uint256 fundingGoal;
        uint64 duration;
        uint16 threshold;
        uint16 minimumApprovalThreshold;
        bytes32 termsHash;
        address manager;
        string title;
        string summary;
        string category;
        string metadataURI;
        string termsURI;
    }

    struct FundConfig {
        FundingMode fundingMode;
        UnderfundingPolicy underfundingPolicy;
        RecipientPolicy recipientPolicy;
        uint256 fundingGoal;
        uint64 deadline;
        uint16 minimumApprovalThreshold;
        bytes32 termsHash;
    }

    struct Fund {
        FundConfig config;
        address creator;
        address manager;
        string title;
        string summary;
        string category;
        string metadataURI;
        string termsURI;
        bytes32 metadataHash;
        uint256 balance;
        uint256 totalRaised;
        uint256 totalWithdrawn;
        uint256 totalRefunded;
        uint64 createdAt;
        uint64 governanceVersion;
        uint64 recipientRulesVersion;
        uint16 threshold;
        bool closing;
        bool closed;
    }

    struct Action {
        ActionKind kind;
        address target;
        uint256 amount;
        uint16 value;
        string purpose;
        string evidenceURI;
        bytes32 evidenceHash;
    }

    struct Proposal {
        uint256 fundId;
        address proposer;
        Action action;
        uint64 createdAt;
        uint64 approvedAt;
        uint64 governanceVersion;
        uint64 recipientRulesVersion;
        uint16 approvals;
        bool executed;
        bool cancelled;
    }

    function isOpenFundProtocol() external pure returns (bool);
    function oflToken() external view returns (address);
    function deploymentChainId() external view returns (uint256);
}
