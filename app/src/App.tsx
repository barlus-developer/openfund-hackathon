import React, { lazy } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";
import { WagmiProvider, type Config } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "./web3/config";
import { LanguageProvider } from "./app/i18n";
import { Layout } from "./app/Layout";
import { ManagerLayout } from "./app/ManagerLayout";
import { ManagerFundOverview } from "./features/funds/ManagerFundOverview";
import { Home } from "./pages/Home";
import { Explore } from "./pages/Explore";
import { FundLayout } from "./features/funds/FundLayout";
import { FundOverview } from "./features/funds/FundOverview";
import { Donate } from "./features/donation/Donate";
import {
  Governance,
  ProposalList,
  ProposalDetail,
} from "./features/governance/Proposals";
import {
  FundActivity,
  FundPayouts,
  GlobalActivity,
} from "./features/transparency/Activity";
import { EmptyState, ActionLink } from "./components/common";
import { About } from "./pages/About";
import { Protocol } from "./pages/Protocol";
import "./styles/globals.css";
import { Toaster } from "./components/ui/toast";
const CreateFund = lazy(() =>
  import("./features/funds/CreateFund").then((m) => ({
    default: m.CreateFund,
  })),
);
const Manage = lazy(() =>
  import("./features/governance/Manage").then((m) => ({ default: m.Manage })),
);
const Reports = lazy(() =>
  import("./features/reports/Reports").then((m) => ({ default: m.Reports })),
);
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const Wallet = lazy(() =>
  import("./pages/Wallet").then((m) => ({ default: m.WalletPage })),
);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5000, refetchOnWindowFocus: false },
  },
});
export function App({ walletConfig = config }: { walletConfig?: Config }) {
  return (
    <React.StrictMode>
      <WagmiProvider config={walletConfig}>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <HashRouter>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="funds" element={<Explore />} />
                  <Route
                    path="funds/create"
                    element={<Navigate to="/manager/create" replace />}
                  />
                  <Route
                    path="funds/:version/:fundId/governance"
                    element={<LegacyFundRoute section="governance" />}
                  />
                  <Route
                    path="funds/:version/:fundId/proposals"
                    element={<LegacyFundRoute section="proposals" />}
                  />
                  <Route
                    path="funds/:version/:fundId/proposals/:proposalId"
                    element={<LegacyFundRoute section="proposals" />}
                  />
                  <Route
                    path="funds/:version/:fundId/manage"
                    element={<LegacyFundRoute section="spending" />}
                  />
                  <Route path="funds/:version/:fundId" element={<FundLayout />}>
                    <Route index element={<FundOverview />} />
                    <Route path="donate" element={<Donate />} />
                    <Route path="transactions" element={<FundActivity />} />
                    <Route path="payouts" element={<FundPayouts />} />
                    <Route path="reports" element={<Reports />} />
                  </Route>
                  <Route
                    path="donations"
                    element={<Dashboard section="donations" />}
                  />
                  <Route
                    path="donations/refunds"
                    element={<Dashboard section="refunds" />}
                  />
                  <Route path="dashboard" element={<LegacyDashboard />} />
                  <Route
                    path="dashboard/:section"
                    element={<LegacyDashboard />}
                  />
                  <Route path="wallet" element={<Wallet />} />
                  <Route path="transactions" element={<GlobalActivity />} />
                  <Route path="protocol" element={<Protocol />} />
                  <Route path="about" element={<About />} />
                  <Route
                    path="*"
                    element={
                      <EmptyState
                        description="ບໍ່ພົບໜ້ານີ້. ກະລຸນາໃຊ້ເມນູເພື່ອຄົ້ນຫາກອງທຶນ."
                        action={
                          <ActionLink to="/funds">ຄົ້ນຫາກອງທຶນ</ActionLink>
                        }
                      />
                    }
                  />
                </Route>
                <Route path="manager" element={<ManagerLayout />}>
                  <Route
                    index
                    element={<Dashboard section="overview" manager />}
                  />
                  <Route
                    path="funds"
                    element={<Dashboard section="funds" manager />}
                  />
                  <Route path="create" element={<CreateFund />} />
                  <Route
                    path="approvals"
                    element={<Dashboard section="approvals" manager />}
                  />
                  <Route
                    path="transactions"
                    element={<Dashboard section="transactions" manager />}
                  />
                  <Route path="wallet" element={<Wallet />} />
                  <Route path="network" element={<Protocol />} />
                  <Route
                    path="funds/:version/:fundId"
                    element={<FundLayout manager />}
                  >
                    <Route index element={<ManagerFundOverview />} />
                    <Route path="governance" element={<Governance />} />
                    <Route path="proposals" element={<ProposalList />} />
                    <Route
                      path="proposals/:proposalId"
                      element={<ProposalDetail />}
                    />
                    <Route path="transactions" element={<FundActivity />} />
                    <Route path="payouts" element={<FundPayouts />} />
                    <Route path="reports" element={<Reports />} />
                    <Route
                      path="spending"
                      element={<Manage key="spending" />}
                    />
                    <Route
                      path="settings"
                      element={<Manage key="settings" settingsOnly />}
                    />
                  </Route>
                  <Route
                    path="*"
                    element={
                      <EmptyState
                        title="ບໍ່ພົບໜ້ານີ້"
                        action={
                          <ActionLink to="/manager">
                            ກັບໄປ Funding Manager
                          </ActionLink>
                        }
                      />
                    }
                  />
                </Route>
              </Routes>
              <Toaster />
            </HashRouter>
          </LanguageProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </React.StrictMode>
  );
}

function LegacyFundRoute({ section }: { section: string }) {
  const { version, fundId, proposalId } = useParams();
  return (
    <Navigate
      to={`/manager/funds/${version}/${fundId}/${section}${proposalId ? `/${proposalId}` : ""}`}
      replace
    />
  );
}
function LegacyDashboard() {
  const { section } = useParams();
  const to =
    section === "donations"
      ? "/donations"
      : section === "refunds"
        ? "/donations/refunds"
        : section === "approvals"
          ? "/manager/approvals"
          : "/manager/funds";
  return <Navigate to={to} replace />;
}
