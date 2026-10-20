import { Suspense, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useMatch } from "react-router-dom";
import { HeartHandshake, Menu, ArrowUpRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { RouteNavigation } from "@/components/patterns";
import { defaultDeployment, resolveDeployment } from "@/web3/deployments";
import { Loading } from "@/components/common";

const navigation = [
  { to: "/funds", label: "ຄົ້ນຫາກອງທຶນ" },
  { to: "/donations", label: "ການສະໜັບສະໜູນຂອງຂ້ອຍ" },
];
export function Brand() {
  return (
    <Link
      to="/"
      aria-label="OpenFund · ໜ້າຫຼັກ"
      className="flex shrink-0 items-center gap-2.5"
    >
      <HeartHandshake className="size-8 text-primary" aria-hidden="true" />
      <span className="flex flex-col">
        <span className="text-xl font-bold tracking-tight">OpenFund</span>
        <span className="text-xs text-muted-foreground">
          Laos · ເພື່ອຊຸມຊົນ
        </span>
      </span>
    </Link>
  );
}
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only fixed top-4 left-4 z-50 rounded-lg bg-background p-3 text-primary focus:not-sr-only"
      onClick={(e) => {
        e.preventDefault();
        document.getElementById("main-content")?.focus();
      }}
    >
      ຂ້າມໄປເນື້ອຫາ
    </a>
  );
}
export function DemoBanner({ demo }: { demo?: boolean }) {
  return (
    <div className="bg-muted px-4 py-1.5 text-center text-xs leading-6 text-muted-foreground">
      {demo
        ? "ລະບົບທົດລອງ · OFL ບໍ່ສາມາດແລກເປັນເງິນກີບໄດ້"
        : "ລະບົບທົດລອງ · ກະລຸນາອ່ານເງື່ອນໄຂກ່ອນສະໜັບສະໜູນ"}
    </div>
  );
}
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
      <SkipLink />
      <DemoBanner demo={d?.demoMode} />
      <header className="border-b bg-background">
        <div className="mx-auto flex min-h-22 max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Brand />
          <div className="hidden lg:block">
            <RouteNavigation label="ເມນູຫຼັກ" items={navigation} />
          </div>
          <div className="hidden lg:block">
            <Link
              to="/manager"
              className={buttonVariants({ variant: "ghost" })}
            >
              Funding Manager{" "}
              <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </div>
          <Sheet open={menu} onOpenChange={setMenu}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="ເປີດເມນູ"
                />
              }
            >
              <Menu />
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>OpenFund</SheetTitle>
              </SheetHeader>
              <nav aria-label="ເມນູຫຼັກ" className="flex flex-col gap-2 px-4">
                {[
                  ...navigation,
                  { to: "/manager", label: "Funding Manager" },
                  { to: "/transactions", label: "ປະຫວັດກອງທຶນ" },
                ].map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenu(false)}
                    className={buttonVariants({
                      variant: "ghost",
                      className:
                        "justify-start aria-[current=page]:bg-secondary aria-[current=page]:text-primary",
                    })}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto flex min-h-[65vh] w-full max-w-6xl flex-col gap-8 px-5 py-8 outline-none sm:px-8 sm:py-12 lg:pb-20"
      >
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
            <span className="text-sm font-semibold">OpenFund Laos</span>
            <nav
              aria-label="ຂໍ້ມູນເພີ່ມເຕີມ"
              className="flex flex-wrap gap-x-5 text-sm text-muted-foreground"
            >
              {[
                ["/about", "ວິທີໃຊ້ ແລະເງື່ອນໄຂ"],
                ["/transactions", "ປະຫວັດກອງທຶນ"],
                ["/manager", "Funding Manager"],
              ].map(([to, label]) => (
                <Link
                  key={to}
                  to={to}
                  className="inline-flex min-h-11 items-center hover:text-primary"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <p className="text-xs text-muted-foreground">
            ກະລຸນາກວດສອບຜູ້ຈັດການກອງທຶນກ່ອນສະໜັບສະໜູນ.
            ຂໍ້ມູນສາທາລະນະບໍ່ໄດ້ຮັບຮອງການນຳໃຊ້ເງິນ.
          </p>
        </div>
      </footer>
    </>
  );
}
