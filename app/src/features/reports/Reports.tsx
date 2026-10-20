import { ExternalLink, Send, ShieldCheck } from "lucide-react";
import { Disclosure } from "@/components/patterns";
import { Connect } from "@/features/wallet/Connect";
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
  Loading,
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
  const { d, row, manager: management } = useFundContext(),
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <Panel
        title={t("reports")}
        description="ລາຍງານຈາກກອງທຶນ · ຍັງບໍ່ຜ່ານການກວດສອບອິດສະຫຼະ."
      >
        <div className="flex min-w-0 flex-col gap-6">
          <ScanControls q={q} />
          {q.isLoading ? (
            <Loading />
          ) : reports.length ? (
            reports.map((e) => (
              <ReportItem
                key={`${e.transactionHash}:${e.logIndex}`}
                event={e}
                d={d}
              />
            ))
          ) : !q.error ? (
            <EmptyState
              title="ຍັງບໍ່ມີລາຍງານ"
              description="ກັບມາເບິ່ງຄວາມຄືບໜ້າພາຍຫຼັງ."
            />
          ) : null}
        </div>
      </Panel>
      {management && manager ? (
        <Disclosure title="ເພີ່ມລາຍງານໃໝ່" defaultOpen={!reports.length}>
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
            <Disclosure title="ອັບໂຫຼດເອກະສານໃໝ່">
              <IPFSUpload
                onHash={setHash}
                onUploaded={(nextURI, nextHash) => {
                  setURI(nextURI);
                  setHash(nextHash);
                }}
              />
            </Disclosure>
            <ErrorNotice error={error} />
            <Button
              disabled={!manager || tx.busy || c.chainId !== d.chainId}
              onClick={publish}
            >
              <Send data-icon="inline-start" aria-hidden="true" />{" "}
              ເຜີຍແຜ່ລາຍງານ{" "}
            </Button>
            <TxFeedback state={tx.state} d={d} />
          </FieldGroup>
        </Disclosure>
      ) : management ? (
        <Disclosure title="ສຳລັບຜູ້ຈັດການ">
          <p className="text-sm text-muted-foreground">
            ໃຊ້ກະເປົາຜູ້ຈັດການເພື່ອເຜີຍແຜ່ລາຍງານ.
          </p>
          <Connect chainId={d.chainId} />
        </Disclosure>
      ) : null}
    </div>
  );
}
function ReportItem({ event, d }: { event: Activity; d: Deployment }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(""),
    [error, setError] = useState<unknown>();
  let url;
  try {
    url = contentURL(String(event.args.contentURI));
  } catch {
    /* Keep invalid refs readable without making them links. */
  }
  return (
    <div className="flex min-w-0 flex-col gap-4 border-b py-5 last:border-0">
      <h3 className="text-base font-semibold">{String(event.args.title)}</h3>
      <p>
        {" "}
        ຂໍ້ສະເໜີ # {String(event.args.proposalId)} · ບັນທຶກ{" "}
        {event.blockNumber.toString()}
      </p>
      {url ? (
        <a
          className="inline-flex min-h-11 items-center gap-2 self-start text-sm text-primary hover:underline"
          href={url}
          target="_blank"
          rel="noreferrer"
        >
          {" "}
          ເປີດເບິ່ງເອກະສານ{" "}
          <ExternalLink className="inline-icon shrink-0" aria-hidden="true" />
          <span className="sr-only"> (ເປີດໃນແຖບໃໝ່)</span>{" "}
        </a>
      ) : (
        <code>{String(event.args.contentURI)}</code>
      )}
      <Disclosure title="ກວດສອບເອກະສານ">
        <code className="hash">{String(event.args.contentHash)}</code>
        <Button
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
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
            } finally {
              setBusy(false);
            }
          }}
        >
          <ShieldCheck data-icon="inline-start" aria-hidden="true" />{" "}
          {busy ? "ກຳລັງກວດສອບ…" : "ກວດສອບໄຟລ໌ເອກະສານ"}
        </Button>
        <small role="status">{result}</small>
        <ErrorNotice error={error} />
        <TxHash d={d} hash={event.transactionHash} />
      </Disclosure>
    </div>
  );
}
