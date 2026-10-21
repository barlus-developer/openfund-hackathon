import { Link, useSearchParams } from "react-router-dom";
import { useConnection } from "wagmi";
import {
  Send,
  Users,
  UserRoundCheck,
  Archive,
  ListChecks,
  Banknote,
  Settings,
} from "lucide-react";
import { useFundContext } from "@/features/funds/FundLayout";
import { ClosureFinalize } from "@/features/funds/FundOverview";
import { Connect } from "@/features/wallet/Connect";
import { Panel, Notice } from "@/components/common";
import { buttonVariants } from "@/components/ui/button";
import { formatOfl } from "@/lib/amount";
import { managerFundPath } from "@/web3/deployments";
import { ProposalComposer } from "./ProposalComposer";
import { Recipients } from "./Recipients";
import { FundStatusNotice } from "@/features/funds/FundStatusNotice";
import {
  availableActions,
  fundRoles,
  proposalSections,
  type ProposalSection,
} from "./proposal";

const icons = {
  payout: Send,
  team: Users,
  recipients: UserRoundCheck,
  closure: Archive,
};
export function Manage() {
  const { d, row } = useFundContext();
  const c = useConnection();
  const [params] = useSearchParams();
  const roles = fundRoles(row, c.address);
  const actions = availableActions(row, c.address);
  const sections = proposalSections.filter(
    (s) => s.id !== "recipients" || row.fund.config.recipientPolicy === 1,
  );
  const requested = params.get("section");
  const defaultSection: ProposalSection = [2, 4].includes(row.status)
    ? "closure"
    : actions.includes(0)
      ? "payout"
      : "team";
  const section =
    sections.find((s) => s.id === (requested || defaultSection)) ??
    sections.find((s) => s.id === defaultSection)!;
  const kinds = actions.filter((k) =>
    (section.kinds as readonly number[]).includes(k),
  );
  const root = managerFundPath(d, row.id);
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Panel title="ຈັດການກອງທຶນ">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">ຍອດຄົງເຫຼືອ</dt>
            <dd className="mt-1 break-words text-lg font-semibold">
              {formatOfl(row.fund.balance)} OFL
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">ການອະນຸມັດ</dt>
            <dd className="mt-1 text-lg font-semibold">
              {row.fund.threshold} / {row.approvers.length} ຄົນ
            </dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-muted-foreground">ສິດຂອງກະເປົານີ້</dt>
            <dd className="mt-1 font-medium">
              {roles.manager && roles.approver
                ? "ຜູ້ຈັດການ ແລະຜູ້ອະນຸມັດ"
                : roles.manager
                  ? "ຜູ້ຈັດການ"
                  : roles.approver
                    ? "ຜູ້ອະນຸມັດ"
                    : "ສິດເບິ່ງຂໍ້ມູນ"}
            </dd>
          </div>
        </dl>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <Link
            className="inline-flex min-h-11 items-center gap-2 text-primary hover:underline"
            to={`${root}/proposals`}
          >
            <ListChecks className="size-4" aria-hidden="true" />
            ກວດຂໍ້ສະເໜີ
          </Link>
          <Link
            className="inline-flex min-h-11 items-center gap-2 text-primary hover:underline"
            to={`${root}/payouts`}
          >
            <Banknote className="size-4" aria-hidden="true" />
            ປະຫວັດການຈ່າຍ
          </Link>
          <Link
            className="inline-flex min-h-11 items-center gap-2 text-primary hover:underline"
            to={`${root}/settings`}
          >
            <Settings className="size-4" aria-hidden="true" />
            ຮູບພາບ ແລະຂໍ້ມູນ
          </Link>
        </div>
      </Panel>
      <FundStatusNotice />
      {!c.address || c.chainId !== d.chainId ? (
        <Connect chainId={d.chainId} />
      ) : null}
      <nav
        aria-label="ວຽກຈັດການກອງທຶນ"
        className="grid grid-cols-2 gap-2 xl:grid-cols-4"
      >
        {sections.map(({ id, label }) => {
          const Icon = icons[id];
          const query = new URLSearchParams(params);
          query.set("section", id);
          return (
            <Link
              key={id}
              to={`?${query}`}
              aria-current={section.id === id ? "page" : undefined}
              className={buttonVariants({
                variant: section.id === id ? "secondary" : "outline",
                className:
                  "h-auto min-h-12 justify-start whitespace-normal text-left",
              })}
            >
              <Icon data-icon="inline-start" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {section.id === "team" ? (
          <Notice title="ຜູ້ຈັດການ ແລະຜູ້ອະນຸມັດ">
            <p>
              ຜູ້ອະນຸມັດປັດຈຸບັນສາມາດສະເໜີປ່ຽນທີມໄດ້.
              ຍັງຕ້ອງຜ່ານຈຳນວນອະນຸມັດເດີມ ແລະລໍຖ້າ 24 ຊົ່ວໂມງ.
            </p>
            <Link className="text-primary underline" to={`${root}/governance`}>
              ເບິ່ງຜູ້ຈັດການ ແລະລາຍຊື່ຜູ້ອະນຸມັດປັດຈຸບັນ
            </Link>
          </Notice>
        ) : null}
        {section.id === "recipients" ? (
          <Notice title="ລາຍຊື່ຜູ້ຮັບທີ່ອະນຸຍາດ">
            ກອງທຶນນີ້ຈ່າຍໃຫ້ສະເພາະກະເປົາໃນລາຍຊື່. ການປ່ຽນລາຍຊື່ຕ້ອງອະນຸມັດ
            ແລະຈະຍົກເລີກຂໍ້ສະເໜີຈ່າຍເງິນເກົ່າ.
          </Notice>
        ) : null}
        {section.id === "closure" ? (
          <Notice title="ກວດສອບກ່ອນປິດກອງທຶນ">
            <p>
              ການເລີ່ມປິດຈະຢຸດຮັບສະໜັບສະໜູນຖາວອນ ແລະຍົກເລີກຂໍ້ສະເໜີເດີມ.
              ການຈ່າຍເງິນທີ່ເຫຼືອຕ້ອງອະນຸມັດຕ່າງຫາກ.
            </p>
            <p>
              1. ສະເໜີ ແລະອະນຸມັດເລີ່ມປິດ · 2. ຈ່າຍຍອດຄົງເຫຼືອຕາມກົດ · 3.
              ປິດຖາວອນເມື່ອຍອດເປັນສູນ.
            </p>
          </Notice>
        ) : null}
        {kinds.length ? (
          <ProposalComposer key={`${section.id}:${c.address}`} kinds={kinds} />
        ) : (
          <Notice title="ບໍ່ມີການສະເໜີທີ່ໃຊ້ໄດ້ໃນຂະນະນີ້">
            {row.status === 4
              ? "ກອງທຶນປິດແລ້ວ. ປະຫວັດ ແລະລາຍງານຍັງເບິ່ງໄດ້."
              : row.status === 2
                ? "ຜູ້ສະໜັບສະໜູນຮັບເງິນຄືນເອງໄດ້. ບໍ່ສາມາດສະເໜີຈ່າຍເງິນ ຫຼືປ່ຽນທີມ."
                : !roles.manager && !roles.approver
                  ? "ໃຊ້ກະເປົາຜູ້ຈັດການ ຫຼືຜູ້ອະນຸມັດເພື່ອສົ່ງຂໍ້ສະເໜີ."
                  : section.id === "payout"
                    ? "ຈ່າຍເງິນໄດ້ເມື່ອກອງທຶນພ້ອມຈ່າຍ ຫຼືກຳລັງປິດ; ສະເພາະຜູ້ຈັດການເປັນຜູ້ສະເໜີ."
                    : "ວຽກນີ້ບໍ່ພ້ອມສຳລັບສິດ ຫຼືສະຖານະກອງທຶນປັດຈຸບັນ."}
          </Notice>
        )}
        {section.id === "recipients" ? <Recipients /> : null}
        {section.id === "closure" ? <ClosureFinalize /> : null}
      </div>
    </div>
  );
}
