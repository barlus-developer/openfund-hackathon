import React, { lazy, Suspense } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { WagmiProvider, type Config } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "./web3/config";
import { LanguageProvider } from "./app/i18n";
import { Layout } from "./app/Layout";
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
import { EmptyState, Loading } from "./components/common";
import { About } from "./pages/About";
import { Protocol } from "./pages/Protocol";
import "./styles/globals.css";
import { Toaster } from "./components/ui/sonner";
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
              <Suspense fallback={<Loading />}>
                <Routes>
                  <Route element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="funds" element={<Explore />} />
                    <Route path="funds/create" element={<CreateFund />} />
                    <Route
                      path="funds/:version/:fundId"
                      element={<FundLayout />}
                    >
                      <Route index element={<FundOverview />} />
                      <Route path="donate" element={<Donate />} />
                      <Route path="governance" element={<Governance />} />
                      <Route path="proposals" element={<ProposalList />} />
                      <Route
                        path="proposals/:proposalId"
                        element={<ProposalDetail />}
                      />
                      <Route path="transactions" element={<FundActivity />} />
                      <Route path="payouts" element={<FundPayouts />} />
                      <Route path="reports" element={<Reports />} />
                      <Route path="manage" element={<Manage />} />
                    </Route>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="dashboard/:section" element={<Dashboard />} />
                    <Route path="wallet" element={<Wallet />} />
                    <Route path="transactions" element={<GlobalActivity />} />
                    <Route path="protocol" element={<Protocol />} />
                    <Route path="about" element={<About />} />
                    <Route
                      path="*"
                      element={
                        <EmptyState description="ບໍ່ພົບໜ້ານີ້. ກະລຸນາໃຊ້ເມນູເພື່ອຄົ້ນຫາກອງທຶນ." />
                      }
                    />
                  </Route>
                </Routes>
                <Toaster />
              </Suspense>
            </HashRouter>
          </LanguageProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </React.StrictMode>
  );
}
