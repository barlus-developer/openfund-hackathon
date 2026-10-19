import { deployments, chainFor, defaultDeployment } from "@/web3/deployments";
import { Panel, Notice, EmptyState } from "@/components/common";
export function Protocol() {
  return (
    <div className="stack prose">
      <div className="eyebrow">CANONICAL IDENTITY</div>
      <h1>Official deployments</h1>
      <Notice>
        Official membership means the configured chain ID + OpenFund address +
        existing fund ID. Official membership does not verify a charity’s
        identity.
      </Notice>
      {deployments.length ? (
        deployments.map((d) => (
          <Panel key={d.version} title={`${d.version} · ${d.name}`}>
            <dl className="data-list">
              <dt>Chain ID</dt>
              <dd>{d.chainId}</dd>
              <dt>OpenFund</dt>
              <dd>
                <code>{d.openFundAddress}</code>
              </dd>
              <dt>OFL</dt>
              <dd>
                <code>{d.oflTokenAddress}</code>
              </dd>
              <dt>Deployment block</dt>
              <dd>
                {d.deploymentBlock}
                <code className="hash">{d.deploymentBlockHash}</code>
              </dd>
              <dt>RPC</dt>
              <dd>{chainFor(d).rpcUrls.default.http.join(", ")}</dd>
              <dt>Network</dt>
              <dd>
                {chainFor(d).testnet
                  ? "Development / testnet"
                  : "Public network"}{" "}
                · Gas: {chainFor(d).nativeCurrency.symbol} ·{" "}
                {d.confirmations ?? (d.chainId === 31337 ? 1 : 2)}{" "}
                confirmation(s)
                {d.version === defaultDeployment?.version
                  ? " · Selected default"
                  : ""}
              </dd>
              <dt>Mode</dt>
              <dd>
                {d.demoMode
                  ? "DEMO OFL / NOT FIAT-BACKED"
                  : "Experimental protocol; verify deployment parameters"}
              </dd>
              <dt>Source verification</dt>
              <dd>
                {d.explorerUrl ? (
                  <a
                    href={`${d.explorerUrl}/address/${d.openFundAddress}#code`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Explorer source ↗ (check verification status)
                  </a>
                ) : (
                  "Repository source: contracts/src/OpenFund.sol and OFLToken.sol. No public explorer verification claimed."
                )}
              </dd>
            </dl>
          </Panel>
        ))
      ) : (
        <EmptyState description="No deployment yet. Run the local deployment script; addresses are never guessed." />
      )}
      <Panel title="Immutable treasury, separate token issuer">
        <p>
          OpenFund has no owner, proxy, upgrade, generic call, admin sweep or
          platform-controlled closure. Each version is a different contract
          address; previous fund IDs and treasuries remain independent.
        </p>
        <p>
          The immutable token issuer may mint to unprotected wallets and append
          protected protocol addresses. It cannot seize or burn holder or fund
          balances. Registration requires contract code and a token/chain
          handshake, but a malicious issuer can register a mimic and restrict
          incoming transfers to that mimic.
        </p>
        <p>
          OFL has 18 decimals. The 1 OFL ≈ 1 LAK reference is an economic
          target, not proof of reserves, a market peg or redemption. Local OFL
          is not fiat-backed.
        </p>
      </Panel>
    </div>
  );
}
