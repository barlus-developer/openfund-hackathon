import {
  ChevronRight,
  HandHeart,
  Infinity as InfinityIcon,
  Target,
} from "lucide-react";
import { Link } from "react-router-dom";

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
import { Reveal } from "@/components/motion";
import { FundCover } from "./FundImages";
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
  compact = false,
}: {
  row: FundRow;
  showLabel?: boolean;
  compact?: boolean;
}) {
  const f = row.fund;
  const goal = f.config.fundingGoal;
  const progress = goal ? Number((f.totalRaised * 10000n) / goal) / 100 : 0;
  return (
    <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-3"}`}>
      {showLabel ? (
        <p className="text-sm text-muted-foreground">ຍອດສະໜັບສະໜູນ</p>
      ) : null}
      <p
        className={`break-words font-semibold tabular-nums ${compact ? "text-xl leading-6" : "text-2xl"}`}
      >
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
  // Free-form descriptive metadata; topics never determine funding behavior.
  const topics = [
    ...new Set(
      (f.category || "")
        .split(/[,;|]/)
        .map((topic) => categoryLabel(topic.trim()))
        .filter(Boolean),
    ),
  ].slice(0, 3);
  const continuous = f.config.fundingMode === 1;
  // TARGETED funds always have a goal and a deadline; the goal caps donations.
  // Use the immutable on-chain mode, regardless of category or current status.
  const Icon = continuous ? InfinityIcon : Target;
  const accepts =
    row.status === 0 || (row.status === 1 && f.config.fundingMode === 1);
  return (
    <Reveal className="h-full min-w-0">
      <article className="min-w-0 h-full">
        <Card className="fund-card group h-full gap-0 border p-0 ring-0">
          <div className="relative isolate overflow-hidden">
            <Link
              to={manager ? managerFundPath(d, row.id) : fundPath(d, row.id)}
              aria-label={f.title}
              className="block focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ring"
            >
              <FundCover
                uri={f.metadataURI}
                hash={f.metadataHash}
                title={f.title}
              />
            </Link>
            <span
              role="img"
              aria-label={
                continuous ? "ຮັບສະໜັບສະໜູນຕໍ່ເນື່ອງ" : "ລະດົມທຶນຕາມເປົ້າໝາຍ"
              }
              className="pointer-events-none absolute bottom-2 left-2 inline-flex size-8 items-center justify-center rounded-lg bg-background/95 text-primary shadow-sm backdrop-blur transition-opacity duration-250 group-hover:opacity-0 motion-reduce:transition-none"
            >
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <Badge
              variant="secondary"
              className="pointer-events-none absolute top-2 right-2 h-6 max-w-[calc(100%-4rem)] truncate bg-background/95 px-2 text-[11px] text-foreground shadow-sm backdrop-blur transition-opacity duration-250 group-hover:opacity-0 motion-reduce:transition-none"
            >
              {fundStatusLabels[row.status]}
            </Badge>
          </div>
          <CardHeader className="gap-1.5 px-4 pt-3 pb-1">
            <CardTitle as="h3" className="line-clamp-2 text-base leading-6">
              <Link
                to={manager ? managerFundPath(d, row.id) : fundPath(d, row.id)}
                className="hover:text-primary"
              >
                {f.title}
              </Link>
            </CardTitle>
            <CardDescription className="line-clamp-2 text-sm leading-5">
              {f.summary}
            </CardDescription>
            {topics.length > 0 ? (
              <ul
                aria-label="ຫົວຂໍ້ກອງທຶນ"
                className="flex min-w-0 flex-wrap gap-1"
              >
                {topics.map((topic) => (
                  <li key={topic} className="min-w-0 max-w-full">
                    <Badge
                      variant="secondary"
                      className="h-auto min-h-5 max-w-full px-1.5 py-0 whitespace-normal wrap-anywhere text-[11px]"
                    >
                      {topic}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardHeader>
          <CardContent className="mt-auto px-4 pt-2 pb-1">
            <FundProgress row={row} showLabel={false} compact />
          </CardContent>
          <CardFooter className="flex flex-wrap items-center justify-between gap-1.5 px-4 pt-2 pb-3">
            {f.config.deadline > 0n ? (
              <span className="w-full text-xs leading-4 text-muted-foreground">
                ສິ້ນສຸດ{" "}
                {new Date(Number(f.config.deadline) * 1000).toLocaleDateString(
                  "lo-LA",
                  { day: "numeric", month: "short", year: "numeric" },
                )}
              </span>
            ) : null}
            <div className="flex w-full flex-wrap items-center justify-between gap-1.5">
              <Link
                to={manager ? managerFundPath(d, row.id) : fundPath(d, row.id)}
                className={`${buttonVariants({ variant: "ghost", size: "sm" })} min-h-11`}
              >
                {manager ? "ຈັດການກອງທຶນ" : "ເບິ່ງກອງທຶນ"}
                <ChevronRight data-icon="inline-end" aria-hidden="true" />
              </Link>
              {!manager && accepts ? (
                <Link
                  to={fundPath(d, row.id) + "/donate"}
                  aria-label={`ຮ່ວມສະໜັບສະໜູນ ${f.title}`}
                  className={`${buttonVariants({ size: "sm" })} min-h-11`}
                >
                  <HandHeart data-icon="inline-start" aria-hidden="true" />
                  ຮ່ວມສະໜັບສະໜູນ
                </Link>
              ) : null}
            </div>
          </CardFooter>
        </Card>
      </article>
    </Reveal>
  );
}
