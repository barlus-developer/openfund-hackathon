import {
  ArrowRight,
  BookOpen,
  HeartHandshake,
  ShieldCheck,
  Wallet,
  Eye,
  Users,
} from "lucide-react";
import { useLanguage } from "@/app/i18n";
import { defaultDeployment } from "@/web3/deployments";
import { useFunds } from "@/web3/reads";
import { FundCard } from "@/features/funds/FundCard";
import {
  ActionLink,
  EmptyState,
  ErrorNotice,
  Loading,
} from "@/components/common";
export function Home() {
  const { t } = useLanguage();
  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">
            <span className="status-dot" /> OPENFUND LAOS · COMMUNITY FIRST
          </div>
          <h1>{t("mission")}</h1>
          <p>{t("missionBody")}</p>
          <div className="hero-actions">
            <ActionLink to="/funds">
              {t("explore")} <ArrowRight data-icon="inline-end" />
            </ActionLink>
            <ActionLink to="/funds/create" outline>
              {t("create")}
            </ActionLink>
          </div>
          <div className="hero-note">
            <Eye size={16} />
            {t("readOnly")}
          </div>
        </div>
        <div className="hero-art">
          <span className="art-label">A clear path from giving to impact</span>
          <div className="art-line">
            <span className="art-icon">
              <Wallet />
            </span>
            <div>
              <strong>Your wallet. One donation.</strong>
              <p className="m-0 text-sm">
                OFL transfer + fund credit, atomically.
              </p>
            </div>
          </div>
          <div className="art-arrow" />
          <div className="art-line">
            <span className="art-icon">
              <Users />
            </span>
            <div>
              <strong>Community-approved spending.</strong>
              <p className="m-0 text-sm">Named approvers. Immutable rules.</p>
            </div>
          </div>
          <div className="art-arrow" />
          <div className="art-line">
            <span className="art-icon">
              <HeartHandshake />
            </span>
            <div>
              <strong>Public records, lasting accountability.</strong>
              <p className="m-0 text-sm">Follow every payout and report.</p>
            </div>
          </div>
        </div>
      </section>
      <div className="section-head">
        <div>
          <div className="eyebrow">MAKE A DIFFERENCE</div>
          <h2>{t("explore")}</h2>
          <p>Local examples. Real contract state.</p>
        </div>
        <ActionLink to="/funds" outline>
          View all <ArrowRight data-icon="inline-end" />
        </ActionLink>
      </div>
      {defaultDeployment ? (
        <Featured />
      ) : (
        <EmptyState description="Deploy to Anvil to discover live funds. No sample balances are shown before deployment." />
      )}
      <section className="trust-strip">
        <div>
          <ShieldCheck />
          <h3>Rules that stay with your fund</h3>
          <p>
            Funding mode, goal and failure policy cannot be changed after
            creation. There is no platform withdrawal role.
          </p>
        </div>
        <div>
          <Users />
          <h3>Spending needs approval</h3>
          <p>
            Every payout names a recipient and purpose. The fund’s approvers
            authorize the exact action on chain.
          </p>
        </div>
        <div>
          <BookOpen />
          <h3>Evidence, openly shared</h3>
          <p>
            Public report references help communities inspect claims. A
            reference does not establish real-world truth.
          </p>
        </div>
      </section>
    </>
  );
}
function Featured() {
  const q = useFunds(defaultDeployment!);
  return (
    <>
      <ErrorNotice error={q.error} />
      {q.isLoading ? (
        <Loading />
      ) : (
        <div className="fund-grid">
          {q.data?.pages[0]?.rows.slice(0, 3).map((row) => (
            <FundCard
              key={row.id.toString()}
              row={row}
              d={defaultDeployment!}
            />
          ))}
        </div>
      )}
    </>
  );
}
