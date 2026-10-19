import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  BookOpen,
  HeartPulse,
  HeartHandshake,
  Check,
  Eye,
  FolderOpen,
  Layers,
  Target,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { defaultDeployment } from "@/web3/deployments";
import { useFunds } from "@/web3/reads";
import { FundCard } from "@/features/funds/FundCard";
import {
  ActionLink,
  EmptyState,
  ErrorNotice,
  Loading,
} from "@/components/common";
import { Badge } from "@/components/ui/badge";

const categories = [
  { icon: BookOpen, label: "ການສຶກສາ", value: "Education" },
  { icon: HeartPulse, label: "ສຸຂະພາບ", value: "Healthcare" },
  { icon: Users, label: "ຊຸມຊົນ", value: "Community" },
];
const steps = [
  {
    icon: Search,
    title: "ເລືອກກອງທຶນທີ່ໃສ່ໃຈ",
    body: "ອ່ານເລື່ອງລາວ ເປົ້າໝາຍ ແລະເງື່ອນໄຂຂອງກອງທຶນກ່ອນຕັດສິນໃຈ.",
  },
  {
    icon: HeartHandshake,
    title: "ຮ່ວມສະໜັບສະໜູນ",
    body: "ເຊື່ອມກະເປົາ ເລືອກຈຳນວນທີ່ຕ້ອງການ ແລ້ວຢືນຢັນການສະໜັບສະໜູນ.",
  },
  {
    icon: Eye,
    title: "ຕິດຕາມທຸກຄວາມຄືບໜ້າ",
    body: "ເບິ່ງປະຫວັດການໃຊ້ເງິນ ການອະນຸມັດ ແລະລາຍງານຈາກກອງທຶນໄດ້ຕະຫຼອດ.",
  },
];
export function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <Badge variant="secondary">
            <span className="status-dot" /> ສຳລັບອົງກອນ ແລະມູນນິທິ
          </Badge>
          <h1>
            ຮ່ວມທຶນໃຫ້
            <br />
            ອົງກອນທີ່
            <br />
            <span>ເຈົ້າເຊື່ອໝັ້ນ.</span>
          </h1>
          <p>
            ພື້ນທີ່ລະດົມທຶນສຳລັບອົງກອນ ແລະມູນນິທິ.
            ຮ່ວມສະໜັບສະໜູນພາລະກິດທີ່ເຈົ້າໃສ່ໃຈ ເບິ່ງເງື່ອນໄຂກອງທຶນ
            ແລະຕິດຕາມການໃຊ້ເງິນໄດ້ຢ່າງໂປ່ງໃສ.
          </p>
          <div className="hero-actions">
            <ActionLink to="/funds">
              ຄົ້ນຫາກອງທຶນ <ArrowRight data-icon="inline-end" />
            </ActionLink>
            <ActionLink to="/funds/create" outline>
              ສ້າງກອງທຶນ
            </ActionLink>
          </div>
          <div className="hero-note">
            <span className="hero-note-icon">
              <Eye />
            </span>
            <span>ເບິ່ງກອງທຶນໄດ້ທັນທີ ໂດຍບໍ່ຕ້ອງເຊື່ອມກະເປົາ</span>
          </div>
        </div>
        <FundingArt />
      </section>
      <div className="values-strip">
        <div>
          <ShieldCheck />
          <span>ໂປ່ງໃສ ກວດສອບໄດ້</span>
        </div>
        <div>
          <Users />
          <span>ມີເງື່ອນໄຂການໃຊ້ເງິນຊັດເຈນ</span>
        </div>
        <div>
          <FolderOpen />
          <span>ເພື່ອອົງກອນ ແລະມູນນິທິ</span>
        </div>
      </div>
      <section className="causes-section">
        <div className="section-head">
          <div>
            <div className="eyebrow">
              <span className="red-dash" /> ເລີ່ມຕົ້ນຈາກສິ່ງທີ່ເຈົ້າໃສ່ໃຈ
            </div>
            <h2>ຮ່ວມສະໜັບສະໜູນພາລະກິດທີ່ມີຄວາມໝາຍ</h2>
            <p>
              ເລືອກກອງທຶນຕາມຄວາມສົນໃຈ ແລະຮູ້ວ່າເງິນຂອງເຈົ້າຈະຖືກນຳໄປໃຊ້ແນວໃດ.
            </p>
          </div>
          <Link className="text-link" to="/funds">
            ເບິ່ງທັງໝົດ <ArrowRight />
          </Link>
        </div>
        <div className="cause-links">
          {categories.map(({ icon: Icon, label, value }) => (
            <Link key={value} to={`/funds?category=${value}`}>
              <Icon />
              <span>{label}</span>
              <ArrowRight />
            </Link>
          ))}
        </div>
        {defaultDeployment ? (
          <Featured />
        ) : (
          <EmptyState description="ກອງທຶນຈະສະແດງທີ່ນີ້ ເມື່ອລະບົບພ້ອມໃຊ້ງານ. ເຈົ້າສາມາດອ່ານວິທີໃຊ້ງານໄດ້ກ່ອນ." />
        )}
      </section>
      <section className="how-section" id="how-it-works">
        <div className="section-head">
          <div>
            <div className="eyebrow">
              <span className="red-dash" /> ເລີ່ມຕົ້ນໄດ້ງ່າຍໆ
            </div>
            <h2>ຈາກຄວາມສົນໃຈ ສູ່ການຮ່ວມສ້າງ</h2>
          </div>
          <Link className="text-link" to="/about">
            ຮູ້ຈັກເພີ່ມເຕີມ <ArrowRight />
          </Link>
        </div>
        <div className="steps-grid">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <div className="how-step" key={title}>
              <div className="step-top">
                <span className="step-icon">
                  <Icon />
                </span>
                <span className="step-number">0{i + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="community-cta">
        <div className="cta-heart" aria-hidden="true">
          <Target />
        </div>
        <div>
          <div className="eyebrow">ສຳລັບອົງກອນ ແລະມູນນິທິ</div>
          <h2>ສ້າງກອງທຶນ ເພື່ອພາລະກິດຂອງອົງກອນ.</h2>
          <p>
            ບອກເລື່ອງລາວ ວາງເປົ້າໝາຍ ແລະຊວນຜູ້ສະໜັບສະໜູນມາຮ່ວມສ້າງໃຫ້ເປັນຈິງ.
          </p>
        </div>
        <ActionLink to="/funds/create">
          ສ້າງກອງທຶນ <ArrowRight data-icon="inline-end" />
        </ActionLink>
      </section>
    </>
  );
}
function FundingArt() {
  return (
    <div className="community-art funding-art">
      <div className="art-orbit orbit-one" aria-hidden="true" />
      <div className="art-orbit orbit-two" aria-hidden="true" />
      <div className="idea-board">
        <div className="idea-board-heading">
          <span className="idea-icon">
            <Layers />
          </span>
          <span>OpenFund</span>
          <ArrowUpRight />
        </div>
        <div className="idea-board-body">
          <span className="idea-kicker">ກອງທຶນສຳລັບພາລະກິດຂອງເຈົ້າ</span>
          <h2>
            ຕັ້ງເປົ້າໝາຍ.
            <br />
            ຮ່ວມລົງມື.
            <br />
            <span>ຕິດຕາມຜົນ.</span>
          </h2>
          <div className="idea-path">
            <span>
              <Building2 />
            </span>
            <i />
            <span>
              <Users />
            </span>
            <i />
            <span>
              <Target />
            </span>
          </div>
        </div>
        <div className="idea-board-footer">
          <ShieldCheck />
          <span>ເງື່ອນໄຂຊັດເຈນ · ຕິດຕາມໄດ້</span>
          <Check />
        </div>
      </div>
      <div className="art-floating art-giving">
        <span className="giving-heart">
          <Building2 />
        </span>
        <div>
          <strong>ອົງກອນ ແລະມູນນິທິ</strong>
          <span>ກອງທຶນເພື່ອພາລະກິດຮ່ວມກັນ</span>
        </div>
      </div>
      <div className="art-floating art-trust">
        <span className="trust-icon">
          <Users />
        </span>
        <div>
          <strong>ຜູ້ສະໜັບສະໜູນ ແລະທີມງານ</strong>
          <span>ຮ່ວມກັນຕິດຕາມຄວາມຄືບໜ້າ</span>
        </div>
      </div>
      <span className="art-spark spark-one" aria-hidden="true">
        ✳
      </span>
      <span className="art-spark spark-two" aria-hidden="true">
        +
      </span>
    </div>
  );
}
function Featured() {
  const q = useFunds(defaultDeployment!);
  const rows = q.data?.pages[0]?.rows.slice(0, 3) ?? [];
  return (
    <>
      <ErrorNotice error={q.error} />
      {q.isLoading ? (
        <Loading />
      ) : rows.length ? (
        <div className="fund-grid">
          {rows.map((row) => (
            <FundCard key={String(row.id)} row={row} d={defaultDeployment!} />
          ))}
        </div>
      ) : !q.error ? (
        <div className="featured-empty">
          <EmptyState description="ຍັງບໍ່ມີກອງທຶນໃນເຄືອຂ່າຍນີ້. ເລີ່ມກອງທຶນສຳລັບອົງກອນ ຫຼືມູນນິທິຂອງເຈົ້າໄດ້ເລີຍ." />
          <ActionLink to="/funds/create" outline>
            ສ້າງກອງທຶນ <ArrowRight data-icon="inline-end" />
          </ActionLink>
        </div>
      ) : null}
    </>
  );
}
