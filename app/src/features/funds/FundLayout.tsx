import { NavLink, Outlet, useParams, useOutletContext } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorNotice, Loading } from "@/components/common";
import {
  resolveDeployment,
  fundPath,
  type Deployment,
} from "@/web3/deployments";
import { useFund, fundStatuses, type FundRow } from "@/web3/reads";
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
    return <EmptyState description="Invalid fund ID." />;
  }
  if (!d)
    return (
      <EmptyState description="Unknown deployment. Only configured official chain/address/version combinations are supported." />
    );
  return <LoadFund key={`${version}:${fundId}`} d={d} id={id} />;
}
function LoadFund({ d, id }: { d: Deployment; id: bigint }) {
  const q = useFund(d, id);
  const { t } = useLanguage();
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorNotice error={q.error} />;
  if (!q.data) return <EmptyState />;
  const row = q.data;
  return (
    <>
      <div className="eyebrow">
        {d.name} · chain {d.chainId} · {d.version} · FUND #{id.toString()}
      </div>
      <div className="page-title">
        <div>
          <h1>{row.fund.title}</h1>
          <p>{row.fund.summary}</p>
        </div>
        <div className="flex gap-2">
          <Badge>{fundStatuses[row.status]}</Badge>
          <Badge variant="outline">{row.fund.category}</Badge>
        </div>
      </div>
      <nav className="tabs" aria-label="Fund navigation">
        {(
          [
            "overview",
            "donate",
            "governance",
            "proposals",
            "payouts",
            "transactions",
            "reports",
            "manage",
          ] as const
        ).map((tab, i) => (
          <NavLink
            end={i === 0}
            key={tab}
            to={fundPath(d, id) + (i === 0 ? "" : `/${tab}`)}
          >
            {t(tab)}
          </NavLink>
        ))}
      </nav>
      <Outlet context={{ d, row } satisfies FundContext} />
    </>
  );
}
