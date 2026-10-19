import { useState } from "react";
import { Link, NavLink, Outlet, useMatch } from "react-router-dom";
import { ArrowUpRight, HeartHandshake, Menu, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "./i18n";
import { Connect } from "@/features/wallet/Connect";
import {
  defaultDeployment,
  resolveDeployment,
  deploymentConfigurationError,
} from "@/web3/deployments";
import { ErrorNotice } from "@/components/common";
export function Layout() {
  const { t, language, setLanguage } = useLanguage();
  const [menu, setMenu] = useState(false);
  const fundRoute = useMatch("/funds/:version/*");
  const d = resolveDeployment(fundRoute?.params.version) ?? defaultDeployment;
  return (
    <>
      <div className="network-bar">
        {d?.name ?? "OpenFund"} ·{" "}
        {d?.demoMode
          ? "DEMO OFL / NOT FIAT-BACKED"
          : "Experimental unaudited protocol"}
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="brand">
            <span className="brand-mark">
              <HeartHandshake />
            </span>
            <span>
              OpenFund<span className="brand-sub">LAOS / ລາວ</span>
            </span>
          </Link>
          <nav
            aria-label="Main navigation"
            className={menu ? "main-nav open" : "main-nav"}
          >
            {(["explore", "dashboard", "protocol", "about"] as const).map(
              (key, i) => (
                <NavLink
                  key={key}
                  to={["/funds", "/dashboard", "/protocol", "/about"][i]}
                  onClick={() => setMenu(false)}
                >
                  {t(key)}
                </NavLink>
              ),
            )}
          </nav>
          <div className="header-actions">
            <Button
              variant="ghost"
              onClick={() => setLanguage(language === "lo" ? "en" : "lo")}
            >
              {language === "lo" ? "EN" : "ລາວ"}
            </Button>
            <Connect chainId={d?.chainId} />
            <Button
              variant="outline"
              aria-label="Toggle navigation"
              className="mobile-toggle"
              onClick={() => setMenu(!menu)}
            >
              <Menu />
            </Button>
          </div>
        </div>
      </header>
      <main className="site-main">
        <ErrorNotice error={deploymentConfigurationError} />
        <Outlet />
      </main>
      <footer>
        <div className="footer-inner">
          <div>
            <Link className="brand" to="/">
              <HeartHandshake /> OpenFund Laos
            </Link>
            <p>Community funding. Public by design.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Link to="/protocol">
              Official deployments <ArrowUpRight className="inline-icon" />
            </Link>
            <Link to="/about">Rules, risks & privacy</Link>
            <Link to="/transactions">Public transaction history</Link>
          </div>
          <div className="footer-note">
            <ShieldCheck />
            <p>
              Official protocol membership does not verify a charity’s identity.
              OFL’s LAK value is a target reference; DEMO OFL has no fiat
              backing.
            </p>
            <Badge variant="outline">
              Client-only · No application backend
            </Badge>
          </div>
        </div>
      </footer>
    </>
  );
}
