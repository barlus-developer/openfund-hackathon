import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/patterns";
import { Disclosure } from "@/components/patterns";
import { deployments, chainFor, defaultDeployment } from "@/web3/deployments";
import { Panel, Notice, EmptyState } from "@/components/common";
export function Protocol() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <PageHeader
        title={<>ເຄືອຂ່າຍ OpenFund</>}
        description={<>ກວດສອບເຄືອຂ່າຍ ແລະທີ່ຢູ່ຂອງລະບົບທີ່ກອງທຶນໃຊ້.</>}
      />
      <Notice title="ກວດສອບກ່ອນສະໜັບສະໜູນ">
        ລະບົບຍັງຢູ່ໃນຂັ້ນທົດລອງ. ກະລຸນາກວດສອບກອງທຶນ ແລະເງື່ອນໄຂກ່ອນສະໜັບສະໜູນ.
      </Notice>
      {deployments.length ? (
        deployments.map((d) => (
          <Panel
            key={d.version}
            title={
              d.chainId === 31337
                ? "ເຄືອຂ່າຍທົດລອງພາຍໃນ"
                : `ເຄືອຂ່າຍ ${d.chainId}`
            }
            description={
              d.version === defaultDeployment?.version
                ? "ເຄືອຂ່າຍທີ່ກຳລັງໃຊ້"
                : "ເຄືອຂ່າຍທີ່ຮອງຮັບ"
            }
          >
            <dl className="data-list">
              <dt>ຮຸ່ນຂອງລະບົບ</dt>
              <dd>{d.version}</dd>
              <dt>ຮູບແບບ</dt>
              <dd>
                {d.demoMode
                  ? "OFL ທົດລອງ · ບໍ່ມີເງິນກີບຄ້ຳປະກັນ"
                  : "ລະບົບທົດລອງ · ກະລຸນາກວດສອບເງື່ອນໄຂ"}
              </dd>
              <dt>ຄ່າທຳນຽມໃຊ້</dt>
              <dd>{chainFor(d).nativeCurrency.symbol}</dd>
              <dt>ຈຳນວນການຢືນຢັນ</dt>
              <dd>{d.confirmations ?? (d.chainId === 31337 ? 1 : 2)}</dd>
            </dl>
            <Disclosure title={<>ເບິ່ງລາຍລະອຽດທາງເຕັກນິກ</>}>
              <dl className="data-list mt-6">
                <dt>ໝາຍເລກເຄືອຂ່າຍ</dt>
                <dd>{d.chainId}</dd>
                <dt>ທີ່ຢູ່ OpenFund</dt>
                <dd>
                  <code>{d.openFundAddress}</code>
                </dd>
                <dt>ທີ່ຢູ່ OFL</dt>
                <dd>
                  <code>{d.oflTokenAddress}</code>
                </dd>
                <dt>ບັນທຶກເລີ່ມຕົ້ນ</dt>
                <dd>
                  {d.deploymentBlock}
                  <code className="hash">{d.deploymentBlockHash}</code>
                </dd>
                <dt>ຈຸດເຊື່ອມຕໍ່</dt>
                <dd>
                  <code>{chainFor(d).rpcUrls.default.http.join(", ")}</code>
                </dd>
              </dl>
              {d.explorerUrl ? (
                <a
                  className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary hover:underline [&_svg]:size-4"
                  href={`${d.explorerUrl}/address/${d.openFundAddress}#code`}
                  target="_blank"
                  rel="noreferrer"
                >
                  ເບິ່ງລະຫັດໃນເວັບກວດສອບ{" "}
                  <ExternalLink
                    className="inline-icon shrink-0"
                    aria-hidden="true"
                  />
                  <span className="sr-only"> (ເປີດໃນແຖບໃໝ່)</span>
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">
                  ຍັງບໍ່ມີເວັບກວດສອບພາຍນອກ. ລະຫັດຕົ້ນສະບັບຢູ່ໃນ{" "}
                  <code>contracts/src/OpenFund.sol</code> ແລະ{" "}
                  <code>OFLToken.sol</code>.
                </p>
              )}
            </Disclosure>
          </Panel>
        ))
      ) : (
        <EmptyState description="ລະບົບຍັງບໍ່ພ້ອມໃຊ້ງານ. ກະລຸນາລອງໃໝ່ພາຍຫຼັງ." />
      )}
      <Disclosure title="ການດູແລເງິນ ແລະຜູ້ອອກ OFL">
        <p className="text-sm text-muted-foreground">
          ເງິນຂອງແຕ່ລະກອງທຶນຖືກແຍກກັນ. ການຈ່າຍເງິນ
          ຫຼືປິດກອງທຶນຕ້ອງຜ່ານການອະນຸມັດຕາມເງື່ອນໄຂ.
          ບໍ່ມີຜູ້ດູແລລະບົບທີ່ສາມາດຖອນເງິນ ຫຼືປ່ຽນເງື່ອນໄຂແທນໄດ້.
        </p>
        <p className="text-sm text-muted-foreground">
          ຜູ້ອອກ OFL ເປັນຄົນລະສ່ວນກັບກອງທຶນ. ຜູ້ອອກສາມາດເພີ່ມ OFL
          ແລະລົງທະບຽນທີ່ຢູ່ລະບົບເພີ່ມໄດ້ ແຕ່ຍຶດ ຫຼືລຶບຍອດເງິນຂອງຜູ້ຖື
          ຫຼືກອງທຶນບໍ່ໄດ້. ການລົງທະບຽນທີ່ຢູ່ປອມຍັງອາດສ້າງຄວາມສ່ຽງໄດ້
          ຈຶ່ງຄວນກວດທີ່ຢູ່ກ່ອນໂອນ.
        </p>
      </Disclosure>
      <Notice title="OFL ທົດລອງ">
        OFL ມີທົດສະນິຍົມ 18 ຕຳແໜ່ງ. 1 OFL ≈ 1 ກີບ ເປັນພຽງຄ່າອ້າງອີງ
        ບໍ່ແມ່ນການຮັບຮອງເງິນສຳຮອງ ຫຼືການແລກຄືນເປັນເງິນກີບ.
      </Notice>
    </div>
  );
}
