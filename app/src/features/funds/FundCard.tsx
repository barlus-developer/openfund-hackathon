import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatOfl } from "@/lib/amount";
import { fundPath, type Deployment } from "@/web3/deployments";
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
export function FundCard({ row, d }: { row: FundRow; d: Deployment }) {
  const f = row.fund;
  return (
    <Link
      to={fundPath(d, row.id)}
      aria-label={`ເບິ່ງກອງທຶນ ${f.title}`}
      className="group block h-full min-w-0 rounded-xl"
    >
      <Card className="h-full transition-colors group-hover:ring-primary/40 group-focus-visible:ring-primary">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {categoryLabel(f.category || "Projects")}
            </span>
            <Badge variant="secondary">{fundStatusLabels[row.status]}</Badge>
          </div>
          <CardTitle as="h3">{f.title}</CardTitle>
          <CardDescription className="line-clamp-2">
            {f.summary}
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-auto">
          <FundProgress row={row} />
        </CardContent>
        <CardFooter className="flex flex-wrap justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {f.config.fundingGoal > 0n
              ? new Date(Number(f.config.deadline) * 1000).toLocaleDateString(
                  "lo-LA",
                  { day: "numeric", month: "short", year: "numeric" },
                )
              : "ບໍ່ມີວັນສິ້ນສຸດ"}
          </span>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
            ເບິ່ງກອງທຶນ <ArrowRight className="size-4" aria-hidden="true" />
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
