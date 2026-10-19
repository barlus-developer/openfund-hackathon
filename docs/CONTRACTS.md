# Compiled contract API

Generated from actual Foundry artifacts by `node scripts/contract-docs.mjs`. Exact tuple field names and error payloads are in generated ABI TypeScript and `IOpenFund.sol`. IDs begin at 1. Getters reject unknown fund/proposal IDs. All amounts are uint256 OFL base units (18 decimals).

## OpenFund

| Function | Mutability |
| --- | --- |
| `APPROVAL_WINDOW()` | view |
| `EXECUTION_WINDOW()` | view |
| `TIMELOCK()` | view |
| `approveProposal(uint256)` | nonpayable |
| `cancelProposal(uint256)` | nonpayable |
| `claimRefund(uint256)` | nonpayable |
| `createFund((uint8,uint8,uint8,uint256,uint64,uint16,uint16,bytes32,address,string,string,string,string,string),address[],address[])` | nonpayable |
| `createProposal(uint256,(uint8,address,uint256,uint16,string,string,bytes32))` | nonpayable |
| `deploymentChainId()` | view |
| `executeProposal(uint256)` | nonpayable |
| `finalizeClose(uint256)` | nonpayable |
| `fundCount()` | view |
| `getApprovers(uint256)` | view |
| `getEffectiveFundStatus(uint256)` | view |
| `getFund(uint256)` | view |
| `getFundBalance(uint256)` | view |
| `getGovernance(uint256)` | view |
| `getProposal(uint256)` | view |
| `getRefundableAmount(uint256,address)` | view |
| `hasApproved(uint256,address)` | view |
| `isAllowedRecipient(uint256,address)` | view |
| `isApprover(uint256,address)` | view |
| `isOpenFundProtocol()` | pure |
| `oflToken()` | view |
| `onTransferReceived(address,address,uint256,bytes)` | nonpayable |
| `proposalCount()` | view |
| `publishReport(uint256,uint256,string,string,bytes32)` | nonpayable |
| `totalAccountedOFL()` | view |
| `updateMetadata(uint256,string,bytes32)` | nonpayable |

Events (indexed fields are represented exactly in the ABI):

- `ApproverChanged(uint256,address,bool)`
- `DonationReceived(uint256,address,uint256,uint256)`
- `FundClosed(uint256)`
- `FundClosureStarted(uint256)`
- `FundCreated(uint256,address,address,string)`
- `FundGoalReached(uint256)`
- `FundMetadataUpdated(uint256,string,bytes32)`
- `GovernanceChanged(uint256,address,uint16,uint64)`
- `PayoutExecuted(uint256,uint256,address,uint256,bytes32)`
- `ProposalApproved(uint256,uint256,address,uint16)`
- `ProposalCancelled(uint256,uint256)`
- `ProposalCreated(uint256,uint256,address,uint8)`
- `ProposalExecuted(uint256,uint256)`
- `RecipientChanged(uint256,address,bool,uint64)`
- `RefundClaimed(uint256,address,uint256)`
- `ReportPublished(uint256,uint256,address,string,string,bytes32)`

Errors:

- `DuplicateApproval()`
- `InsufficientFundBalance()`
- `InvalidAction()`
- `InvalidConfig()`
- `InvalidDonation()`
- `InvalidState()`
- `NoRefund()`
- `OutstandingBalance()`
- `ProposalUnavailable()`
- `ReentrancyGuardReentrantCall()`
- `SafeERC20FailedOperation(address)`
- `Unauthorized()`
- `UnknownFund()`
- `UnknownProposal()`
- `UnprotectedProtocol()`

## OFLToken

| Function | Mutability |
| --- | --- |
| `allowance(address,address)` | view |
| `approve(address,uint256)` | nonpayable |
| `approveAndCall(address,uint256)` | nonpayable |
| `approveAndCall(address,uint256,bytes)` | nonpayable |
| `balanceOf(address)` | view |
| `burn(uint256)` | nonpayable |
| `decimals()` | view |
| `issuer()` | view |
| `mint(address,uint256)` | nonpayable |
| `name()` | view |
| `protectedFunds(address)` | view |
| `registerProtectedFund(address)` | nonpayable |
| `supportsInterface(bytes4)` | view |
| `symbol()` | view |
| `totalSupply()` | view |
| `transfer(address,uint256)` | nonpayable |
| `transferAndCall(address,uint256)` | nonpayable |
| `transferAndCall(address,uint256,bytes)` | nonpayable |
| `transferFrom(address,address,uint256)` | nonpayable |
| `transferFromAndCall(address,address,uint256,bytes)` | nonpayable |
| `transferFromAndCall(address,address,uint256)` | nonpayable |

Events (indexed fields are represented exactly in the ABI):

- `Approval(address,address,uint256)`
- `Burn(address,uint256)`
- `Mint(address,uint256)`
- `ProtectedFundRegistered(address,uint256)`
- `Transfer(address,address,uint256)`

Errors:

- `AlreadyProtected()`
- `ERC1363ApproveFailed(address,uint256)`
- `ERC1363InvalidReceiver(address)`
- `ERC1363InvalidSpender(address)`
- `ERC1363TransferFailed(address,uint256)`
- `ERC1363TransferFromFailed(address,address,uint256)`
- `ERC20InsufficientAllowance(address,uint256,uint256)`
- `ERC20InsufficientBalance(address,uint256,uint256)`
- `ERC20InvalidApprover(address)`
- `ERC20InvalidReceiver(address)`
- `ERC20InvalidSender(address)`
- `ERC20InvalidSpender(address)`
- `InvalidProtocol()`
- `ProtectedIngress()`
- `UnauthorizedIssuer()`

## Trust and deployment

OpenFund has no owner or platform administration. Its only immutable external asset is OFL. Creator is historical; per-fund manager/approvers authorize prescribed proposals. OFL issuer only mints to unprotected recipients and appends protected protocol registrations; it cannot move treasury assets. See SECURITY_MODEL.md.

Official deployment addresses and receipt-block hashes are generated in `deployments/official.json`. The React bundle imports the synchronized manifest. Version keys select exact chain/address/ABI combinations. New versions have separate treasuries; no forced migration exists.
