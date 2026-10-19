import { useState } from "react";
import { useConnection } from "wagmi";
import { encodeFunctionData } from "viem";
import { useFundContext } from "@/features/funds/FundLayout";
import { useActivity } from "@/hooks/useActivity";
import { useTransaction } from "@/hooks/useTransaction";
import { openFundAbi } from "@/web3/generated/OpenFund";
import { FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  Panel,
  Notice,
  TextField,
  EmptyState,
  ErrorNotice,
  TxFeedback,
  TxHash,
} from "@/components/common";
import { ScanControls } from "@/features/transparency/Activity";
import { contentURL, normalizeContentURI, verifyContent } from "@/lib/ipfs";
import { IPFSUpload } from "./IPFSUpload";
import { useLanguage } from "@/app/i18n";
import type { Activity } from "@/web3/events";
import type { Deployment } from "@/web3/deployments";
export function Reports() {
  const { d, row } = useFundContext(),
    q = useActivity(d),
    c = useConnection(),
    tx = useTransaction(d),
    { t } = useLanguage();
  const [title, setTitle] = useState(""),
    [uri, setURI] = useState(""),
    [hash, setHash] = useState(""),
    [pid, setPid] = useState("0"),
    [error, setError] = useState<unknown>();
  const reports = q.events
    .filter(
      (e) => e.eventName === "ReportPublished" && e.args.fundId === row.id,
    )
    .reverse();
  const manager = c.address?.toLowerCase() === row.fund.manager.toLowerCase();
  async function publish() {
    setError(undefined);
    try {
      const normalizedURI = normalizeContentURI(uri);
      contentURL(normalizedURI);
      if (!/^(0|[1-9]\d*)$/.test(pid))
        throw Error("Invalid payout proposal ID.");
      if (!/^0x[\da-fA-F]{64}$/.test(hash))
        throw Error(
          "A keccak256 content-byte hash is required. Choose a local file or paste its digest.",
        );
      await tx.send(
        d.openFundAddress,
        encodeFunctionData({
          abi: openFundAbi,
          functionName: "publishReport",
          args: [
            row.id,
            BigInt(pid),
            title,
            normalizedURI,
            hash as `0x${string}`,
          ],
        }),
      );
    } catch (e) {
      setError(e);
    }
  }
  return (
    <div className="detail-grid">
      <Panel
        title={t("reports")}
        description="Public references. No claim of independently verified impact."
      >
        <div className="stack">
          <ScanControls q={q} />
          {reports.length ? (
            reports.map((e) => (
              <ReportItem
                key={`${e.transactionHash}:${e.logIndex}`}
                event={e}
                d={d}
              />
            ))
          ) : (
            <EmptyState description="No report references in the scanned block range." />
          )}
        </div>
      </Panel>
      <Panel title="Publish report reference (manager)">
        <FieldGroup>
          <Notice title="Protect beneficiaries">
            {t("privacy")} A CID does not guarantee permanent availability.
          </Notice>
          <TextField
            label="ຫົວຂໍ້ / Report title"
            value={title}
            onChange={setTitle}
          />
          <TextField
            label="Executed payout proposal ID (0 for general report)"
            value={pid}
            onChange={setPid}
          />
          <TextField
            label="Content IPFS URI / CID reference"
            value={uri}
            onChange={setURI}
          />
          <TextField
            label="keccak256 of exact document bytes"
            value={hash}
            onChange={setHash}
          />
          <IPFSUpload
            onHash={setHash}
            onUploaded={(nextURI, nextHash) => {
              setURI(nextURI);
              setHash(nextHash);
            }}
          />
          <ErrorNotice error={error} />
          <Button
            disabled={!manager || tx.busy || c.chainId !== d.chainId}
            onClick={publish}
          >
            ເຜີຍແຜ່ລາຍງານ / Publish reference
          </Button>
          <TxFeedback state={tx.state} d={d} />
        </FieldGroup>
      </Panel>
    </div>
  );
}
function ReportItem({ event, d }: { event: Activity; d: Deployment }) {
  const [result, setResult] = useState(""),
    [error, setError] = useState<unknown>();
  let url;
  try {
    url = contentURL(String(event.args.contentURI));
  } catch {
    /* Keep invalid refs readable without making them links. */
  }
  return (
    <div className="stack">
      <h3>{String(event.args.title)}</h3>
      <p>
        Proposal #{String(event.args.proposalId)} · Block{" "}
        {event.blockNumber.toString()}
      </p>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          Open public document ↗
        </a>
      ) : (
        <code>{String(event.args.contentURI)}</code>
      )}
      <code className="hash">{String(event.args.contentHash)}</code>
      <Button
        variant="outline"
        onClick={async () => {
          setResult("Fetching…");
          setError(undefined);
          try {
            const r = await verifyContent(
              String(event.args.contentURI),
              event.args.contentHash as `0x${string}`,
            );
            setResult(
              `${r.match ? "Integrity matched" : "HASH MISMATCH"} · ${r.bytes} bytes · ${r.actual}`,
            );
          } catch (e) {
            setError(e);
            setResult("");
          }
        }}
      >
        Verify document byte integrity
      </Button>
      <small>{result}</small>
      <ErrorNotice error={error} />
      <TxHash d={d} hash={event.transactionHash} />
    </div>
  );
}
