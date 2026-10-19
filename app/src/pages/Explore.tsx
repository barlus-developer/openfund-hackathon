import { PageHeader, Disclosure } from "@/components/patterns";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { useFunds } from "@/web3/reads";
import { defaultDeployment, deployments } from "@/web3/deployments";
import { FundCard } from "@/features/funds/FundCard";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@/components/ui/input-group";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
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
      <PageHeader
        title="ຄົ້ນຫາກອງທຶນ"
        description="ເລືອກກອງທຶນທີ່ເຈົ້າຢາກສະໜັບສະໜູນ."
      />
      {d ? (
        <>
          {deployments.length > 1 ? (
            <Disclosure title="ເລືອກເຄືອຂ່າຍ">
              <SelectField
                label="ເຄືອຂ່າຍ"
                value={version!}
                onChange={setVersion}
                options={deployments.map((d) => [
                  d.version,
                  `${d.chainId} · ${d.version}`,
                ])}
              />
            </Disclosure>
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
  const hasFilters =
    !!search ||
    category !== "all" ||
    mode !== "all" ||
    status !== "all" ||
    policy !== "all" ||
    quorum !== "all";
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
    <div className="flex min-w-0 flex-col gap-6">
      <section aria-label="ຄົ້ນຫາ ແລະກັ່ນຕອງກອງທຶນ">
        <FieldGroup>
          <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[2fr_1fr_1fr]">
            <Field>
              <FieldLabel htmlFor="fund-search">ຄົ້ນຫາກອງທຶນ</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Search aria-hidden="true" />
                </InputGroupAddon>
                <InputGroupInput
                  id="fund-search"
                  placeholder="ຊື່ກອງທຶນ ຫຼືສິ່ງທີ່ເຈົ້າສົນໃຈ…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </InputGroup>
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
          <Disclosure title={<>ຕົວເລືອກເພີ່ມເຕີມ</>}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          </Disclosure>
        </FieldGroup>
      </section>
      <div
        className="text-xs leading-7 text-muted-foreground"
        aria-live="polite"
      >
        {q.isLoading ? "" : `${rows.length} ກອງທຶນ`}
        {q.hasNextPage
          ? ` · ຄົ້ນຫາໃນ ${loaded.length} / ${q.data?.pages[0]?.count.toString() ?? "—"} ກອງທຶນທີ່ໂຫຼດແລ້ວ`
          : ""}
      </div>
      {hasFilters && rows.length > 0 ? (
        <div>
          <Button variant="ghost" size="sm" onClick={reset}>
            ລ້າງຕົວເລືອກການຄົ້ນຫາ
          </Button>
        </div>
      ) : null}
      <ErrorNotice error={q.error} />
      {q.error ? (
        <div>
          <Button
            variant="outline"
            disabled={q.isFetching}
            onClick={() => q.refetch()}
          >
            ລອງໂຫຼດໃໝ່
          </Button>
        </div>
      ) : null}
      {q.isLoading ? (
        <Loading cards />
      ) : rows.length ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <FundCard key={String(row.id)} row={row} d={d} />
          ))}
        </div>
      ) : !q.error ? (
        <EmptyState
          title={hasFilters ? "ບໍ່ພົບກອງທຶນ" : "ຍັງບໍ່ມີກອງທຶນ"}
          description={
            hasFilters ? "ລອງໃຊ້ຄຳຄົ້ນຫາອື່ນ ຫຼືປ່ຽນໝວດໝູ່." : undefined
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={reset}>
                ລ້າງຕົວເລືອກການຄົ້ນຫາ
              </Button>
            ) : (
              <ActionLink to="/funds/create" outline>
                ສ້າງກອງທຶນ
              </ActionLink>
            )
          }
        />
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
