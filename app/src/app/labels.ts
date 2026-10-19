// Display labels stay separate from contract enum names and transaction states.
export const fundStatusLabels = [
  "ກຳລັງລະດົມທຶນ",
  "ກຳລັງດຳເນີນງານ",
  "ສາມາດຮັບເງິນຄືນ",
  "ກຳລັງປິດ",
  "ປິດແລ້ວ",
];
export const proposalStatusLabels = [
  "ລໍຖ້າອະນຸມັດ",
  "ລໍຖ້າຄົບກຳນົດ",
  "ພ້ອມດຳເນີນການ",
  "ດຳເນີນການແລ້ວ",
  "ຍົກເລີກແລ້ວ",
  "ໝົດອາຍຸ",
  "ບໍ່ສາມາດໃຊ້ໄດ້",
];
export const actionLabels = [
  "ຈ່າຍເງິນ",
  "ປ່ຽນຜູ້ຈັດການ",
  "ເພີ່ມຜູ້ອະນຸມັດ",
  "ຖອນຜູ້ອະນຸມັດ",
  "ປ່ຽນຈຳນວນການອະນຸມັດ",
  "ເພີ່ມຜູ້ຮັບ",
  "ຖອນຜູ້ຮັບ",
  "ເລີ່ມປິດກອງທຶນ",
];
export const categoryLabel = (value: string) =>
  ({
    Projects: "ໂຄງການ",
    Business: "ທຸລະກິດ",
    Creative: "ວຽກສ້າງສັນ",
    Personal: "ເປົ້າໝາຍສ່ວນຕົວ",
    Education: "ການສຶກສາ",
    Healthcare: "ສຸຂະພາບ",
    Community: "ຊຸມຊົນ",
    Environment: "ສິ່ງແວດລ້ອມ",
    Emergency: "ຊ່ວຍເຫຼືອສຸກເສີນ",
  })[value] ?? value;
export const transactionLabels: Record<string, string> = {
  Preparing: "ກຳລັງກຽມລາຍການ",
  "Awaiting Wallet": "ກະລຸນາຢືນຢັນໃນກະເປົາ",
  Submitted: "ສົ່ງລາຍການແລ້ວ",
  Pending: "ກຳລັງລໍຖ້າຢືນຢັນ",
  Replaced: "ລາຍການຖືກປ່ຽນແທນ",
  Confirmed: "ຢືນຢັນສຳເລັດ",
  Rejected: "ຍົກເລີກການຢືນຢັນ",
  Reverted: "ລາຍການບໍ່ສຳເລັດ",
  Failed: "ບໍ່ສາມາດດຳເນີນການໄດ້",
};
export const eventLabels: Record<string, string> = {
  FundCreated: "ສ້າງກອງທຶນ",
  DonationReceived: "ໄດ້ຮັບການບໍລິຈາກ",
  ProposalCreated: "ສ້າງຂໍ້ສະເໜີ",
  ProposalApproved: "ອະນຸມັດຂໍ້ສະເໜີ",
  ProposalExecuted: "ດຳເນີນຂໍ້ສະເໜີແລ້ວ",
  ProposalCancelled: "ຍົກເລີກຂໍ້ສະເໜີ",
  PayoutExecuted: "ຈ່າຍເງິນແລ້ວ",
  RefundClaimed: "ຮັບເງິນຄືນແລ້ວ",
  FundClosed: "ປິດກອງທຶນແລ້ວ",
  ClosureStarted: "ເລີ່ມປິດກອງທຶນ",
  GovernanceChanged: "ປ່ຽນການອະນຸມັດ",
  ApproverChanged: "ປ່ຽນຜູ້ອະນຸມັດ",
  RecipientChanged: "ປ່ຽນຜູ້ຮັບ",
  ReportPublished: "ເຜີຍແຜ່ລາຍງານ",
  MetadataUpdated: "ອັບເດດຂໍ້ມູນກອງທຶນ",
};
