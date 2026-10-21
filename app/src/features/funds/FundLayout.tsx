import { Button } from "@/components/ui/button";
import { useConnection } from "wagmi";
import {
  ArrowLeft,
  RefreshCw,
  LayoutDashboard,
  Send,
  ListChecks,
  ArrowLeftRight,
  Banknote,
  FileText,
  Settings,
  HandHeart,
} from "lucide-react";
import { RouteNavigation } from "@/components/patterns";
import {
  Link,
  Outlet,
  useLocation,
  useParams,
  useOutletContext,
} from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorNotice, Loading } from "@/components/common";
import {
  resolveDeployment,
  fundPath,
  managerFundPath,
  type Deployment,
} from "@/web3/deployments";
import { useFund, type FundRow } from "@/web3/reads";
import { fundStatusLabels, categoryLabel } from "@/app/labels";
import { positiveId } from "@/lib/amount";
import { useLanguage } from "@/app/i18n";
type FundContext = { d: Deployment; row: FundRow; manager?: boolean };
export const useFundContext = () => useOutletContext<FundContext>();
export function FundLayout({ manager = false }: { manager?: boolean }) {
  const { version, fundId } = useParams();
  const d = resolveDeployment(version);
  let id;
  try {
    id = positiveId(fundId);
  } catch {
    return <EmptyState description="ບໍ່ພົບໝາຍເລກກອງທຶນນີ້." />;
  }
  if (!d)
    return (
      <EmptyState description="ບໍ່ພົບກອງທຶນໃນເຄືອຂ່າຍທີ່ຮອງຮັບ. ກະລຸນາກັບໄປຄົ້ນຫາກອງທຶນ." />
    );
  return (
    <LoadFund key={`${version}:${fundId}`} d={d} id={id} manager={manager} />
  );
}
function LoadFund({
  d,
  id,
  manager,
}: {
  d: Deployment;
  id: bigint;
  manager: boolean;
}) {
  const q = useFund(d, id);
  const c = useConnection();
  const { pathname } = useLocation();
  const { t } = useLanguage();
  if (q.isLoading) return <Loading />;
  if (q.error)
    return (
      <div className="flex flex-col items-start gap-4">
        <ErrorNotice error={q.error} />
        <Button
          variant="outline"
          disabled={q.isFetching}
          onClick={() => q.refetch()}
        >
          <RefreshCw data-icon="inline-start" aria-hidden="true" />
          ລອງໂຫຼດໃໝ່
        </Button>
      </div>
    );
  if (!q.data) return <EmptyState />;
  const row = q.data;
  const root = manager ? managerFundPath(d, id) : fundPath(d, id);
  const team = [row.fund.creator, row.fund.manager, ...row.approvers].some(
    (a) => a.toLowerCase() === c.address?.toLowerCase(),
  );
  const donating = !manager && pathname === `${root}/donate`;
  const tabs = manager
    ? [
        { tab: "", label: "ພາບລວມ", icon: LayoutDashboard },
        { tab: "spending", label: "ຈັດການກອງທຶນ", icon: Send },
        { tab: "proposals", label: "ຂໍ້ສະເໜີ", icon: ListChecks },
        { tab: "reports", label: "ລາຍງານ", icon: FileText },
        { tab: "transactions", label: "ປະຫວັດ", icon: ArrowLeftRight },
        { tab: "settings", label: "ຕັ້ງຄ່າ", icon: Settings },
      ]
    : [
        { tab: "", label: t("overview"), icon: LayoutDashboard },
        { tab: "reports", label: t("reports"), icon: FileText },
        { tab: "payouts", label: t("payouts"), icon: Banknote },
        { tab: "transactions", label: "ປະຫວັດ", icon: ArrowLeftRight },
      ];
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          to={
            donating
              ? root
              : manager
                ? `/manager/funds?deployment=${encodeURIComponent(d.version)}`
                : `/funds?deployment=${encodeURIComponent(d.version)}`
          }
          className="inline-flex min-h-11 items-center gap-2 self-start text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {donating ? "ກັບໄປກອງທຶນ" : "ກອງທຶນທັງໝົດ"}
        </Link>
        <div className="flex flex-col gap-3">
          {!donating ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {categoryLabel(row.fund.category)}
              </span>
              <Badge variant="secondary">{fundStatusLabels[row.status]}</Badge>
            </div>
          ) : null}
          <h1 className="text-2xl leading-relaxed font-semibold sm:text-3xl">
            {row.fund.title}
          </h1>
        </div>
      </div>
      {!donating ? (
        <div className="flex flex-col gap-4">
          {manager || team ? (
            <div className="flex flex-wrap gap-4 text-sm">
              {manager ? (
                <Link
                  to={fundPath(d, id)}
                  className="inline-flex min-h-11 items-center gap-2 text-primary hover:underline"
                >
                  <HandHeart className="size-4 shrink-0" aria-hidden="true" />
                  ເບິ່ງໜ້າສະໜັບສະໜູນ
                </Link>
              ) : team ? (
                <Link
                  to={managerFundPath(d, id)}
                  className="inline-flex min-h-11 items-center gap-2 text-primary hover:underline"
                >
                  <LayoutDashboard
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />
                  ເປີດໃນ Funding Manager
                </Link>
              ) : null}
            </div>
          ) : null}
          <RouteNavigation
            label={manager ? "ເມນູຈັດການກອງທຶນ" : "ເມນູກອງທຶນ"}
            items={tabs.map(({ tab, label, icon }) => ({
              icon,
              to: root + (tab ? `/${tab}` : ""),
              label,
              end: !tab,
            }))}
          />
        </div>
      ) : null}
      <Outlet context={{ d, row, manager } satisfies FundContext} />
    </div>
  );
}
