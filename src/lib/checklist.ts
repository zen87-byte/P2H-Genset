export type Hazard = "A" | "AA";
export type ChecklistSection = { code: string; title: string; items: { code: string; description: string; hazard: Hazard }[] };

// Transkripsi checklist dari foto formulir P2H yang diberikan.
// Verifikasi ejaan/istilah pada master cetak sebelum dipakai sebagai dokumen resmi.
export const CHECKLIST: ChecklistSection[] = [
  { code: "ENG", title: "ENGINE", items: [
    { code: "ENG-01", description: "Periksa fungsi dan kondisi engine", hazard: "AA" },
    { code: "ENG-02", description: "Periksa level oli, tambah bila kurang", hazard: "AA" },
    { code: "ENG-03", description: "Periksa Fuel System dan sambungan dari buntu atau bocor", hazard: "AA" },
    { code: "ENG-04", description: "Periksa, tambah atau ganti air radiator", hazard: "AA" },
    { code: "ENG-05", description: "Periksa kebocoran air radiator", hazard: "AA" },
    { code: "ENG-06", description: "Periksa sirip-sirip radiator dari kerusakan", hazard: "A" },
    { code: "ENG-07", description: "Periksa kondisi dan fungsi V-belt, ganti jika rusak", hazard: "AA" },
    { code: "ENG-08", description: "Periksa dan bersihkan air cleaner, ganti jika rusak", hazard: "AA" },
    { code: "ENG-09", description: "Periksa kondisi muffler", hazard: "AA" },
    { code: "ENG-10", description: "Periksa keausan mounting engine dan dinamo", hazard: "A" },
    { code: "ENG-11", description: "Check kekencangan torsi setiap baut dan mounting baut", hazard: "A" }
  ]},
  { code: "ELE", title: "ELEKTRIK SYSTEM", items: [
    { code: "ELE-01", description: "Periksa terminal battery, elektrolit dan ganti bila rusak", hazard: "A" },
    { code: "ELE-02", description: "Periksa kabel grounding", hazard: "A" },
    { code: "ELE-03", description: "Periksa starting motor dan alternator", hazard: "A" },
    { code: "ELE-04", description: "Periksa semua sambungan kabel dan kondisinya", hazard: "A" },
    { code: "ELE-05", description: "Periksa semua lampu peringatan & alarm", hazard: "A" },
    { code: "ELE-06", description: "Check monitor panel, kunci kontak, gauge dan fungsinya", hazard: "A" },
    { code: "ELE-07", description: "Periksa kabel harness", hazard: "A" },
    { code: "ELE-08", description: "Periksa Sekring & pemutus arus/Circuit breaker", hazard: "A" },
    { code: "ELE-09", description: "Periksa main switch", hazard: "A" },
    { code: "ELE-10", description: "Periksa penerangan di ruang genset & penerangan darurat jika ada", hazard: "A" }
  ]},
  { code: "ADD", title: "TAMBAHAN ITEM YANG HARUS DIPERIKSA", items: [
    { code: "ADD-01", description: "Periksa kebersihan unit", hazard: "A" },
    { code: "ADD-02", description: "Periksa kondisi kerangka unit", hazard: "A" },
    { code: "ADD-03", description: "Periksa kondisi box panel", hazard: "A" },
    { code: "ADD-04", description: "Periksa isolator kabel di box panel", hazard: "A" },
    { code: "ADD-05", description: "Periksa kondisi dan gauge APAR", hazard: "A" },
    { code: "ADD-06", description: "Periksa kebocoran dan keretakan fuel tank dan sub tank", hazard: "A" },
    { code: "ADD-07", description: "Periksa pengaman/guarding fan radiator", hazard: "A" }
  ]},
  { code: "HK", title: "HOUSE KEEPING", items: [
    { code: "HK-01", description: "Periksa kebersihan ruang genset", hazard: "A" },
    { code: "HK-02", description: "Periksa kebersihan oil trap", hazard: "A" }
  ]}
];

export const CHECKLIST_ITEMS = CHECKLIST.flatMap(section =>
  section.items.map(item => ({ ...item, category: section.title }))
);
