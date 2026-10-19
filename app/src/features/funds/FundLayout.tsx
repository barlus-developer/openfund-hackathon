import { Button } from "@/components/ui/button";
import { useConnection } from "wagmi";
import { ArrowLeft } from "lucide-react";
import { Disclosure, RouteNavigation } from "@/components/patterns";
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
  type Deployment,
} from "@/web3/deployments";
import { useFund, type FundRow } from "@/web3/reads";
import { fundStatusLabels, categoryLabel } from "@/app/labels";
import { positiveId } from "@/lib/amount";
import { useLanguage } from "@/app/i18n";
type FundContext = { d: Deployment; row: FundRow };
export const useFundContext = () => useOutletContext<FundContext>();
export function FundLayout() {
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
  return <LoadFund key={`${version}:${fundId}`} d={d} id={id} />;
}
function LoadFund({ d, id }: { d: Deployment; id: bigint }) {
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
          ລອງໂຫຼດໃໝ່
        </Button>
      </div>
    );
  if (!q.data) return <EmptyState />;
  const row = q.data;
  const root = fundPath(d, id);
  const team = [row.fund.manager, ...row.approvers].some(
    (a) => a.toLowerCase() === c.address?.toLowerCase(),
  );
  const teamPage = ["governance", "proposals", "manage"].some((tab) =>
    pathname.startsWith(`${root}/${tab}`),
  );
  const items = (
    tabs: readonly (
      | "overview"
      | "reports"
      | "payouts"
      | "transactions"
      | "governance"
      | "proposals"
      | "manage"
    )[],
  ) =>
    tabs.map((tab) => ({
      to: root + (tab === "overview" ? "" : `/${tab}`),
      label: tab === "transactions" ? "ປະຫວັດ" : t(tab),
      end: tab === "overview",
    }));
  const donating = pathname === `${root}/donate`;
  const teamNavigation = (
    <RouteNavigation
      label="ຈັດການກອງທຶນ"
      items={items(["proposals", "governance", "manage"])}
    />
  );
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          to={donating ? root : "/funds"}
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
        <RouteNavigation
          label="ເມນູກອງທຶນ"
          items={items(["overview", "reports", "payouts", "transactions"])}
        />
      ) : null}
      {!donating && (team || teamPage) ? teamNavigation : null}
      <Outlet context={{ d, row } satisfies FundContext} />
      {!donating && !team && !teamPage ? (
        <Disclosure title="ສຳລັບຜູ້ດູແລກອງທຶນ">{teamNavigation}</Disclosure>
      ) : null}
    </div>
  );
}
