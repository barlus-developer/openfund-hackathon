import { Link } from "react-router-dom";
import {
  BookOpen,
  HeartPulse,
  Rocket,
  ShieldCheck,
  BriefcaseBusiness,
  ArrowUpRight,
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
import { Badge } from "@/components/ui/badge";
import { ofl, date } from "@/lib/amount";
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
export function FundCard({ row, d }: { row: FundRow; d: Deployment }) {
  const { t } = useLanguage();
  const f = row.fund;
  const Icon =
    f.category === "Healthcare"
      ? HeartPulse
      : f.category === "Education"
        ? BookOpen
        : f.category === "Business" || f.category === "ທຸລະກິດ"
          ? BriefcaseBusiness
          : Rocket;
  const progress = f.config.fundingGoal
    ? Number((f.totalRaised * 10000n) / f.config.fundingGoal) / 100
    : 0;
  return (
    <Link to={fundPath(d, row.id)}>
      <Card className="fund-card overflow-hidden h-full">
        <div className="fund-card-top">
          <Icon />
          <Badge variant="outline">
            {categoryLabel(f.category || "Projects")}
          </Badge>
        </div>
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{fundStatusLabels[row.status]}</Badge>
            <Badge variant="outline">
              {f.config.fundingMode === 0 ? "ມີເປົ້າໝາຍ" : "ຕໍ່ເນື່ອງ"}
            </Badge>
          </div>
          <CardTitle>{f.title}</CardTitle>
          <CardDescription>{f.summary}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <small>{t("raised")}</small>
            <p className="m-0">
              <strong>{ofl(f.totalRaised)} OFL</strong>
              {f.config.fundingGoal > 0n ? (
                <small> / {ofl(f.config.fundingGoal)}</small>
              ) : null}
            </p>
          </div>
          {f.config.fundingGoal > 0n ? (
            <>
              <Progress
                aria-label="ຄວາມຄືບໜ້າການລະດົມທຶນ"
                value={Math.min(100, progress)}
                max={100}
              />
              <small>
                {progress.toLocaleString("lo-LA", { maximumFractionDigits: 1 })}
                % · {date(f.config.deadline)}
              </small>
            </>
          ) : null}
          <small>
            <Policy row={row} />
          </small>
        </CardContent>
        <CardFooter className="flex justify-between">
          <small>
            <ShieldCheck className="inline-icon" /> {f.threshold}/
            {row.approvers.length} ການອະນຸມັດ{" "}
          </small>
          <span className="text-link">
            ເບິ່ງກອງທຶນ <ArrowUpRight />
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
