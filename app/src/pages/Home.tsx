import { useState, type FormEvent } from "react";
import {
  RefreshCw,
  ArrowRight,
  Users,
  Search,
  Eye,
  Route,
  HandHeart,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { defaultDeployment } from "@/web3/deployments";
import { useFunds } from "@/web3/reads";
import { FundCard } from "@/features/funds/FundCard";
import { EmptyState, ErrorNotice, Loading } from "@/components/common";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@/components/ui/input-group";
import { Field, FieldLabel } from "@/components/ui/field";
import { Reveal } from "@/components/motion";

export function Home() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  function discover(e: FormEvent) {
    e.preventDefault();
    navigate(
      `/funds${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`,
    );
  }
  return (
    <div className="home-page flex flex-col gap-8 sm:gap-12">
      <section className="grid items-center gap-8 py-4 sm:py-8 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
        <div className="hero-copy flex flex-col items-start gap-6">
          <p className="eyebrow">
            <HandHeart className="size-4" aria-hidden="true" />
            ເລີ່ມຈາກຄວາມຫ່ວງໃຍ · ເຕີບໂຕດ້ວຍພະລັງຊຸມຊົນ
          </p>
          <h1 className="text-3xl font-bold leading-relaxed sm:text-5xl sm:leading-relaxed">
            ຮ່ວມສ້າງສິ່ງດີໆ
            <br />
            <span className="text-primary">ໃຫ້ຊຸມຊົນຂອງເຮົາ.</span>
          </h1>
          <p className="text-base text-muted-foreground">
            ເລືອກກອງທຶນ ຮ່ວມສະໜັບສະໜູນ ແລະຕິດຕາມການໃຊ້ເງິນ.
          </p>
          <form
            onSubmit={discover}
            className="flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-end"
            role="search"
          >
            <Field className="min-w-0 flex-1">
              <FieldLabel htmlFor="home-search">ຢາກຊ່ວຍເລື່ອງໃດ?</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Search aria-hidden="true" />
                </InputGroupAddon>
                <InputGroupInput
                  id="home-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ຊື່ກອງທຶນ ຫຼືສິ່ງທີ່ເຈົ້າສົນໃຈ…"
                />
              </InputGroup>
            </Field>
            <Button type="submit">
              <Search data-icon="inline-start" aria-hidden="true" />
              ຄົ້ນຫາກອງທຶນ
            </Button>
          </form>
        </div>
        <div className="hero-journey hidden rounded-2xl bg-secondary px-6 py-8 sm:px-8 lg:block">
          <ol
            className="flex flex-col gap-6"
            aria-label="ຈາກຄວາມຕ້ອງການສູ່ການຊ່ວຍເຫຼືອ"
          >
            {[
              {
                icon: Users,
                title: "ຄວາມຕ້ອງການຂອງຊຸມຊົນ",
                text: "ການສຶກສາ · ສຸຂະພາບ · ຊຸມຊົນ",
              },
              {
                icon: HandHeart,
                title: "ຮ່ວມກັນສະໜັບສະໜູນ",
                text: "ເລືອກກອງທຶນທີ່ເຈົ້າຢາກຊ່ວຍ",
              },
              {
                icon: Eye,
                title: "ຕິດຕາມຜົນການດຳເນີນງານ",
                text: "ເບິ່ງການໃຊ້ເງິນ ແລະລາຍງານຈາກກອງທຶນ",
              },
            ].map(({ icon: Icon, title, text }, index) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-background text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">0{index + 1}</p>
                  <h2 className="font-semibold leading-8">{title}</h2>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <Reveal>
        <section aria-labelledby="recent-funds" className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="recent-funds" className="text-xl font-semibold">
              ກອງທຶນລ່າສຸດ
            </h2>
            <Link to="/funds" className={buttonVariants({ variant: "link" })}>
              ເບິ່ງທັງໝົດ
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </div>
          {defaultDeployment ? (
            <RecentFunds />
          ) : (
            <EmptyState
              title="ຍັງບໍ່ມີກອງທຶນ"
              description="ກະລຸນາລອງໃໝ່ພາຍຫຼັງ."
            />
          )}
        </section>
      </Reveal>
      <Reveal>
        <section
          aria-label="ຕິດຕາມການຊ່ວຍເຫຼືອ"
          className="grid gap-6 border-t pt-8 sm:grid-cols-3"
        >
          {[
            {
              icon: Eye,
              title: "ເຫັນຄວາມຄືບໜ້າ",
              text: "ກວດຍອດສະໜັບສະໜູນຂອງແຕ່ລະກອງທຶນ.",
            },
            {
              icon: Route,
              title: "ຕິດຕາມເງິນໄດ້",
              text: "ເບິ່ງປະຫວັດການຮັບ ແລະຈ່າຍເງິນສາທາລະນະ.",
            },
            {
              icon: Users,
              title: "ຮ່ວມກັນຮັບຜິດຊອບ",
              text: "ກວດຜູ້ຈັດການ ແລະເງື່ອນໄຂການອະນຸມັດ.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex flex-col gap-2">
              <Icon className="mb-2 size-5 text-primary" aria-hidden="true" />
              <h2 className="font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>
      </Reveal>
    </div>
  );
}
function RecentFunds() {
  const d = defaultDeployment!;
  const q = useFunds(d);
  const rows = q.data?.pages.flatMap((p) => p.rows).slice(0, 3) ?? [];
  if (q.isLoading) return <Loading cards />;
  if (q.error)
    return (
      <div className="flex flex-col items-start gap-4">
        <ErrorNotice error={q.error} />
        <Button
          variant="outline"
          disabled={q.isFetching}
          onClick={() => q.refetch()}
        >
          <RefreshCw data-icon="inline-start" aria-hidden="true" />
          ລອງໂຫຼດໃໝ່
        </Button>
      </div>
    );
  if (!rows.length)
    return (
      <EmptyState
        title="ຍັງບໍ່ມີກອງທຶນ"
        description="ກອງທຶນໃໝ່ຈະສະແດງຢູ່ທີ່ນີ້. ກະລຸນາກັບມາເບິ່ງພາຍຫຼັງ."
      />
    );
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <FundCard key={String(row.id)} row={row} d={d} />
      ))}
    </div>
  );
}
