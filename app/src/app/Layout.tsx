import { Suspense, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useMatch } from "react-router-dom";
import { HeartHandshake, Menu, Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { RouteNavigation } from "@/components/patterns";
import { Connect } from "@/features/wallet/Connect";
import { defaultDeployment, resolveDeployment } from "@/web3/deployments";
import { Loading } from "@/components/common";

const navigation = [
  { to: "/funds", label: "ຄົ້ນຫາກອງທຶນ" },
  { to: "/dashboard/donations", label: "ການສະໜັບສະໜູນຂອງຂ້ອຍ" },
  { to: "/dashboard/funds", label: "ກອງທຶນຂອງຂ້ອຍ" },
];
function Brand() {
  return (
    <Link
      to="/"
      aria-label="OpenFund · ໜ້າຫຼັກ"
      className="flex shrink-0 items-center gap-2.5"
    >
      <HeartHandshake className="size-7 text-primary" aria-hidden="true" />
      <span className="text-xl font-bold tracking-tight">OpenFund</span>
    </Link>
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
      <div className="bg-muted px-4 py-2 text-center text-xs leading-6 text-muted-foreground">
        {d?.demoMode
          ? "ລະບົບທົດລອງ · OFL ບໍ່ສາມາດແລກເປັນເງິນກີບໄດ້"
          : "ລະບົບທົດລອງ · ກະລຸນາອ່ານເງື່ອນໄຂກ່ອນສະໜັບສະໜູນ"}
      </div>
      <header className="z-30 border-b bg-background md:sticky md:top-0">
        <div className="mx-auto flex min-h-18 max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <Brand />
          <div className="hidden xl:block">
            <RouteNavigation label="ເມນູຫຼັກ" items={navigation} />
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-2">
            <Connect chainId={d?.chainId} compact />
            <Sheet open={menu} onOpenChange={setMenu}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="xl:hidden"
                    aria-label="ເປີດເມນູ"
                  />
                }
              >
                <Menu />
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>OpenFund</SheetTitle>
                </SheetHeader>
                <nav aria-label="ເມນູຫຼັກ" className="flex flex-col gap-2 px-4">
                  {navigation.map((item) => (
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
                  <Separator className="my-3" />
                  <Link
                    to="/funds/create"
                    onClick={() => setMenu(false)}
                    className={buttonVariants({ variant: "outline" })}
                  >
                    <Plus data-icon="inline-start" aria-hidden="true" />
                    ສ້າງກອງທຶນ
                  </Link>
                  <Link
                    to="/about"
                    onClick={() => setMenu(false)}
                    className={buttonVariants({
                      variant: "ghost",
                      className: "justify-start",
                    })}
                  >
                    ວິທີໃຊ້ ແລະເງື່ອນໄຂ
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto flex min-h-[65vh] max-w-6xl flex-col gap-8 px-5 py-8 outline-none sm:px-8 sm:py-12 lg:pb-20"
      >
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-8 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
            <span className="text-sm font-semibold">OpenFund</span>
            <nav
              aria-label="ຂໍ້ມູນເພີ່ມເຕີມ"
              className="flex flex-wrap gap-x-5 text-sm text-muted-foreground"
            >
              <Link
                to="/about"
                className="inline-flex min-h-11 items-center hover:text-primary"
              >
                ວິທີໃຊ້ ແລະເງື່ອນໄຂ
              </Link>
              <Link
                to="/transactions"
                className="inline-flex min-h-11 items-center hover:text-primary"
              >
                ປະຫວັດກອງທຶນ
              </Link>
              <Link
                to="/protocol"
                className="inline-flex min-h-11 items-center hover:text-primary"
              >
                ຂໍ້ມູນເຄືອຂ່າຍ
              </Link>
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
