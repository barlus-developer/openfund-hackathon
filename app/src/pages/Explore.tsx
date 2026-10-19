import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useFunds } from "@/web3/reads";
import { defaultDeployment, deployments } from "@/web3/deployments";
import { FundCard } from "@/features/funds/FundCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  ActionLink,
  EmptyState,
  ErrorNotice,
  Loading,
  SelectField,
} from "@/components/common";
import { categoryLabel, fundStatusLabels } from "@/app/labels";

export function Explore() {
  const [version, setVersion] = useState(defaultDeployment?.version);
  const d = deployments.find((d) => d.version === version);
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">ພາລະກິດຂອງອົງກອນ ແລະມູນນິທິ</div>
          <h1>ຄົ້ນຫາກອງທຶນ</h1>
          <p>
            ຄົ້ນພົບກອງທຶນຈາກອົງກອນ ແລະມູນນິທິ.
            ເລືອກພາລະກິດທີ່ເຈົ້າຢາກຮ່ວມສະໜັບສະໜູນ.
          </p>
        </div>
        <ActionLink to="/funds/create">
          <Plus data-icon="inline-start" />
          ສ້າງກອງທຶນ
        </ActionLink>
      </div>
      {d ? (
        <>
          {deployments.length > 1 ? (
            <div className="mb-6">
              <SelectField
                label="ເຄືອຂ່າຍ"
                value={version!}
                onChange={setVersion}
                options={deployments.map((d) => [
                  d.version,
                  `${d.chainId} · ${d.version}`,
                ])}
              />
            </div>
          ) : null}
          <FundBrowser key={d.version} d={d} />
        </>
      ) : (
        <EmptyState description="ກອງທຶນຈະສະແດງເມື່ອລະບົບພ້ອມໃຊ້ງານ. ກະລຸນາລອງໃໝ່ພາຍຫຼັງ." />
      )}
    </>
  );
}
function FundBrowser({ d }: { d: NonNullable<typeof defaultDeployment> }) {
  const q = useFunds(d);
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "all";
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("all");
  const [status, setStatus] = useState("all");
  const [policy, setPolicy] = useState("all");
  const [quorum, setQuorum] = useState("all");
  const [sort, setSort] = useState("recent");
  const loaded = q.data?.pages.flatMap((p) => p.rows) ?? [];
  const categoryOptions = [
    ...new Map(
      [
        "Projects",
        "Community",
        "Education",
        "Healthcare",
        ...loaded.map((r) => r.fund.category),
        ...(category === "all" ? [] : [category]),
      ].map((value) => [categoryLabel(value), value]),
    ).values(),
  ];
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
      (category === "all" ||
        categoryLabel(r.fund.category) === categoryLabel(category)) &&
      (quorum === "all" ||
        (quorum === "multi" ? r.fund.threshold > 1 : r.fund.threshold === 1)),
  );
  rows.sort((a, b) => {
    const x =
      sort === "raised"
        ? a.fund.totalRaised
        : sort === "ending"
          ? a.fund.config.deadline
          : a.id;
    const y =
      sort === "raised"
        ? b.fund.totalRaised
        : sort === "ending"
          ? b.fund.config.deadline
          : b.id;
    return x === y ? 0 : sort === "ending" ? (x < y ? -1 : 1) : x > y ? -1 : 1;
  });
  function reset() {
    setSearch("");
    setParams({});
    setMode("all");
    setStatus("all");
    setPolicy("all");
    setQuorum("all");
    setSort("recent");
  }
  return (
    <div className="stack">
      <div className="explore-toolbar">
        <div className="search-row">
          <Field>
            <FieldLabel htmlFor="fund-search">ຄົ້ນຫາກອງທຶນ</FieldLabel>
            <div className="search-field">
              <Search aria-hidden="true" />
              <Input
                id="fund-search"
                placeholder="ຊື່ກອງທຶນ ຫຼືສິ່ງທີ່ເຈົ້າສົນໃຈ…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </Field>
          <SelectField
            label="ໝວດໝູ່"
            value={category}
            onChange={(value) =>
              setParams(value === "all" ? {} : { category: value })
            }
            options={[
              ["all", "ທຸກໝວດໝູ່"],
              ...categoryOptions.map((v) => [v, categoryLabel(v)] as const),
            ]}
          />
          <SelectField
            label="ຈັດລຽງຕາມ"
            value={sort}
            onChange={setSort}
            options={[
              ["recent", "ກອງທຶນໃໝ່ລ່າສຸດ"],
              ["raised", "ຍອດລະດົມທຶນ"],
              ["ending", "ໃກ້ສິ້ນສຸດ"],
            ]}
          />
        </div>
        <details className="advanced-filters">
          <summary>ຕົວເລືອກການຄົ້ນຫາເພີ່ມເຕີມ</summary>
          <div className="filters">
            <SelectField
              label="ຮູບແບບ"
              value={mode}
              onChange={setMode}
              options={[
                ["all", "ທຸກຮູບແບບ"],
                ["0", "ມີເປົ້າໝາຍ"],
                ["1", "ຕໍ່ເນື່ອງ"],
              ]}
            />
            <SelectField
              label="ສະຖານະ"
              value={status}
              onChange={setStatus}
              options={[
                ["all", "ທຸກສະຖານະ"],
                ...fundStatusLabels.map((v, i) => [String(i), v] as const),
              ]}
            />
            <SelectField
              label="ຖ້າບໍ່ເຖິງເປົ້າໝາຍ"
              value={policy}
              onChange={setPolicy}
              options={[
                ["all", "ທຸກເງື່ອນໄຂ"],
                ["0", "ຄືນເງິນ"],
                ["1", "ເກັບເງິນໄວ້"],
              ]}
            />
            <SelectField
              label="ການອະນຸມັດ"
              value={quorum}
              onChange={setQuorum}
              options={[
                ["all", "ທຸກຮູບແບບ"],
                ["single", "ຄົນດຽວ"],
                ["multi", "ຫຼາຍຄົນ"],
              ]}
            />
          </div>
        </details>
      </div>
      <div className="result-count" aria-live="polite">
        {rows.length} ກອງທຶນທີ່ກົງກັນ · ໂຫຼດແລ້ວ {loaded.length} /{" "}
        {q.data?.pages[0]?.count.toString() ?? "—"} ກອງທຶນ.
        ການຄົ້ນຫາອີງຕາມຂໍ້ມູນທີ່ໂຫຼດແລ້ວ.
      </div>
      <ErrorNotice error={q.error} />
      {q.isLoading ? (
        <Loading />
      ) : rows.length ? (
        <div className="fund-grid">
          {rows.map((row) => (
            <FundCard key={String(row.id)} row={row} d={d} />
          ))}
        </div>
      ) : !q.error ? (
        <div className="featured-empty">
          <EmptyState description="ລອງໃຊ້ຄຳຄົ້ນຫາອື່ນ ຫຼືປ່ຽນໝວດໝູ່ເພື່ອເບິ່ງກອງທຶນເພີ່ມ." />
          <Button variant="outline" onClick={reset}>
            ລ້າງຕົວເລືອກການຄົ້ນຫາ
          </Button>
        </div>
      ) : null}
      {q.hasNextPage ? (
        <Button
          variant="outline"
          disabled={q.isFetchingNextPage}
          onClick={() => q.fetchNextPage()}
        >
          {q.isFetchingNextPage ? "ກຳລັງໂຫຼດ…" : "ໂຫຼດກອງທຶນເພີ່ມ"}
        </Button>
      ) : null}
    </div>
  );
}
