import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useMatch } from "react-router-dom";
import { ArrowUpRight, Layers, Menu, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Connect } from "@/features/wallet/Connect";
import {
  defaultDeployment,
  resolveDeployment,
  deploymentConfigurationError,
} from "@/web3/deployments";
import { ErrorNotice } from "@/components/common";

export function Layout() {
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();
  const fundRoute = useMatch("/funds/:version/*");
  const d = resolveDeployment(fundRoute?.params.version) ?? defaultDeployment;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        ຂ້າມໄປເນື້ອຫາ
      </a>
      <div className="ambient-background" aria-hidden="true">
        <span />
        <span />
      </div>
      <div className="network-bar">
        <span className="status-dot" />
        {d?.demoMode
          ? "ພື້ນທີ່ທົດລອງ · OFL ທົດລອງບໍ່ສາມາດແລກເປັນເງິນກີບໄດ້"
          : "ລະບົບທົດລອງ · ກະລຸນາອ່ານເງື່ອນໄຂກ່ອນສະໜັບສະໜູນ"}
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="brand" aria-label="ໜ້າຫຼັກ">
            <span className="brand-mark">
              <Layers />
            </span>
            <span>
              OpenFund<span className="brand-sub">ສຳລັບອົງກອນ ແລະມູນນິທິ</span>
            </span>
          </Link>
          <nav
            id="main-navigation"
            aria-label="ເມນູຫຼັກ"
            className={menu ? "main-nav open" : "main-nav"}
          >
            {[
              ["/funds", "ຄົ້ນຫາກອງທຶນ"],
              ["/dashboard", "ກອງທຶນຂອງຂ້ອຍ"],
              ["/about", "ວິທີໃຊ້ງານ"],
            ].map(([to, label]) => (
              <NavLink key={to} to={to} onClick={() => setMenu(false)}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <Connect chainId={d?.chainId} />
            <Button
              variant="ghost"
              size="icon"
              aria-label={menu ? "ປິດເມນູ" : "ເປີດເມນູ"}
              aria-expanded={menu}
              aria-controls="main-navigation"
              className="mobile-toggle"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
      </header>
      <main id="main-content" className="site-main" tabIndex={-1}>
        <ErrorNotice error={deploymentConfigurationError} />
        <Outlet />
      </main>
      <footer>
        <div className="footer-inner">
          <div>
            <Link className="brand" to="/">
              <span className="brand-mark">
                <Layers />
              </span>
              OpenFund
            </Link>
            <p>ລະດົມທຶນເພື່ອພາລະກິດຂອງອົງກອນ ແລະມູນນິທິ.</p>
          </div>
          <nav aria-label="ຂໍ້ມູນເພີ່ມເຕີມ" className="footer-links">
            <Link to="/about">ວິທີໃຊ້ ແລະເງື່ອນໄຂ</Link>
            <Link to="/transactions">
              ຕິດຕາມການສະໜັບສະໜູນ <ArrowUpRight className="inline-icon" />
            </Link>
            <Link to="/protocol">ຂໍ້ມູນເຄືອຂ່າຍ</Link>
          </nav>
          <div className="footer-note">
            <ShieldCheck />
            <p>
              ກະລຸນາກວດສອບຜູ້ຈັດການກອງທຶນກ່ອນສະໜັບສະໜູນ.
              ຂໍ້ມູນສາທາລະນະຊ່ວຍໃຫ້ຕິດຕາມໄດ້ ແຕ່ບໍ່ໄດ້ຮັບຮອງການນຳໃຊ້ເງິນ.
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>OpenFund · ຮ່ວມທຶນ ຮ່ວມສ້າງ</span>
          <span>
            ດ້ວຍຄວາມໃສ່ໃຈ <Layers className="inline-icon" />
          </span>
        </div>
      </footer>
    </>
  );
}
