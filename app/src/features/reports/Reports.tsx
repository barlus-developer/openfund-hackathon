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
        throw Error("ໝາຍເລກຂໍ້ສະເໜີການຈ່າຍເງິນບໍ່ຖືກຕ້ອງ.");
      if (!/^0x[\da-fA-F]{64}$/.test(hash))
        throw Error("ກະລຸນາເລືອກໄຟລ໌ ຫຼືປ້ອນລະຫັດຢືນຢັນເອກະສານ.");
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
        description="ເອກະສານຈາກກອງທຶນ ທີ່ທຸກຄົນເປີດເບິ່ງໄດ້. ເນື້ອຫາຍັງບໍ່ຜ່ານການກວດສອບອິດສະຫຼະ."
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
            <EmptyState description="ຍັງບໍ່ພົບລາຍງານໃນຂໍ້ມູນທີ່ໂຫຼດ." />
          )}
        </div>
      </Panel>
      <Panel title="ເຜີຍແຜ່ລາຍງານ (ສຳລັບຜູ້ຈັດການ)">
        <FieldGroup>
          <Notice title="ປົກປ້ອງຜູ້ຮັບການຊ່ວຍເຫຼືອ">
            {t("privacy")} ລິ້ງໄຟລ໌ບໍ່ໄດ້ຮັບຮອງວ່າໄຟລ໌ຈະຖືກເກັບໄວ້ຖາວອນ.{" "}
          </Notice>
          <TextField label="ຫົວຂໍ້ລາຍງານ" value={title} onChange={setTitle} />
          <TextField
            label="ໝາຍເລກການຈ່າຍເງິນ (0 ສຳລັບລາຍງານທົ່ວໄປ)"
            value={pid}
            onChange={setPid}
          />
          <TextField
            label="ລິ້ງ ຫຼືລະຫັດເອກະສານ IPFS"
            value={uri}
            onChange={setURI}
          />
          <TextField
            label="ລະຫັດຢືນຢັນເອກະສານ"
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
            {" "}
            ເຜີຍແຜ່ລາຍງານ{" "}
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
        {" "}
        ຂໍ້ສະເໜີ # {String(event.args.proposalId)} · ບັນທຶກ{" "}
        {event.blockNumber.toString()}
      </p>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          {" "}
          ເປີດເບິ່ງເອກະສານ ↗{" "}
        </a>
      ) : (
        <code>{String(event.args.contentURI)}</code>
      )}
      <code className="hash">{String(event.args.contentHash)}</code>
      <Button
        variant="outline"
        onClick={async () => {
          setResult("ກຳລັງໂຫຼດ…");
          setError(undefined);
          try {
            const r = await verifyContent(
              String(event.args.contentURI),
              event.args.contentHash as `0x${string}`,
            );
            setResult(
              `${r.match ? "ເອກະສານກົງກັນ" : "ເອກະສານບໍ່ກົງກັນ"} · ${r.bytes} ໄບຕ໌ · ${r.actual}`,
            );
          } catch (e) {
            setError(e);
            setResult("");
          }
        }}
      >
        {" "}
        ກວດສອບໄຟລ໌ເອກະສານ{" "}
      </Button>
      <small>{result}</small>
      <ErrorNotice error={error} />
      <TxHash d={d} hash={event.transactionHash} />
    </div>
  );
}
