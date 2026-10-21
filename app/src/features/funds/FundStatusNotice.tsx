import { Notice } from "@/components/common";
import { fundStatusLabels } from "@/app/labels";
import { useFundContext } from "./FundLayout";

const guidance = [
  "ກອງທຶນກຳລັງລະດົມທຶນ. ຍັງຈ່າຍເງິນບໍ່ໄດ້ຈົນກວ່າຈະເຖິງເປົ້າໝາຍ ຫຼືຜ່ານກຳນົດຕາມເງື່ອນໄຂ.",
  "ຜູ້ຈັດການສະເໜີຈ່າຍເງິນໄດ້. ຜູ້ອະນຸມັດຕ້ອງຢືນຢັນຄົບຈຳນວນ ແລ້ວຈຶ່ງດຳເນີນການໂອນໄດ້.",
  "ບໍ່ເຖິງເປົ້າໝາຍ. ຜູ້ສະໜັບສະໜູນເດີມຮັບເງິນຄືນເອງໄດ້ຈາກໜ້າສະໜັບສະໜູນ ໂດຍບໍ່ມີວັນໝົດອາຍຸ.",
  "ຢຸດຮັບສະໜັບສະໜູນຖາວອນແລ້ວ. ຈ່າຍຍອດຄົງເຫຼືອຜ່ານການອະນຸມັດ ແລ້ວປິດຖາວອນເມື່ອຍອດເປັນສູນ.",
  "ກອງທຶນປິດຖາວອນແລ້ວ. ປະຫວັດ ແລະລາຍງານຍັງເບິ່ງໄດ້; ຜູ້ຈັດການຍັງເຜີຍແຜ່ລາຍງານໄດ້.",
];
export function FundStatusNotice() {
  const { row } = useFundContext();
  return (
    <Notice title={`ສະຖານະກອງທຶນ · ${fundStatusLabels[row.status]}`}>
      {guidance[row.status]}
    </Notice>
  );
}
