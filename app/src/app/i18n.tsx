import { stored, remember } from "@/lib/storage";
import { createContext, useContext, useState, type ReactNode } from "react";
const dictionary = {
  explore: ["ຄົ້ນຫາກອງທຶນ", "Explore funds"],
  create: ["ສ້າງກອງທຶນ", "Create fund"],
  dashboard: ["ກອງທຶນຂອງຂ້ອຍ", "My dashboard"],
  wallet: ["ກະເປົາ", "Wallet"],
  protocol: ["ໂປຣໂຕຄອນ", "Protocol"],
  about: ["ກ່ຽວກັບ", "About"],
  connect: ["ເຊື່ອມຕໍ່ MetaMask", "Connect MetaMask"],
  donate: ["ຮ່ວມບໍລິຈາກ", "Donate"],
  governance: ["ການອະນຸມັດ", "Governance"],
  proposals: ["ຂໍ້ສະເໜີ", "Proposals"],
  payouts: ["ການຈ່າຍເງິນ", "Payouts"],
  transactions: ["ທຸລະກຳ", "Transactions"],
  reports: ["ລາຍງານ", "Reports"],
  manage: ["ຈັດການກອງທຶນ", "Manage fund"],
  overview: ["ພາບລວມ", "Overview"],
  refund: ["ຮັບເງິນຄືນ", "Claim refund"],
  approve: ["ອະນຸມັດ", "Approve"],
  execute: ["ດຳເນີນການ", "Execute"],
  cancel: ["ຍົກເລີກ", "Cancel"],
  next: ["ຕໍ່ໄປ", "Continue"],
  back: ["ກັບຄືນ", "Back"],
  balance: ["ຍອດຄົງເຫຼືອ", "Current balance"],
  raised: ["ຍອດບໍລິຈາກທັງໝົດ", "Lifetime raised"],
  goal: ["ເປົ້າໝາຍ", "Funding goal"],
  fundraisingStatus: [
    "ກຳລັງລະດົມທຶນ ຈົນຮອດເປົ້າໝາຍ ຫຼື ວັນກຳນົດ",
    "Fundraising until the exact goal or deadline.",
  ],
  activeStatus: [
    "ກອງທຶນພ້ອມຈ່າຍເງິນຕາມການອະນຸມັດ",
    "Active treasury: spending requires the fund’s approvals.",
  ],
  refundableStatus: [
    "ບໍ່ເຖິງເປົ້າໝາຍ · ຜູ້ບໍລິຈາກສາມາດຮັບເງິນຄືນໄດ້",
    "Target missed: original donors can self-claim refunds indefinitely.",
  ],
  closingStatus: [
    "ກຳລັງປິດກອງທຶນ · ຢຸດຮັບບໍລິຈາກແລ້ວ",
    "Closing: donations stopped permanently; settlement remains governed.",
  ],
  closedStatus: [
    "ປິດກອງທຶນແລ້ວ · ຂໍ້ມູນຍັງເບິ່ງໄດ້",
    "Closed permanently. Historical records remain public.",
  ],
  mission: [
    "ຮ່ວມສ້າງສິ່ງດີໆ. ໂປ່ງໃສທຸກການບໍລິຈາກ.",
    "Good grows together. Every contribution, in the open.",
  ],
  missionBody: [
    "ສະໜັບສະໜູນຊຸມຊົນ ການສຶກສາ ແລະ ສຸຂະພາບ. ຕິດຕາມການໃຊ້ເງິນໄດ້ຈາກບລັອກເຊນ.",
    "Support communities, education and health. Follow the money directly on chain.",
  ],
  demo: [
    "ເຄືອຂ່າຍທົດລອງ · DEMO OFL · ບໍ່ມີເງິນກີບຄ້ຳປະກັນ",
    "Local Development Network · DEMO OFL · NOT FIAT-BACKED",
  ],
  readOnly: [
    "ສາມາດເບິ່ງຂໍ້ມູນໄດ້ໂດຍບໍ່ເຊື່ອມກະເປົາ",
    "Public records · No wallet needed to explore",
  ],
  loading: ["ກຳລັງໂຫຼດຂໍ້ມູນຈາກເຄືອຂ່າຍ…", "Reading the blockchain…"],
  empty: ["ຍັງບໍ່ມີຂໍ້ມູນໃນຊ່ວງທີ່ໂຫຼດ", "No records in the loaded range"],
  title: ["ຊື່ກອງທຶນ", "Fund title"],
  summary: ["ລາຍລະອຽດສາທາລະນະ", "Public summary"],
  manager: ["ທີ່ຢູ່ຜູ້ຈັດການ", "Manager wallet"],
  amount: ["ຈຳນວນ OFL", "OFL amount"],
  recipient: ["ທີ່ຢູ່ຜູ້ຮັບ", "Recipient address"],
  purpose: ["ຈຸດປະສົງ", "Purpose"],
  wrongChain: [
    "ເຄືອຂ່າຍບໍ່ຖືກຕ້ອງ · ປ່ຽນເຄືອຂ່າຍ",
    "Wrong chain · Switch network",
  ],
  refundPolicy: [
    "ຄືນເງິນ 100% ຖ້າບໍ່ເຖິງເປົ້າໝາຍພາຍໃນກຳນົດ",
    "100% self-claim refund if the target is missed at the deadline.",
  ],
  keepPolicy: [
    "ກອງທຶນຮັກສາເງິນໄວ້ ເຖິງຈະບໍ່ເຖິງເປົ້າໝາຍ · ບໍ່ມີສິດຄືນເງິນ",
    "Funds are kept if the target is missed. No automatic refund.",
  ],
  continuousPolicy: [
    "ບໍລິຈາກຕໍ່ເນື່ອງ · ບໍ່ມີສິດຄືນເງິນອັດຕະໂນມັດ",
    "Continuous donations are irrevocable. No automatic failure refund.",
  ],
  privacy: [
    "ຫ້າມເຜີຍແຜ່ຂໍ້ມູນສ່ວນຕົວ ຫຼື ຂໍ້ມູນຄົນເຈັບ. ຂໍ້ມູນເທິງເຊນເປັນສາທາລະນະ.",
    "Never publish patient or beneficiary private data. On-chain records are public and permanent.",
  ],
} as const;
type Key = keyof typeof dictionary;
const Context = createContext({
  language: "lo",
  setLanguage: (_v: string) => {},
  t: (key: Key): string => dictionary[key][0],
});
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState(
    () => stored("ofl-language") || "lo",
  );
  return (
    <Context
      value={{
        language,
        setLanguage: (v) => {
          remember("ofl-language", v);
          document.documentElement.lang = v;
          setLanguage(v);
        },
        t: (key) =>
          dictionary[key][language === "lo" ? 0 : 1] || dictionary[key][1],
      }}
    >
      {children}
    </Context>
  );
}
export const useLanguage = () => useContext(Context);
