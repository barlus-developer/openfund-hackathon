import { useState } from "react";
import { useConnection } from "wagmi";
import { encodeFunctionData, zeroHash, type Hex } from "viem";
import { Save } from "lucide-react";
import { Panel, Notice, TextField, TxFeedback } from "@/components/common";
import { FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Connect } from "@/features/wallet/Connect";
import { useTransaction } from "@/hooks/useTransaction";
import { openFundAbi } from "@/web3/generated/OpenFund";
import { utf8Bytes, fundRoles } from "@/features/governance/proposal";
import { useFundContext } from "./FundLayout";
import { FundImageManager } from "./FundImageManager";

export function FundSettings() {
  const { d, row } = useFundContext();
  const c = useConnection();
  const tx = useTransaction(d);
  // Reset the editor when the wallet or canonical metadata changes, including external updates.
  return (
    <SettingsEditor
      key={`${c.address}:${row.fund.metadataURI}:${row.fund.metadataHash}`}
      tx={tx}
    />
  );
}
function SettingsEditor({ tx }: { tx: ReturnType<typeof useTransaction> }) {
  const { d, row } = useFundContext();
  const c = useConnection();
  const { manager } = fundRoles(row, c.address);
  const [metadata, setMetadata] = useState(row.fund.metadataURI);
  const [imagePending, setImagePending] = useState(false);
  const [preparedMetadata, setPreparedMetadata] = useState<{
    uri: string;
    hash: Hex;
  }>();
  const metadataHash =
    preparedMetadata?.uri === metadata
      ? preparedMetadata.hash
      : metadata === row.fund.metadataURI
        ? row.fund.metadataHash
        : zeroHash;
  const metadataError =
    utf8Bytes(metadata) > 300
      ? "ລິ້ງຂໍ້ມູນຕ້ອງບໍ່ເກີນ 300 ໄບຕ໌ UTF-8."
      : undefined;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {!c.address || c.chainId !== d.chainId ? (
        <Connect chainId={d.chainId} />
      ) : null}
      <Panel title="ຕັ້ງຄ່າກອງທຶນ">
        <FieldGroup>
          {!manager ? (
            <Notice title="ສິດເບິ່ງຂໍ້ມູນ">
              ໃຊ້ກະເປົາຜູ້ຈັດການເພື່ອແກ້ໄຂຂໍ້ມູນກອງທຶນ.
            </Notice>
          ) : null}
          <TextField
            label="ລິ້ງຂໍ້ມູນເພີ່ມເຕີມ"
            value={metadata}
            onChange={setMetadata}
            error={metadataError}
            disabled={!manager || row.status === 4 || imagePending || tx.busy}
          />
          <FundImageManager
            metadataURI={metadata}
            metadataHash={metadataHash}
            disabled={!manager || tx.busy || row.status === 4}
            onPendingChange={setImagePending}
            onPublished={(uri, hash) => {
              setMetadata(uri);
              setPreparedMetadata({ uri, hash });
            }}
          />
          {preparedMetadata?.uri === metadata &&
          metadata !== row.fund.metadataURI ? (
            <Notice title="ຮູບພາບພ້ອມເຜີຍແຜ່">
              ກົດບັນທຶກຂໍ້ມູນດ້ານລຸ່ມ ແລະຢືນຢັນໃນ MetaMask ເພື່ອເຜີຍແຜ່ຮູບພາບ.
            </Notice>
          ) : null}
          {imagePending ? (
            <p role="status" className="text-sm text-muted-foreground">
              ກະລຸນາອັບໂຫຼດຮູບພາບ ຫຼືຍົກເລີກການແກ້ໄຂຮູບກ່ອນບັນທຶກ.
            </p>
          ) : null}
          <Button
            variant="outline"
            disabled={
              !manager ||
              imagePending ||
              tx.busy ||
              c.chainId !== d.chainId ||
              row.status === 4 ||
              !!metadataError
            }
            onClick={() =>
              tx.send(
                d.openFundAddress,
                encodeFunctionData({
                  abi: openFundAbi,
                  functionName: "updateMetadata",
                  args: [row.id, metadata, metadataHash],
                }),
              )
            }
          >
            <Save data-icon="inline-start" aria-hidden="true" /> ບັນທຶກຂໍ້ມູນ
            ແລະຮູບພາບ{" "}
          </Button>
          <small>
            {" "}
            ການອັບເດດລິ້ງບໍ່ປ່ຽນເງື່ອນໄຂການເງິນ ຫຼືຈຸດປະສົງ.
            ລິ້ງທີ່ບໍ່ມີລະຫັດຢືນຢັນໄຟລ໌ຈະກວດການປ່ຽນແປງເນື້ອຫາບໍ່ໄດ້.{" "}
          </small>
        </FieldGroup>
        <TxFeedback state={tx.state} d={d} />
      </Panel>
      <Notice title="ການຈ່າຍເງິນຕ້ອງຜ່ານການອະນຸມັດ">
        {" "}
        ຜູ້ຈັດການສະເໜີ ຜູ້ອະນຸມັດຮ່ວມຕັດສິນໃຈ ແລ້ວຈຶ່ງດຳເນີນການໄດ້.
        ບໍ່ມີຜູ້ໃດສາມາດຖອນເງິນໂດຍຂ້າມເງື່ອນໄຂ.{" "}
      </Notice>
    </div>
  );
}
