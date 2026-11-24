/** Fictional campaign content and provisional game balance, not real railway contracts. */
export type StoryMetric = "trips" | "roundTrips" | "relations" | "punctualTrips" |
  "stations" | "profitableTrips" | "depotFuel" | "spareLocos" | "trainsets";
export type StoryDestination = "fleet" | "schedule" | "market" | "office";
export interface StoryGoal {
  metric: StoryMetric;
  label: string;
  target: number;
  screen: StoryDestination;
}
export interface StoryChoice {
  id: string;
  title: string;
  description: string;
  outcome: string;
  cash: number;
  xp: number;
  goals: readonly StoryGoal[];
  next?: string;
}
export interface StoryChapter {
  id: string;
  title: string;
  subtitle: string;
  character: string;
  role: string;
  briefing: string;
  dialogue: string;
  choices: readonly StoryChoice[];
  callbacks?: readonly {
    when: { chapterId: string; choiceId: string };
    speaker: string;
    line: string;
  }[];
}

const STORY_SOURCE = {
  id: "jalur-kepercayaan",
  title: "Jalur Kepercayaan",
  season: "Musim 1 · Perusahaan pertama",
  premise: "Sebuah depo, anggaran terbatas, dan warga yang menunggu layanan yang bisa diandalkan. Bersama Ratih, Damar, dan Sari, tentukan perusahaan seperti apa yang ingin Anda bangun.",
  chapters: [
    {
      id: "first-whistle", title: "Peluit pertama", subtitle: "Satu kereta. Satu janji.",
      character: "Ratih", role: "Perencana perjalanan",
      briefing: "Papan keberangkatan di hub Anda masih kosong. Ratih membawa dua rancangan: mulai dengan cadangan yang aman, atau membuktikan bahwa armada kecil bisa melayani lebih dari satu dinas. Warga belum mengenal perusahaan Anda; perjalanan pertama akan menjadi perkenalannya.",
      dialogue: "Kita tidak perlu menjanjikan seluruh Jawa. Mulailah dengan layanan yang benar-benar bisa kita selesaikan.",
      choices: [
        { id: "reserve", title: "Mulai dengan cadangan", description: "Selesaikan satu dinas penumpang dan sisakan fuel di depo. Lebih sedikit perjalanan, tetapi perlu modal stok.", outcome: "Ratih mencatat keberangkatan pertama dengan cadangan yang masih tersedia. Perusahaan memilih kesiapan sebelum frekuensi.", cash: 30_000_000, xp: 30,
          goals: [{ metric: "trips", label: "Dinas penumpang selesai", target: 1, screen: "schedule" }, { metric: "depotFuel", label: "Fuel tersisa di seluruh depo (L)", target: 2000, screen: "office" }] },
        { id: "frequency", title: "Buktikan konsistensi", description: "Selesaikan dua dinas penumpang. Jadwalkan keduanya dengan lokasi, jeda, kru, dan fuel yang legal.", outcome: "Dua dinas selesai. Ratih melihat bahwa perusahaan kecil ini mampu mengulang janji yang sama.", cash: 40_000_000, xp: 35,
          goals: [{ metric: "trips", label: "Dinas penumpang selesai", target: 2, screen: "schedule" }] },
      ],
    },
    {
      id: "return-ticket", title: "Tiket untuk pulang", subtitle: "Tujuan bukan akhir perjalanan.",
      character: "Sari", role: "Koordinator stasiun",
      briefing: "Sari membawa pertanyaan sederhana dari peron: setelah sampai, bagaimana penumpang pulang? Ratih menyarankan satu layanan pergi-balik yang utuh. Sari juga melihat peluang melayani dua relasi dengan pengaturan sarana yang lebih rumit.",
      dialogue: "Bagi kita ini diagram dinas. Bagi penumpang, ini kepastian untuk kembali ke rumah.",
      choices: [
        { id: "round-trip", title: "Tuntaskan satu PP", description: "Selesaikan pergi dan balik pada relasi serta trainset yang sama. Arah balik harus berangkat setelah arah pergi tiba.", outcome: "Satu perjalanan pergi-balik terhubung secara fisik. Sari kini bisa menjelaskan perjalanan pulang, bukan hanya keberangkatan.", cash: 50_000_000, xp: 40,
          goals: [{ metric: "roundTrips", label: "Pasangan pergi-balik selesai", target: 1, screen: "schedule" }] },
        { id: "two-relations", title: "Hubungkan dua relasi", description: "Selesaikan dinas pada dua relasi berbeda. Gunakan trainset yang sama bergantian atau sarana tambahan bila tersedia.", outcome: "Dua relasi telah dilayani. Sari mendapat lebih banyak pilihan tujuan, dengan tanggung jawab koordinasi yang ikut bertambah.", cash: 60_000_000, xp: 45,
          goals: [{ metric: "relations", label: "Relasi penumpang yang dilayani", target: 2, screen: "schedule" }] },
      ],
    },
    {
      id: "depot-decision", title: "Catatan kepala depo", subtitle: "Cadangan memiliki harga.",
      character: "Damar", role: "Kepala depo",
      briefing: "Damar membentangkan catatan sarana dan persediaan. Ia tidak meminta semua hal dibeli sekaligus: pilih stok fuel yang lebih kuat atau lokomotif cadangan yang belum terikat pada trainset. Keduanya memakai uang yang juga dibutuhkan untuk operasi.",
      dialogue: "Cadangan yang baik bukan barang paling mahal. Cadangan yang baik menutup risiko yang memang kita pilih untuk tanggung.",
      choices: [
        { id: "fuel-buffer", title: "Perkuat stok fuel", description: "Pertahankan sedikitnya 8.000 L di seluruh depo sambil menyelesaikan satu dinas baru. Angka ini target skenario, bukan estimasi universal ketahanan stok.", outcome: "Damar mencatat stok fuel yang lebih lapang. Rencana berikutnya tetap harus menyesuaikan lokasi depo dan isi tangki sarana.", cash: 75_000_000, xp: 50,
          goals: [{ metric: "depotFuel", label: "Fuel tersisa di seluruh depo (L)", target: 8000, screen: "office" }, { metric: "trips", label: "Dinas penumpang selesai", target: 1, screen: "schedule" }] },
        { id: "spare-loco", title: "Siapkan lokomotif cadangan", description: "Terima satu lokomotif yang sehat, tidak diservis, dan belum dirangkai. Selesaikan satu dinas baru dengan armada operasional.", outcome: "Satu lokomotif menunggu sebagai cadangan. Damar mengingatkan bahwa lokasi dan kompatibilitas tetap menentukan apakah ia dapat menggantikan unit lain.", cash: 90_000_000, xp: 60,
          goals: [{ metric: "spareLocos", label: "Lokomotif cadangan tersedia", target: 1, screen: "market" }, { metric: "trips", label: "Dinas penumpang selesai", target: 1, screen: "schedule" }] },
      ],
    },
    {
      id: "voices-on-platform", title: "Suara dari peron", subtitle: "Lebih dekat atau lebih tepat?",
      character: "Sari", role: "Koordinator stasiun",
      briefing: "Masukan penumpang tidak semuanya sama. Sebagian ingin lebih banyak stasiun dilayani; sebagian meminta layanan yang datang sesuai rencana. Sari meminta Anda memilih fokus berikutnya dan membuktikannya melalui perjalanan.",
      dialogue: "Kita boleh memilih prioritas. Yang penting, jangan mengatakan keduanya sudah terpenuhi kalau belum ada hasilnya.",
      choices: [
        { id: "coverage", title: "Dekatkan layanan", description: "Layani sedikitnya tiga stasiun komersial berbeda melalui dinas baru yang selesai. Stasiun yang hanya dilewati tidak dihitung.", outcome: "Tiga stasiun komersial telah mendapat layanan. Sari membawa peta jangkauan yang lebih luas ke rapat berikutnya.", cash: 100_000_000, xp: 60,
          goals: [{ metric: "stations", label: "Stasiun komersial terlayani", target: 3, screen: "schedule" }] },
        { id: "punctuality", title: "Jaga ketepatan waktu", description: "Selesaikan tiga dinas penumpang dengan keterlambatan masing-masing paling lama 10 menit game.", outcome: "Tiga dinas selesai dalam toleransi waktu skenario. Sari kini memiliki catatan ketepatan yang bisa ditunjukkan.", cash: 100_000_000, xp: 60,
          goals: [{ metric: "punctualTrips", label: "Dinas selesai · keterlambatan ≤10 menit", target: 3, screen: "schedule" }] },
      ],
    },
    {
      id: "next-horizon", title: "Rapat menjelang pagi", subtitle: "Perusahaan seperti apa yang kita bangun?",
      character: "Ratih", role: "Perencana perjalanan",
      briefing: "Ratih, Damar, dan Sari kembali ke meja yang sama. Kini ada hasil perjalanan untuk dibaca. Anda dapat memperkuat kontribusi layanan yang sudah berjalan, atau menambah armada dan membuktikan bahwa dua relasi bisa terus dilayani.",
      dialogue: "Kita sudah punya cerita awal. Keputusan terakhir musim ini menentukan pekerjaan yang ingin kita lanjutkan besok.",
      choices: [
        { id: "sustainable", title: "Perkuat operasi yang sehat", description: "Selesaikan tiga dinas baru dengan kontribusi positif: pendapatan dinas melebihi biaya yang dicatat untuk dinas tersebut. Ini belum berarti laba perusahaan setelah overhead.", outcome: "Musim pertama ditutup dengan tiga dinas berkontribusi positif. Anda memilih menguatkan operasi sebelum memperbesar jaringan.", cash: 150_000_000, xp: 100,
          goals: [{ metric: "profitableTrips", label: "Dinas dengan kontribusi positif", target: 3, screen: "schedule" }] },
        { id: "expand", title: "Bangun jaringan kecil", description: "Miliki dua trainset dan selesaikan dinas baru pada dua relasi berbeda. Sarana, kru, dan jadwal masing-masing tetap harus siap.", outcome: "Dua trainset dan dua relasi menjadi penutup musim pertama. Anda memilih jaringan yang lebih luas, beserta kebutuhan koordinasinya.", cash: 175_000_000, xp: 110,
          goals: [{ metric: "trainsets", label: "Trainset milik perusahaan", target: 2, screen: "fleet" }, { metric: "relations", label: "Relasi penumpang yang dilayani", target: 2, screen: "schedule" }] },
      ],
    },
  ] satisfies readonly StoryChapter[],
} as const;

// Narrative memory reads the same saved choice IDs as the objective runner.
const CALLBACKS: Record<string, { when: { chapterId: string; choiceId: string }; speaker: string; line: string }[]> = {
  "return-ticket": [
    { when: { chapterId: "first-whistle", choiceId: "reserve" }, speaker: "Ratih", line: "Kita memulai dengan cadangan. Pertahankan kebiasaan itu saat menyusun arah balik; stok di depo belum tentu ada di terminus." },
    { when: { chapterId: "first-whistle", choiceId: "frequency" }, speaker: "Sari", line: "Dua dinas pertama sudah selesai. Sekarang orang-orang mulai bertanya bukan hanya kapan berangkat, tetapi kapan mereka bisa pulang." },
  ],
  "depot-decision": [
    { when: { chapterId: "return-ticket", choiceId: "round-trip" }, speaker: "Damar", line: "Satu pola PP memudahkan kita membaca kebutuhan cadangan. Lihat dinas berikutnya sebelum memutuskan stok atau lokomotif tambahan." },
    { when: { chapterId: "return-ticket", choiceId: "two-relations" }, speaker: "Damar", line: "Dua relasi berarti lokasi sarana makin penting. Lokomotif cadangan di depo yang salah tidak otomatis menyelesaikan gangguan di tempat lain." },
  ],
  "voices-on-platform": [
    { when: { chapterId: "depot-decision", choiceId: "fuel-buffer" }, speaker: "Sari", line: "Anda memilih memperkuat persediaan. Sekarang mari tentukan pengalaman penumpang yang ingin kita perbaiki dengan kesiapan itu." },
    { when: { chapterId: "depot-decision", choiceId: "spare-loco" }, speaker: "Sari", line: "Anda menyiapkan lokomotif cadangan. Itu memberi pilihan saat merencanakan layanan; ketepatan jadwal tetap harus kita buktikan di lintas." },
  ],
  "next-horizon": [
    { when: { chapterId: "voices-on-platform", choiceId: "coverage" }, speaker: "Ratih", line: "Anda memilih menjangkau lebih banyak stasiun. Pertanyaan berikutnya: apakah kita ingin menguatkan kontribusi layanan itu, atau menambah sarana untuk melayaninya?" },
    { when: { chapterId: "voices-on-platform", choiceId: "punctuality" }, speaker: "Ratih", line: "Catatan ketepatan waktu sudah kita miliki. Jangan biarkan rencana ekspansi menghapus ruang jeda yang membantu kita mencapainya." },
  ],
};

// Stable localization IDs keep authored prose out of saves and transition logic.
const idStrings: Record<string, string> = {};
function line(id: string, text: string) { idStrings[id] = text; return id; }
export const CORE_STORY_CAMPAIGN: {
  id: string; title: string; season: string; premise: string; chapters: readonly StoryChapter[];
} = {
  id: STORY_SOURCE.id,
  title: line("story.season.title", STORY_SOURCE.title),
  season: line("story.season.label", STORY_SOURCE.season),
  premise: line("story.season.premise", STORY_SOURCE.premise),
  chapters: STORY_SOURCE.chapters.map((chapter, index) => {
    const prefix = `story.${chapter.id}`;
    return {
      id: chapter.id,
      title: line(`${prefix}.title`, chapter.title),
      subtitle: line(`${prefix}.subtitle`, chapter.subtitle),
      character: line(`${prefix}.character`, chapter.character),
      role: line(`${prefix}.role`, chapter.role),
      briefing: line(`${prefix}.briefing`, chapter.briefing),
      dialogue: line(`${prefix}.dialogue`, chapter.dialogue),
      choices: chapter.choices.map((choice) => ({ ...choice,
        next: STORY_SOURCE.chapters[index + 1]?.id ?? "END",
        title: line(`${prefix}.${choice.id}.title`, choice.title),
        description: line(`${prefix}.${choice.id}.description`, choice.description),
        outcome: line(`${prefix}.${choice.id}.outcome`, choice.outcome),
        goals: choice.goals.map((goal) => ({ ...goal, label: line(`${prefix}.${choice.id}.${goal.metric}`, goal.label) })),
      })),
      callbacks: (CALLBACKS[chapter.id] ?? []).map((callback) => ({ ...callback,
        speaker: line(`${prefix}.memory.${callback.when.choiceId}.speaker`, callback.speaker),
        line: line(`${prefix}.memory.${callback.when.choiceId}.line`, callback.line),
      })),
    };
  }),
};
export const CORE_STORY_STRINGS: Readonly<Record<string, Readonly<Record<string, string>>>> = { id: idStrings };
export function storyText(id: string, locale = "id") {
  return CORE_STORY_STRINGS[locale]?.[id] ?? CORE_STORY_STRINGS.id?.[id] ?? `<MISSING:${id}>`;
}

/** Intended pacing, not a measured difficulty score. Briefing is a rest before the finale. */
export const CORE_STORY_BEATS = [
  { id: "first-whistle", type: "teach", intensity: 0.2 },
  { id: "return-ticket", type: "develop", intensity: 0.4 },
  { id: "depot-decision", type: "rest", intensity: 0.2 },
  { id: "voices-on-platform", type: "twist", intensity: 0.65 },
  { id: "next-horizon:briefing", type: "rest", intensity: 0.2 },
  { id: "next-horizon:objectives", type: "climax", intensity: 0.85 },
] as const;
