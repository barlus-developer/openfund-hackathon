import { Link } from "react-router-dom";
import { useConnection } from "wagmi";
import {
  Send,
  ListChecks,
  ArrowLeftRight,
  FileText,
  Images,
} from "lucide-react";
import { Stat } from "@/components/patterns";
import { FundProgress } from "./FundCard";
import { useFundContext } from "./FundLayout";
import { formatOfl, date } from "@/lib/amount";
import { managerFundPath } from "@/web3/deployments";
import { buttonVariants } from "@/components/ui/button";
import { FundStatusNotice } from "./FundStatusNotice";
import { availableActions, fundRoles } from "@/features/governance/proposal";

export function ManagerFundOverview() {
  const { d, row } = useFundContext();
  const { address } = useConnection();
  const roles = fundRoles(row, address);
  const actions = availableActions(row, address);
  const f = row.fund;
  const root = managerFundPath(d, row.id);
  return (
    <div className="flex flex-col gap-8">
      <p className="max-w-3xl whitespace-pre-wrap text-muted-foreground">
        {f.summary}
      </p>
      <FundStatusNotice />
      <div className="grid grid-cols-2 gap-6 border-y py-5 xl:grid-cols-4">
        {[
          ["ລະດົມທຶນແລ້ວ", f.totalRaised],
          ["ຍອດຄົງເຫຼືອ", f.balance],
          ["ຈ່າຍແລ້ວ", f.totalWithdrawn],
          ["ຄືນເງິນແລ້ວ", f.totalRefunded],
        ].map(([label, value]) => (
          <Stat
            key={String(label)}
            label={String(label)}
            value={
              <>
                {formatOfl(value as bigint)} <small>OFL</small>
              </>
            }
          />
        ))}
      </div>
      <div className="grid items-start gap-10 xl:grid-cols-2">
        <section
          className="flex flex-col gap-5"
          aria-labelledby="manager-progress"
        >
          <h2 id="manager-progress" className="text-lg font-semibold">
            ຄວາມຄືບໜ້າການລະດົມທຶນ
          </h2>
          <FundProgress row={row} showLabel={false} />
          <dl className="data-list">
            <dt>ວັນສິ້ນສຸດ</dt>
            <dd>
              {f.config.deadline > 0n
                ? date(f.config.deadline)
                : "ຮັບສະໜັບສະໜູນຕໍ່ເນື່ອງ"}
            </dd>
            <dt>ການອະນຸມັດ</dt>
            <dd>
              {f.threshold} / {row.approvers.length} ຄົນ
            </dd>
          </dl>
        </section>
        <section
          className="flex flex-col gap-3"
          aria-labelledby="manager-actions"
        >
          <h2 id="manager-actions" className="mb-2 text-lg font-semibold">
            ດຳເນີນການຕໍ່
          </h2>
          {[
            {
              path: actions.includes(0)
                ? "spending?section=payout"
                : [2, 3, 4].includes(row.status)
                  ? "spending?section=closure"
                  : "spending?section=team",
              label: actions.includes(0)
                ? "ສະເໜີຈ່າຍເງິນ"
                : [2, 3, 4].includes(row.status)
                  ? "ກວດສອບການປິດກອງທຶນ"
                  : "ຜູ້ຈັດການ ແລະຜູ້ອະນຸມັດ",
              icon: Send,
            },
            {
              path: "proposals",
              label: "ກວດສອບຂໍ້ສະເໜີ ແລະອະນຸມັດ",
              icon: ListChecks,
            },
            {
              path: "transactions",
              label: "ຕິດຕາມການຮັບ ແລະຈ່າຍເງິນ",
              icon: ArrowLeftRight,
            },
            {
              path: "reports",
              label: "ເຜີຍແຜ່ລາຍງານຄວາມຄືບໜ້າ",
              icon: FileText,
            },
            {
              path: "settings",
              label: "ຈັດການຮູບພາບ ແລະຂໍ້ມູນກອງທຶນ",
              icon: Images,
            },
          ]
            .filter(
              ({ path }) =>
                path !== "settings" || (roles.manager && row.status !== 4),
            )
            .map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={`${root}/${path}`}
                className={buttonVariants({
                  variant: "outline",
                  className:
                    "h-auto min-h-12 justify-start whitespace-normal text-left",
                })}
              >
                <Icon data-icon="inline-start" aria-hidden="true" />
                {label}
              </Link>
            ))}
        </section>
      </div>
    </div>
  );
}
