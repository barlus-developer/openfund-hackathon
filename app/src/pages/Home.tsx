import { ArrowRight, BookOpen, HeartPulse, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { defaultDeployment } from "@/web3/deployments";
import { useFunds } from "@/web3/reads";
import { FundCard } from "@/features/funds/FundCard";
import {
  ActionLink,
  EmptyState,
  ErrorNotice,
  Loading,
} from "@/components/common";
import { Button, buttonVariants } from "@/components/ui/button";

const categories = [
  { icon: BookOpen, label: "ການສຶກສາ", value: "Education" },
  { icon: HeartPulse, label: "ສຸຂະພາບ", value: "Healthcare" },
  { icon: Users, label: "ຊຸມຊົນ", value: "Community" },
];

export function Home() {
  return (
    <div className="flex flex-col gap-12 sm:gap-16">
      <section className="flex max-w-2xl flex-col items-start gap-6 py-6 sm:py-10">
        <h1 className="text-3xl font-semibold leading-relaxed sm:text-5xl sm:leading-relaxed">
          ຮ່ວມສ້າງສິ່ງດີໆ
          <br />
          <span className="text-primary">ໃຫ້ຊຸມຊົນຂອງເຮົາ.</span>
        </h1>
        <p className="text-base text-muted-foreground">
          ເລືອກກອງທຶນ ຮ່ວມສະໜັບສະໜູນ ແລະຕິດຕາມການໃຊ້ເງິນ.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <ActionLink to="/funds">
            ຄົ້ນຫາກອງທຶນ{" "}
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </ActionLink>
          <Link
            to="/funds/create"
            className={buttonVariants({ variant: "ghost", size: "lg" })}
          >
            ສ້າງກອງທຶນ
          </Link>
        </div>
      </section>
      <section aria-labelledby="recent-funds" className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="recent-funds" className="text-xl font-semibold">
            ກອງທຶນລ່າສຸດ
          </h2>
          <Link to="/funds" className={buttonVariants({ variant: "link" })}>
            ເບິ່ງທັງໝົດ <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="ໝວດໝູ່ກອງທຶນ">
          {categories.map(({ icon: Icon, label, value }) => (
            <Link
              key={value}
              to={`/funds?category=${value}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Icon data-icon="inline-start" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </div>
        {defaultDeployment ? (
          <RecentFunds />
        ) : (
          <EmptyState
            title="ຍັງບໍ່ມີກອງທຶນ"
            description="ກະລຸນາລອງໃໝ່ພາຍຫຼັງ."
          />
        )}
      </section>
    </div>
  );
}
function RecentFunds() {
  const d = defaultDeployment!;
  const q = useFunds(d);
  const rows = q.data?.pages.flatMap((p) => p.rows).slice(0, 3) ?? [];
  if (q.isLoading) return <Loading cards />;
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
  if (!rows.length)
    return (
      <EmptyState
        title="ຍັງບໍ່ມີກອງທຶນ"
        action={
          <ActionLink to="/funds/create" outline>
            ສ້າງກອງທຶນ
          </ActionLink>
        }
      />
    );
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <FundCard key={String(row.id)} row={row} d={d} />
      ))}
    </div>
  );
}
