import { useState } from "react";
import { useFunds } from "@/web3/reads";
import { defaultDeployment, deployments } from "@/web3/deployments";
import { FundCard } from "@/features/funds/FundCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ActionLink,
  EmptyState,
  ErrorNotice,
  Loading,
  SelectField,
} from "@/components/common";
import { useLanguage } from "@/app/i18n";
export function Explore() {
  const [version, setVersion] = useState(defaultDeployment?.version);
  const d = deployments.find((d) => d.version === version);
  const { t } = useLanguage();
  if (!d)
    return (
      <EmptyState description="No deployment configured. Run npm run deploy:local, then restart Vite." />
    );
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">PUBLIC FUND EXPLORER</div>
          <h1>{t("explore")}</h1>
          <p>{t("readOnly")}</p>
        </div>
        <ActionLink to="/funds/create">{t("create")}</ActionLink>
      </div>
      <SelectField
        label="Official deployment"
        value={d.version}
        onChange={setVersion}
        options={deployments.map((d) => [
          d.version,
          `${d.name} · ${d.version}`,
        ])}
      />
      <FundBrowser key={d.version} d={d} />
    </>
  );
}
function FundBrowser({ d }: { d: NonNullable<typeof defaultDeployment> }) {
  const q = useFunds(d);
  const [search, setSearch] = useState(""),
    [mode, setMode] = useState("all"),
    [status, setStatus] = useState("all"),
    [policy, setPolicy] = useState("all"),
    [category, setCategory] = useState("all"),
    [quorum, setQuorum] = useState("all"),
    [sort, setSort] = useState("recent");
  const loaded = q.data?.pages.flatMap((p) => p.rows) || [];
  const rows = loaded.filter(
    (r) =>
      (r.fund.title + " " + r.fund.summary)
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (mode === "all" || r.fund.config.fundingMode === Number(mode)) &&
      (status === "all" || r.status === Number(status)) &&
      (policy === "all" ||
        (r.fund.config.fundingMode === 0 &&
          r.fund.config.underfundingPolicy === Number(policy))) &&
      (category === "all" || r.fund.category === category) &&
      (quorum === "all" ||
        (quorum === "multi" ? r.fund.threshold > 1 : r.fund.threshold === 1)),
  );
  rows.sort((a, b) => {
    const x =
        sort === "raised"
          ? a.fund.totalRaised
          : sort === "ending"
            ? a.fund.config.deadline
            : a.id,
      y =
        sort === "raised"
          ? b.fund.totalRaised
          : sort === "ending"
            ? b.fund.config.deadline
            : b.id;
    return x === y ? 0 : sort === "ending" ? (x < y ? -1 : 1) : x > y ? -1 : 1;
  });
  return (
    <div className="stack mt-6">
      <div className="filters">
        <Input
          aria-label="Search loaded funds"
          placeholder="Search loaded titles / descriptions"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SelectField
          label="Funding mode"
          value={mode}
          onChange={setMode}
          options={[
            ["all", "All modes"],
            ["0", "Targeted"],
            ["1", "Continuous"],
          ]}
        />
        <SelectField
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            ["all", "All statuses"],
            ["0", "Fundraising"],
            ["1", "Active"],
            ["2", "Refundable"],
            ["3", "Closing"],
            ["4", "Closed"],
          ]}
        />
        <SelectField
          label="Failure policy"
          value={policy}
          onChange={setPolicy}
          options={[
            ["all", "All policies"],
            ["0", "Refund"],
            ["1", "Keep funds"],
          ]}
        />
        <SelectField
          label="Category"
          value={category}
          onChange={setCategory}
          options={
            [
              ["all", "All loaded categories"],
              ...new Set(loaded.map((r) => r.fund.category)),
            ].map((v) => (typeof v === "string" ? [v, v] : v)) as [
              string,
              string,
            ][]
          }
        />
        <SelectField
          label="Governance"
          value={quorum}
          onChange={setQuorum}
          options={[
            ["all", "Any threshold"],
            ["single", "Single signature"],
            ["multi", "Multiple approvals"],
          ]}
        />
        <SelectField
          label="Sort loaded funds"
          value={sort}
          onChange={setSort}
          options={[
            ["recent", "Newest"],
            ["raised", "Raised"],
            ["ending", "Deadline"],
          ]}
        />
      </div>
      <small>
        {loaded.length} / {q.data?.pages[0]?.count.toString() || "—"} funds
        loaded. Search, filters and sorting apply to loaded funds only.
      </small>
      <ErrorNotice error={q.error} />
      {q.isLoading ? (
        <Loading />
      ) : rows.length ? (
        <div className="fund-grid">
          {rows.map((r) => (
            <FundCard key={r.id.toString()} row={r} d={d} />
          ))}
        </div>
      ) : !q.error ? (
        <EmptyState />
      ) : null}
      {q.hasNextPage ? (
        <Button
          variant="outline"
          disabled={q.isFetchingNextPage}
          onClick={() => q.fetchNextPage()}
        >
          Load 12 more funds
        </Button>
      ) : null}
    </div>
  );
}
