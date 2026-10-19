import { Panel } from "@/components/common";
export function About() {
  return (
    <div className="stack prose">
      <div className="eyebrow">TRANSPARENCY WITH CLEAR LIMITS</div>
      <h1>ຮ່ວມສ້າງອະນາຄົດ / How OpenFund works</h1>
      <Panel title="Choose the rules before giving">
        <p>
          Targeted funds have an exact goal and a 1–365 day duration. Donations
          stop at the goal or exact deadline. A failed REFUND fund lets each
          donor reclaim 100% from the original wallet indefinitely. KEEP_FUNDS
          becomes spendable under governance after its deadline. Continuous
          donations have no automatic failure-refund right.
        </p>
      </Panel>
      <Panel title="One donation, public governance">
        <p>
          Your wallet calls OFL transferAndCall with the official protocol
          address and encoded fund ID. The token transfer and isolated fund
          credit either both succeed or both revert. There is no prior allowance
          transaction.
        </p>
        <p>
          Managers propose exact actions. The fund’s named approvers vote on
          chain. Payouts execute after quorum; manager, approver, threshold,
          recipient and closure changes wait 24 hours. Approvals expire after 7
          days; approved actions have a separate 7-day execution window. Other
          proposals can spend the available balance first.
        </p>
      </Panel>
      <Panel title="Closing and key-loss risks">
        <p>
          Only governance can start closure. Deposits then stop permanently.
          Settlement payouts still need normal approvals. Anyone may finalize
          once balance and liabilities are zero. Refund entitlements cannot be
          swept or expired.
        </p>
        <p>
          1/1 funds allow one wallet to authorize spending. Multi-approval
          cannot prevent collusion or establish real-world charitable use. Lost
          approver keys may permanently lock funds. There is no admin override.
        </p>
      </Panel>
      <Panel title="Privacy, evidence and disputes">
        <p>
          All on-chain descriptions, addresses and document references are
          public and permanent. Never publish victims’, patients’ or
          beneficiaries’ private information. A document hash proves byte
          integrity, not truth. A CID does not guarantee storage availability.
        </p>
        <p>
          Official protocol membership is not charity identity verification.
          OpenFund does not arbitrate real-world disputes. Community due
          diligence and independent evidence remain necessary.
        </p>
      </Panel>
      <Panel title="Development system">
        <p>
          This is an unaudited local testnet demo. DEMO OFL is not backed by LAK
          or redeemable for fiat. Real issuance, reserve custody, compliance,
          redemption operations, public network deployment, persistent IPFS
          pinning and independent security audits remain external.
        </p>
        <p>
          The React app is static and client-only. RPC history scans can be
          incomplete, slow or limited by providers; filters apply to loaded
          records. A reachable RPC is required for public reads. Mobile wallets
          need an RPC reachable from the mobile device; phone localhost is not
          your development computer.
        </p>
      </Panel>
    </div>
  );
}
