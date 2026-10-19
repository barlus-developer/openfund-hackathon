import { useState } from "react";
import { useConnection } from "wagmi";
import { encodeFunctionData, getAddress, zeroAddress, zeroHash } from "viem";
import { useFundContext } from "@/features/funds/FundLayout";
import { useTransaction } from "@/hooks/useTransaction";
import { openFundAbi } from "@/web3/generated/OpenFund";
import { actionLabels } from "@/app/labels";
import { actionNames } from "@/web3/reads";
import { clientFor } from "@/web3/deployments";
import { amount, ofl } from "@/lib/amount";
import { walletAddress } from "@/features/funds/creation";
import {
  Panel,
  Notice,
  TextField,
  SelectField,
  ErrorNotice,
  TxFeedback,
} from "@/components/common";
import { FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Connect } from "@/features/wallet/Connect";
import { ClosureFinalize } from "@/features/funds/FundOverview";
import { useLanguage } from "@/app/i18n";
export function Manage() {
  const { d, row } = useFundContext(),
    c = useConnection(),
    { t } = useLanguage(),
    tx = useTransaction(d);
  const [kind, setKind] = useState("0"),
    [target, setTarget] = useState(""),
    [sum, setSum] = useState(""),
    [value, setValue] = useState(""),
    [purpose, setPurpose] = useState(""),
    [uri, setURI] = useState(""),
    [hash, setHash] = useState(""),
    [metadata, setMetadata] = useState(row.fund.metadataURI),
    [error, setError] = useState<unknown>();
  const manager = c.address?.toLowerCase() === row.fund.manager.toLowerCase(),
    approver = row.approvers.some(
      (a) => a.toLowerCase() === c.address?.toLowerCase(),
    );
  const options = actionNames
    .map((n, i) => [String(i), n] as [string, string])
    .filter(
      ([, n]) =>
        manager ||
        (approver &&
          [
            "CHANGE_MANAGER",
            "ADD_APPROVER",
            "REMOVE_APPROVER",
            "CHANGE_THRESHOLD",
          ].includes(n)),
    )
    .filter(
      ([i]) =>
        ![2, 4].includes(row.status) &&
        (![5, 6].includes(+i) || row.fund.config.recipientPolicy === 1) &&
        (+i !== 7 || row.status === 1) &&
        (+i !== 0 || [1, 3].includes(row.status)),
    );
  const selectedKind = options.some(([i]) => i === kind)
    ? kind
    : options[0]?.[0] || "0";
  async function propose() {
    setError(undefined);
    try {
      const k = Number(selectedKind);
      if (!manager && !(approver && [1, 2, 3, 4].includes(k)))
        throw Error("Only current manager, or approvers for recovery actions.");
      if (hash && !/^0x[0-9a-fA-F]{64}$/.test(hash))
        throw Error("Evidence hash must be a 32-byte keccak256 digest.");
      if ([4, 7].includes(k) === false) walletAddress.parse(target);
      const a = {
        kind: k,
        target: [4, 7].includes(k) ? zeroAddress : getAddress(target),
        amount: k === 0 ? amount(sum) : 0n,
        value: k === 4 ? Number(value) : 0,
        purpose,
        evidenceURI: uri,
        evidenceHash: (hash || zeroHash) as `0x${string}`,
      };
      if (
        k === 4 &&
        (!/^\d+$/.test(value) ||
          Number(value) < row.fund.config.minimumApprovalThreshold ||
          Number(value) > row.approvers.length)
      )
        throw Error("Invalid threshold.");
      if (k === 0) {
        if (a.amount > row.fund.balance)
          throw Error("Payout exceeds the current balance.");
        if (!purpose) throw Error("Purpose is required.");
        const allowed = await clientFor(d).readContract({
          address: d.openFundAddress,
          abi: openFundAbi,
          functionName: "isAllowedRecipient",
          args: [row.id, a.target],
        });
        if (!allowed)
          throw Error(
            "Recipient is not eligible under current fund/token rules.",
          );
      }
      await tx.send(
        d.openFundAddress,
        encodeFunctionData({
          abi: openFundAbi,
          functionName: "createProposal",
          args: [row.id, a],
        }),
      );
    } catch (e) {
      setError(e);
    }
  }
  return (
    <div className="detail-grid">
      <div className="stack">
        <Panel title="ສະເໜີການດຳເນີນງານ">
          <FieldGroup>
            <Connect chainId={d.chainId} />
            {!manager && !approver ? (
              <Notice title="ສິດເບິ່ງຂໍ້ມູນ">
                {" "}
                ເຊື່ອມກະເປົາຜູ້ຈັດການເພື່ອສະເໜີການດຳເນີນງານ
                ຫຼືກະເປົາຜູ້ອະນຸມັດເພື່ອປັບຜູ້ຮັບຜິດຊອບ.{" "}
              </Notice>
            ) : null}
            <SelectField
              label="ສິ່ງທີ່ຕ້ອງການສະເໜີ"
              value={selectedKind}
              onChange={setKind}
              options={
                options.length
                  ? options.map(
                      ([value]) =>
                        [value, actionLabels[Number(value)]] as [
                          string,
                          string,
                        ],
                    )
                  : [["0", "ຈ່າຍເງິນ (ສຳລັບຜູ້ຈັດການ)"]]
              }
            />
            {![4, 7].includes(+selectedKind) ? (
              <TextField
                label={
                  +selectedKind === 0
                    ? t("recipient")
                    : "ທີ່ຢູ່ກະເປົາທີ່ກ່ຽວຂ້ອງ"
                }
                value={target}
                onChange={setTarget}
              />
            ) : null}
            {+selectedKind === 0 ? (
              <TextField label={t("amount")} value={sum} onChange={setSum} />
            ) : null}
            {+selectedKind === 4 ? (
              <TextField
                label="ຈຳນວນອະນຸມັດໃໝ່"
                value={value}
                onChange={setValue}
              />
            ) : null}
            <TextField
              label={t("purpose")}
              value={purpose}
              onChange={setPurpose}
              multiline
            />
            <TextField
              label="ລິ້ງຫຼັກຖານ (ຖ້າມີ)"
              value={uri}
              onChange={setURI}
            />
            <TextField
              label="ລະຫັດຢືນຢັນຫຼັກຖານ (ຖ້າມີ)"
              value={hash}
              onChange={setHash}
            />
            <Notice title="ກວດສອບກ່ອນສົ່ງ">
              {actionLabels[+selectedKind]} · ກະເປົາ {target || "ບໍ່ມີ"} ·{" "}
              {sum || "0"} OFL · ຈຳນວນອະນຸມັດໃໝ່ {value || "—"}
              <p>
                {" "}
                ຍອດຄົງເຫຼືອລ່າສຸດ {ofl(row.fund.balance)} OFL. ຈຳນວນອະນຸມັດ{" "}
                {row.fund.threshold}/{row.approvers.length} . ການອະນຸມັດຮຸ່ນ{" "}
                {row.fund.governanceVersion.toString()}.{" "}
                {+selectedKind === 0
                  ? "ການສະເໜີບໍ່ໄດ້ຈອງຍອດເງິນໄວ້."
                  : "ລໍຖ້າ 24 ຊົ່ວໂມງຫຼັງອະນຸມັດຄົບ."}
              </p>
              {+selectedKind === 7 ? (
                <p>
                  {" "}
                  ການເລີ່ມປິດຈະຢຸດຮັບສະໜັບສະໜູນຖາວອນ ແລະຍົກເລີກຂໍ້ສະເໜີເດີມ.
                  ການຈ່າຍເງິນທີ່ເຫຼືອຕ້ອງອະນຸມັດຕ່າງຫາກ.{" "}
                </p>
              ) : null}
            </Notice>
            <ErrorNotice error={error} />
            <Button
              disabled={
                (!manager && !approver) ||
                tx.busy ||
                c.chainId !== d.chainId ||
                row.status === 2 ||
                row.status === 4
              }
              onClick={propose}
            >
              {" "}
              ສົ່ງຂໍ້ສະເໜີ{" "}
            </Button>
            <TxFeedback state={tx.state} d={d} />
          </FieldGroup>
        </Panel>
        <ClosureFinalize />
      </div>
      <div className="stack">
        <Panel title="ອັບເດດຂໍ້ມູນ (ສຳລັບຜູ້ຈັດການ)">
          <FieldGroup>
            <TextField
              label="ລິ້ງຂໍ້ມູນເພີ່ມເຕີມ"
              value={metadata}
              onChange={setMetadata}
            />
            <Button
              disabled={
                !manager ||
                tx.busy ||
                c.chainId !== d.chainId ||
                row.status === 4
              }
              onClick={() =>
                tx.send(
                  d.openFundAddress,
                  encodeFunctionData({
                    abi: openFundAbi,
                    functionName: "updateMetadata",
                    args: [row.id, metadata, zeroHash],
                  }),
                )
              }
            >
              {" "}
              ບັນທຶກລິ້ງຂໍ້ມູນ{" "}
            </Button>
            <small>
              {" "}
              ການອັບເດດລິ້ງບໍ່ປ່ຽນເງື່ອນໄຂການເງິນ ຫຼືຈຸດປະສົງ.
              ລິ້ງທີ່ບໍ່ມີລະຫັດຢືນຢັນໄຟລ໌ຈະກວດການປ່ຽນແປງເນື້ອຫາບໍ່ໄດ້.{" "}
            </small>
          </FieldGroup>
        </Panel>
        <Notice title="ການຈ່າຍເງິນຕ້ອງຜ່ານການອະນຸມັດ">
          {" "}
          ຜູ້ຈັດການສະເໜີ ຜູ້ອະນຸມັດຮ່ວມຕັດສິນໃຈ ແລ້ວຈຶ່ງດຳເນີນການໄດ້.
          ບໍ່ມີຜູ້ໃດສາມາດຖອນເງິນໂດຍຂ້າມເງື່ອນໄຂ.{" "}
        </Notice>
      </div>
    </div>
  );
}
