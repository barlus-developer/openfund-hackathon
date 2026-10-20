import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  HeartPulse,
  Users,
  FolderHeart,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatOfl } from "@/lib/amount";
import { fundPath, managerFundPath, type Deployment } from "@/web3/deployments";
import { type FundRow } from "@/web3/reads";
import { fundStatusLabels, categoryLabel } from "@/app/labels";
import { useLanguage } from "@/app/i18n";
export function Policy({ row }: { row: FundRow }) {
  const { t } = useLanguage();
  return (
    <>
      {t(
        row.fund.config.fundingMode === 1
          ? "continuousPolicy"
          : row.fund.config.underfundingPolicy === 0
            ? "refundPolicy"
            : "keepPolicy",
      )}
    </>
  );
}
export function FundProgress({
  row,
  showLabel = true,
}: {
  row: FundRow;
  showLabel?: boolean;
}) {
  const f = row.fund;
  const goal = f.config.fundingGoal;
  const progress = goal ? Number((f.totalRaised * 10000n) / goal) / 100 : 0;
  return (
    <div className="flex flex-col gap-3">
      {showLabel ? (
        <p className="text-sm text-muted-foreground">ຍອດສະໜັບສະໜູນ</p>
      ) : null}
      <p className="break-words text-2xl font-semibold tabular-nums">
        {formatOfl(f.totalRaised)}{" "}
        <span className="text-sm font-normal">OFL</span>
      </p>
      {goal > 0n ? (
        <>
          <Progress
            aria-label="ຄວາມຄືບໜ້າການລະດົມທຶນ"
            value={Math.min(100, Math.max(0, progress))}
            max={100}
          />
          <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
            <span>ເປົ້າໝາຍ {formatOfl(goal)} OFL</span>
            <span>
              {progress.toLocaleString("lo-LA", { maximumFractionDigits: 1 })}%
            </span>
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">ຮັບສະໜັບສະໜູນຕໍ່ເນື່ອງ</p>
      )}
    </div>
  );
}
export function FundCard({
  row,
  d,
  manager = false,
}: {
  row: FundRow;
  d: Deployment;
  manager?: boolean;
}) {
  const f = row.fund;
  const Icon = /education|ສຶກສາ/i.test(f.category)
    ? BookOpen
    : /health|ສຸຂະພາບ/i.test(f.category)
      ? HeartPulse
      : /community|ຊຸມຊົນ/i.test(f.category)
        ? Users
        : FolderHeart;
  const accepts =
    row.status === 0 || (row.status === 1 && f.config.fundingMode === 1);
  return (
    <article className="min-w-0 h-full">
      <Card className="h-full">
        <CardHeader className="gap-4">
          <div className="flex items-start justify-between gap-3">
            <Icon className="size-8 text-primary" aria-hidden="true" />
            <Badge variant="secondary">{fundStatusLabels[row.status]}</Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {categoryLabel(f.category || "Projects")}
          </span>
          <CardTitle as="h3">
            <Link
              to={manager ? managerFundPath(d, row.id) : fundPath(d, row.id)}
              className="hover:text-primary"
            >
              {f.title}
            </Link>
          </CardTitle>
          <CardDescription className="line-clamp-2">
            {f.summary}
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-auto">
          <FundProgress row={row} showLabel={false} />
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-4">
          <span className="text-xs text-muted-foreground">
            {f.config.deadline > 0n
              ? `ສິ້ນສຸດ ${new Date(Number(f.config.deadline) * 1000).toLocaleDateString("lo-LA", { day: "numeric", month: "short", year: "numeric" })}`
              : "ບໍ່ມີວັນສິ້ນສຸດ"}
          </span>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              to={manager ? managerFundPath(d, row.id) : fundPath(d, row.id)}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {manager ? "ຈັດການກອງທຶນ" : "ເບິ່ງກອງທຶນ"}
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
            {!manager && accepts ? (
              <Link
                to={fundPath(d, row.id) + "/donate"}
                aria-label={`ຮ່ວມສະໜັບສະໜູນ ${f.title}`}
                className={buttonVariants({ size: "sm" })}
              >
                ຮ່ວມສະໜັບສະໜູນ
              </Link>
            ) : null}
          </div>
        </CardFooter>
      </Card>
    </article>
  );
}
