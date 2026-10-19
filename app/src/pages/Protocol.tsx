import { deployments, chainFor, defaultDeployment } from "@/web3/deployments";
import { Panel, Notice, EmptyState } from "@/components/common";
export function Protocol() {
  return (
    <div className="stack prose">
      <div className="page-title">
        <div>
          <div className="eyebrow">ຂໍ້ມູນອ້າງອີງຂອງລະບົບ</div>
          <h1>ເຄືອຂ່າຍ OpenFund</h1>
          <p>ກວດສອບເຄືອຂ່າຍ ແລະທີ່ຢູ່ຂອງລະບົບທີ່ກອງທຶນໃຊ້.</p>
        </div>
      </div>
      <Notice title="ກວດສອບກ່ອນສະໜັບສະໜູນ">
        ການມີກອງທຶນຢູ່ໃນ OpenFund ບໍ່ແມ່ນການຮັບຮອງຕົວຕົນຜູ້ສ້າງ
        ຫຼືຜົນສຳເລັດຂອງໂຄງການ. ກະລຸນາອ່ານເງື່ອນໄຂ ແລະກວດສອບຂໍ້ມູນປະກອບ.
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
            <details className="advanced-filters">
              <summary>ເບິ່ງລາຍລະອຽດທາງເຕັກນິກ</summary>
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
                  className="text-link"
                  href={`${d.explorerUrl}/address/${d.openFundAddress}#code`}
                  target="_blank"
                  rel="noreferrer"
                >
                  ເບິ່ງລະຫັດໃນເວັບກວດສອບ ↗
                </a>
              ) : (
                <p>
                  ຍັງບໍ່ມີເວັບກວດສອບພາຍນອກ. ລະຫັດຕົ້ນສະບັບຢູ່ໃນ{" "}
                  <code>contracts/src/OpenFund.sol</code> ແລະ{" "}
                  <code>OFLToken.sol</code>.
                </p>
              )}
            </details>
          </Panel>
        ))
      ) : (
        <EmptyState description="ລະບົບຍັງບໍ່ພ້ອມໃຊ້ງານ. ກະລຸນາລອງໃໝ່ພາຍຫຼັງ." />
      )}
      <Panel title="ກອງທຶນມີເງື່ອນໄຂຂອງຕົນເອງ">
        <p>
          ເງິນຂອງແຕ່ລະກອງທຶນຖືກແຍກກັນ. ການຈ່າຍເງິນ
          ຫຼືປິດກອງທຶນຕ້ອງຜ່ານການອະນຸມັດຕາມເງື່ອນໄຂ.
          ບໍ່ມີຜູ້ດູແລລະບົບທີ່ສາມາດຖອນເງິນ ຫຼືປ່ຽນເງື່ອນໄຂແທນໄດ້.
        </p>
        <p>
          ຜູ້ອອກ OFL ເປັນຄົນລະສ່ວນກັບກອງທຶນ. ຜູ້ອອກສາມາດເພີ່ມ OFL
          ແລະລົງທະບຽນທີ່ຢູ່ລະບົບເພີ່ມໄດ້ ແຕ່ຍຶດ ຫຼືລຶບຍອດເງິນຂອງຜູ້ຖື
          ຫຼືກອງທຶນບໍ່ໄດ້. ການລົງທະບຽນທີ່ຢູ່ປອມຍັງອາດສ້າງຄວາມສ່ຽງໄດ້
          ຈຶ່ງຄວນກວດທີ່ຢູ່ກ່ອນໂອນ.
        </p>
      </Panel>
      <Notice title="OFL ທົດລອງ">
        OFL ມີທົດສະນິຍົມ 18 ຕຳແໜ່ງ. 1 OFL ≈ 1 ກີບ ເປັນພຽງຄ່າອ້າງອີງ
        ບໍ່ແມ່ນການຮັບຮອງເງິນສຳຮອງ ຫຼືການແລກຄືນເປັນເງິນກີບ.
      </Notice>
    </div>
  );
}
