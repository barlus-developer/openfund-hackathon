import { PageHeader, Disclosure } from "@/components/patterns";
import { ArrowRight } from "lucide-react";
import { ActionLink } from "@/components/common";
const steps = [
  ["ເລືອກກອງທຶນ", "ເບິ່ງຈຸດປະສົງ ເປົ້າໝາຍ ແລະເງື່ອນໄຂຄືນເງິນ."],
  [
    "ຮ່ວມສະໜັບສະໜູນ",
    "ເລືອກຈຳນວນ OFL ເຊື່ອມ MetaMask ແລະຢືນຢັນ. ຕ້ອງມີຄ່າທຳນຽມເຄືອຂ່າຍ.",
  ],
  ["ຕິດຕາມຜົນ", "ເບິ່ງປະຫວັດການສະໜັບສະໜູນ ການຈ່າຍເງິນ ແລະລາຍງານຂອງກອງທຶນ."],
];
export function About() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <PageHeader title="ວິທີໃຊ້ OpenFund" />
      <ol className="flex flex-col gap-8">
        {steps.map(([title, body], i) => (
          <li key={title} className="flex gap-4">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <div className="flex flex-col gap-2">
              <h2 className="text-base font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ol>
      <ActionLink to="/funds">
        ຄົ້ນຫາກອງທຶນ <ArrowRight data-icon="inline-end" aria-hidden="true" />
      </ActionLink>
      <section aria-labelledby="about-terms" className="flex flex-col gap-2">
        <h2 id="about-terms" className="mb-2 text-lg font-semibold">
          ເງື່ອນໄຂ ແລະຄຳຖາມທີ່ພົບເລື້ອຍ
        </h2>
        <Disclosure title="ການອະນຸມັດ ແລະການຈ່າຍເງິນ">
          <p className="text-sm text-muted-foreground">
            ຜູ້ຈັດການສະເໜີ ຜູ້ອະນຸມັດຮ່ວມຕັດສິນໃຈ. ການສະເໜີບໍ່ແມ່ນການອະນຸມັດ.
          </p>
          <p className="text-sm text-muted-foreground">
            ການປ່ຽນຜູ້ຈັດການ ຜູ້ອະນຸມັດ ຈຳນວນອະນຸມັດ ຜູ້ຮັບ ຫຼືເລີ່ມປິດກອງທຶນ
            ລໍຖ້າ 24 ຊົ່ວໂມງຫຼັງອະນຸມັດຄົບ. ຂໍ້ສະເໜີໝົດອາຍຸໃນ 7 ວັນ;
            ເມື່ອອະນຸມັດຄົບ ມີເວລາອີກ 7 ວັນເພື່ອດຳເນີນການ.
          </p>
        </Disclosure>
        <Disclosure title="ການຮັບເງິນຄືນ ແລະປິດກອງທຶນ">
          <p className="text-sm text-muted-foreground">
            ຖ້າກອງທຶນມີນະໂຍບາຍຄືນເງິນ ແລະບໍ່ເຖິງເປົ້າໝາຍພາຍໃນກຳນົດ
            ຜູ້ສະໜັບສະໜູນສາມາດຮັບເງິນຄືນ 100% ຜ່ານກະເປົາເດີມ ໂດຍບໍ່ມີວັນໝົດອາຍຸ.
            ຍັງຕ້ອງຈ່າຍຄ່າທຳນຽມເຄືອຂ່າຍ.
          </p>
          <p className="text-sm text-muted-foreground">
            ການເລີ່ມປິດກອງທຶນຈະຢຸດຮັບສະໜັບສະໜູນຖາວອນ.
            ການຈ່າຍເງິນທີ່ເຫຼືອຍັງຕ້ອງຜ່ານການອະນຸມັດ
            ແລະປິດສຳເລັດໄດ້ເມື່ອຍອດເງິນເປັນສູນ.
          </p>
        </Disclosure>
        <Disclosure title="ເບິ່ງຂໍ້ມູນໃຫ້ຄົບ ກ່ອນຕັດສິນໃຈ">
          <p className="text-sm text-muted-foreground">
            ຂໍ້ມູນສາທາລະນະບໍ່ໄດ້ຮັບຮອງຕົວຕົນ ຫຼືການນຳໃຊ້ເງິນໃນຊີວິດຈິງ.
            ກະລຸນາກວດສອບຜູ້ຈັດການ ແລະຫຼັກຖານປະກອບ. ລະບົບບໍ່ໄດ້ຕັດສິນຂໍ້ຂັດແຍ່ງ.
          </p>
          <p className="text-sm text-muted-foreground">
            ຜູ້ອະນຸມັດພຽງຄົນດຽວສາມາດຕັດສິນໃຈຈ່າຍເງິນໄດ້.
            ການມີຫຼາຍຄົນກໍບໍ່ສາມາດປ້ອງກັນການຮ່ວມກັນທຸຈະລິດໄດ້ທັງໝົດ.
            ຖ້າເສຍສິດເຂົ້າກະເປົາຈົນອະນຸມັດບໍ່ຄົບ ເງິນອາດຖືກລັອກຖາວອນ
            ແລະບໍ່ມີຜູ້ດູແລທີ່ຂ້າມເງື່ອນໄຂໄດ້.
          </p>
        </Disclosure>
        <Disclosure title="ປົກປ້ອງຂໍ້ມູນສ່ວນຕົວ">
          <p className="text-sm text-muted-foreground">
            ຊື່ກອງທຶນ ລາຍລະອຽດ ທີ່ຢູ່ກະເປົາ ແລະເອກະສານທີ່ເຜີຍແຜ່
            ເປັນຂໍ້ມູນສາທາລະນະຖາວອນ.
            ຫ້າມເຜີຍແຜ່ຂໍ້ມູນສ່ວນຕົວຂອງຜູ້ອື່ນໂດຍບໍ່ໄດ້ຮັບອະນຸຍາດ.
            ການກວດໄຟລ໌ຢືນຢັນໄດ້ພຽງວ່າໄຟລ໌ບໍ່ຖືກປ່ຽນ ແຕ່ບໍ່ຮັບຮອງເນື້ອຫາ
            ຫຼືການເກັບໄຟລ໌ຖາວອນ.
          </p>
        </Disclosure>
        <Disclosure title="ກ່ຽວກັບລະບົບທົດລອງ">
          <p className="text-sm text-muted-foreground">
            ລະບົບນີ້ຍັງຢູ່ໃນຂັ້ນທົດລອງ ແລະຍັງບໍ່ຜ່ານການກວດຄວາມປອດໄພອິດສະຫຼະ. OFL
            ທົດລອງບໍ່ມີເງິນກີບຄ້ຳປະກັນ ແລະບໍ່ສາມາດແລກເປັນເງິນກີບໄດ້. ການສະແດງ 1
            OFL ≈ 1 ກີບ ເປັນພຽງຄ່າອ້າງອີງ.
          </p>
          <p className="text-sm text-muted-foreground">
            ປະຫວັດອາດໂຫຼດບໍ່ຄົບໃນຄັ້ງດຽວ. ກົດໂຫຼດເພີ່ມເພື່ອເບິ່ງລາຍການອື່ນ
            ແລະກວດວ່າເຄືອຂ່າຍເຊື່ອມຕໍ່ຢູ່.
          </p>
        </Disclosure>
      </section>
    </div>
  );
}
