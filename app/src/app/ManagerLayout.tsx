import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Suspense, useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useMatch,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  LayoutDashboard,
  FolderOpen,
  Plus,
  ListChecks,
  ArrowLeftRight,
  Wallet,
  Network,
  Menu,
} from "lucide-react";
import { Brand, DemoBanner, SkipLink } from "./Layout";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Loading } from "@/components/common";
import { RouteSurface } from "@/components/motion";
import { Connect } from "@/features/wallet/Connect";
import { defaultDeployment, resolveDeployment } from "@/web3/deployments";

const items = [
  { to: "/manager", label: "ພາບລວມ", icon: LayoutDashboard, end: true },
  { to: "/manager/funds", label: "ກອງທຶນຂອງຂ້ອຍ", icon: FolderOpen },
  { to: "/manager/approvals", label: "ລໍຖ້າອະນຸມັດ", icon: ListChecks },
  { to: "/manager/transactions", label: "ປະຫວັດກອງທຶນ", icon: ArrowLeftRight },
  { to: "/manager/wallet", label: "ກະເປົາ", icon: Wallet },
  { to: "/manager/network", label: "ຂໍ້ມູນເຄືອຂ່າຍ", icon: Network },
];
function ManagerNavigation({ close }: { close?: () => void }) {
  const [params] = useSearchParams();
  const match = useMatch("/manager/funds/:version/:fundId/*");
  const version = match?.params.version ?? params.get("deployment");
  const query = version ? `?deployment=${encodeURIComponent(version)}` : "";
  return (
    <nav aria-label="Funding Manager" className="flex flex-col gap-2">
      <Link
        to={"/manager/create" + query}
        onClick={close}
        className={buttonVariants({ className: "mb-5" })}
      >
        <Plus data-icon="inline-start" aria-hidden="true" />
        ສ້າງກອງທຶນ
      </Link>
      {items.map(({ icon: Icon, ...item }) => (
        <NavLink
          key={item.to}
          to={item.to + query}
          end={item.end}
          onClick={close}
          className={buttonVariants({
            variant: "ghost",
            className:
              "justify-start gap-3 aria-[current=page]:bg-secondary aria-[current=page]:text-primary",
          })}
        >
          <Icon data-icon="inline-start" aria-hidden="true" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
export function ManagerLayout() {
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const match = useMatch("/manager/funds/:version/:fundId/*");
  const d =
    resolveDeployment(
      match?.params.version ?? params.get("deployment") ?? undefined,
    ) ?? defaultDeployment;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <>
      <SkipLink />
      <DemoBanner demo={d?.demoMode} />
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            <Brand />
            <span className="hidden border-l pl-4 text-sm font-medium text-muted-foreground sm:block">
              Funding Manager
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden md:block">
              <Link
                to="/funds"
                className={buttonVariants({
                  variant: "ghost",
                })}
              >
                <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                ໜ້າສະໜັບສະໜູນ
              </Link>
            </div>
            <Connect chainId={d?.chainId} compact />
            <Sheet open={menu} onOpenChange={setMenu}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <SheetTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="lg:hidden"
                          aria-label="ເປີດເມນູຈັດການ"
                        />
                      }
                    >
                      <Menu aria-hidden="true" />
                    </SheetTrigger>
                  }
                />
                <TooltipContent>ເປີດເມນູຈັດການ</TooltipContent>
              </Tooltip>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Funding Manager</SheetTitle>
                </SheetHeader>
                <div className="px-4">
                  <ManagerNavigation close={() => setMenu(false)} />
                  <Link
                    to="/funds"
                    onClick={() => setMenu(false)}
                    className={buttonVariants({
                      variant: "ghost",
                      className: "mt-6 w-full justify-start",
                    })}
                  >
                    <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                    ໜ້າສະໜັບສະໜູນ
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <div className="mx-auto grid min-h-[80vh] max-w-[1440px] lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden border-r bg-muted/40 px-5 py-8 lg:block">
          <div className="sticky top-8 flex flex-col gap-8">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">
              FUNDING MANAGER
            </p>
            <ManagerNavigation />
          </div>
        </aside>
        <main
          id="main-content"
          tabIndex={-1}
          className="flex min-w-0 flex-col gap-8 px-5 py-8 outline-none sm:px-8 lg:p-10"
        >
          <RouteSurface>
            <Suspense fallback={<Loading />}>
              <Outlet />
            </Suspense>
          </RouteSurface>
        </main>
      </div>
    </>
  );
}
