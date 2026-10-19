import { BaseError } from "viem";
import { ZodError } from "zod";

function translateMessage(message: string): string {
  if (/rejected|denied|4001/i.test(message))
    return "ເຈົ້າໄດ້ຍົກເລີກຄຳຂໍໃນກະເປົາ. ສາມາດລອງໃໝ່ໄດ້.";
  if (
    /InsufficientFundBalance|Payout exceeds|latest fund balance/i.test(message)
  )
    return "ຍອດເງິນກອງທຶນບໍ່ພຽງພໍ. ກະລຸນາໂຫຼດຂໍ້ມູນໃໝ່ ແລະກວດຈຳນວນອີກຄັ້ງ.";
  if (/InvalidDonation/i.test(message))
    return "ຍັງສະໜັບສະໜູນບໍ່ໄດ້. ກະລຸນາກວດຈຳນວນ ວັນສິ້ນສຸດ ແລະສະຖານະກອງທຶນ.";
  if (/ProposalUnavailable/i.test(message))
    return "ຂໍ້ສະເໜີຍັງບໍ່ພ້ອມດຳເນີນການ. ກະລຸນາກວດຈຳນວນການອະນຸມັດ ແລະວັນກຳນົດ.";
  if (/ProtectedIngress/i.test(message))
    return "ກະລຸນາເລືອກກອງທຶນ ແລະໃຊ້ປຸ່ມສະໜັບສະໜູນ.";
  if (/Connect MetaMask/i.test(message))
    return "ກະລຸນາເຊື່ອມ MetaMask ກ່ອນຢືນຢັນລາຍການ.";
  if (/Wrong chain|network changed|account.*changed/i.test(message))
    return "ກະເປົາ ຫຼືເຄືອຂ່າຍປ່ຽນແລ້ວ. ກະລຸນາກວດສອບ ແລ້ວລອງໃໝ່.";
  if (/Insufficient native/i.test(message))
    return "ຍອດສຳລັບຄ່າທຳນຽມເຄືອຂ່າຍບໍ່ພຽງພໍ. ກະລຸນາຕື່ມເງິນໃນກະເປົາກ່ອນ.";
  if (/positive OFL|OFL amount|allowed range/i.test(message))
    return "ປ້ອນຈຳນວນ OFL ໃຫ້ຫຼາຍກວ່າ 0 ແລະມີທົດສະນິຍົມບໍ່ເກີນ 18 ຕຳແໜ່ງ.";
  if (/Title must fit/i.test(message))
    return "ຊື່ກອງທຶນຍາວເກີນໄປ. ກະລຸນາຫຍໍ້ໃຫ້ສັ້ນລົງ (ບໍ່ເກີນ 120 ໄບຕ໌).";
  if (/Summary must fit/i.test(message))
    return "ລາຍລະອຽດຍາວເກີນໄປ. ກະລຸນາຫຍໍ້ໃຫ້ສັ້ນລົງ (ບໍ່ເກີນ 600 ໄບຕ໌).";
  if (/purpose.*terms/i.test(message))
    return "ກະລຸນາຂຽນຈຸດປະສົງ ແລະເງື່ອນໄຂຂອງກອງທຶນໃຫ້ຊັດເຈນ.";
  if (/threshold/i.test(message))
    return "ຈຳນວນການອະນຸມັດຕ້ອງບໍ່ຕ່ຳກວ່າຂັ້ນຕ່ຳ ແລະບໍ່ເກີນຈຳນວນຜູ້ອະນຸມັດ.";
  if (/1–10 unique approver/i.test(message))
    return "ກະລຸນາປ້ອນກະເປົາຜູ້ອະນຸມັດ 1–10 ຄົນ ໂດຍບໍ່ຊ້ຳກັນ.";
  if (/valid.*address|Invalid.*wallet/i.test(message))
    return "ກະລຸນາກວດທີ່ຢູ່ກະເປົາ. ຕ້ອງເປັນທີ່ຢູ່ທີ່ຖືກຕ້ອງ ແລະບໍ່ເປັນສູນ.";
  if (/Duration must/i.test(message))
    return "ໄລຍະເວລາຕ້ອງເປັນຈຳນວນເຕັມ 1–365 ວັນ.";
  if (/failure policy|Choose REFUND/i.test(message))
    return "ກະລຸນາເລືອກວ່າຈະຄືນເງິນ ຫຼືເກັບເງິນໄວ້ຖ້າບໍ່ເຖິງເປົ້າໝາຍ.";
  if (/100 unique recipient/i.test(message))
    return "ປ້ອນຜູ້ຮັບໄດ້ບໍ່ເກີນ 100 ຄົນ ໂດຍບໍ່ຊ້ຳກັນ.";
  if (/Only current manager/i.test(message))
    return "ການດຳເນີນການນີ້ຕ້ອງໃຊ້ກະເປົາຜູ້ຈັດການ ຫຼືຜູ້ອະນຸມັດທີ່ມີສິດ.";
  if (/Evidence hash/i.test(message))
    return "ລະຫັດຢືນຢັນຫຼັກຖານບໍ່ຖືກຕ້ອງ. ກະລຸນາໃຊ້ລະຫັດ 32 ໄບຕ໌.";
  if (/Purpose is required/i.test(message))
    return "ກະລຸນາລະບຸຈຸດປະສົງການໃຊ້ເງິນ.";
  if (/Recipient is not eligible/i.test(message))
    return "ຜູ້ຮັບນີ້ບໍ່ຢູ່ໃນເງື່ອນໄຂທີ່ກອງທຶນອະນຸຍາດ.";
  if (/document.*5 MB|document up to 5 MB/i.test(message))
    return "ກະລຸນາເລືອກເອກະສານບໍ່ເກີນ 5 MB.";
  if (/upload.*could not connect|upload failed/i.test(message))
    return "ອັບໂຫຼດບໍ່ສຳເລັດ. ກະລຸນາກວດທີ່ຢູ່ບໍລິການ ສິດເຂົ້າໃຊ້ ແລະລອງໃໝ່.";
  if (
    /IPFS|gateway|document reference|Invalid URL|Document unavailable|Document body/i.test(
      message,
    )
  )
    return "ບໍ່ສາມາດເປີດເອກະສານໄດ້. ກະລຸນາກວດລິ້ງ ແລະບ່ອນເກັບໄຟລ໌.";
  if (/reverted|cancelled or replaced/i.test(message))
    return "ລາຍການບໍ່ສຳເລັດ ຫຼືຖືກປ່ຽນແທນ. ກະລຸນາກວດປະຫວັດກ່ອນລອງໃໝ່.";
  if (/HTTP|fetch|network|RPC|timeout|deployment|connect/i.test(message))
    return "ຍັງເຊື່ອມຕໍ່ເຄືອຂ່າຍບໍ່ໄດ້. ກະລຸນາກວດອິນເຕີເນັດ ແລະລອງໂຫຼດໃໝ່.";
  if (/[\u0e80-\u0eff]/.test(message) && message.length < 600) return message;
  return "ບໍ່ສາມາດດຳເນີນການໄດ້. ກະລຸນາກວດຂໍ້ມູນ ແລະລອງໃໝ່.";
}
export function friendlyError(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues
      .map((issue) =>
        issue.code === "custom"
          ? translateMessage(issue.message)
          : "ກະລຸນາກວດຂໍ້ມູນໃຫ້ຄົບ ແລະຖືກຕ້ອງ.",
      )
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(" ");
  }
  const message =
    error instanceof BaseError
      ? error.shortMessage
      : error instanceof Error
        ? error.message
        : String(error);
  return translateMessage(message);
}
