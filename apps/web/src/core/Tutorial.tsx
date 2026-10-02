import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  coreFormation,
  coreMissionStatus,
  coreLevel,
  type CoreState,
} from "@railway/simulation";
import { Card, compact, type Act, type Screen } from "./presentation";

export const TUTORIAL_KEY = "railway-manager-tutorial-v1";
export function Tutorial({
  state: s,
  act,
  go,
  sound,
  toggleSound,
  onContinue,
}: {
  state: CoreState;
  act: Act;
  go: (screen: Screen) => void;
  sound: boolean;
  toggleSound: () => void;
  onContinue: () => void;
}) {
  const starter = [
    ["cc201", 1],
    ["ec-standard", 4],
    ["generator", 1],
  ] as const;
  const orderedStarter = starter.every(
    ([id, count]) =>
      s.orders
        .filter((o) => o.productId === id)
        .reduce((n, o) => n + o.quantity, 0) >= count,
  );
  const acceptedStarter = starter.every(
    ([id, count]) => s.units.filter((u) => u.productId === id).length >= count,
  );
  const steps: {
    title: string;
    text: string;
    screen: Screen;
    done: boolean;
  }[] = [
    {
      title: "Pilih hub & beli sarana",
      screen: "market",
      done: orderedStarter || acceptedStarter,
      text: "Hub pertama sudah dipilih saat pendirian depo. Di Pasar, pesan 1 CC201, 4 Ekonomi Standar dan 1 pembangkit di dipo yang sama. Paket starter tersedia langsung; pesanan berikutnya perlu waktu pengantaran.",
    },
    {
      title: "Terima pesanan",
      screen: "market",
      done: acceptedStarter,
      text: "Gulir Pasar ke Pesanan & acceptance. Tekan Terima untuk setiap pesanan siap. Pembelian saja belum memasukkan sarana ke inventori.",
    },
    {
      title: "Rakit trainset",
      screen: "fleet",
      done: s.trainsets.some((t) => coreFormation(s, t).capacity > 0),
      text: "Di Armada, tekan Buat trainset. Pilih lokomotif, empat kereta dan pembangkit dari inventori di lokasi yang sama, lalu simpan. Formasi starter menyediakan 424 kursi.",
    },
    {
      title: "Siapkan fuel & kru",
      screen: "fleet",
      done: s.trainsets.some(
        (t) =>
          t.crew &&
          t.units.some((id) => s.units.some((u) => u.id === id && u.fuel > 0)),
      ),
      text: "Di Kantor, tekan Rekrut otomatis sesuai kebutuhan pada bagian SDM dan beli fuel untuk dipo hub. Kembali ke detail trainset di Armada: Isi tangki penuh. Stok dipo berbeda dari fuel onboard; kebutuhan pasti dicek di Jadwal.",
    },
    {
      title: "Buat relasi & tinjau tarif",
      screen: "schedule",
      done: s.services.length > 0,
      text: "Tekan Buat relasi di Jadwal. Mulai dari hub ke stasiun tetangga pada lintas terbuka. Nama relasi otomatis memakai kode stasiun awal–akhir dan bisa digunakan dua arah. Ikuti tiga tahap lintas, layanan dan tinjauan. Periksa tarif serta proyeksi penumpang dan biaya.",
    },
    {
      title: "Aktifkan jadwal pertama",
      screen: "schedule",
      done: s.plans.some((p) => p.active) || s.runs.length > 0,
      text: "Pilih trainset, relasi dan arah sesuai posisi kereta. Pilih sekali jalan untuk penugasan manual setelah tiba, PP otomatis, atau susun pola operasi multi-relasi yang kembali ke asal pada akhir siklus. Tinjau kesiapan dan preview PP, lalu atur siklus serta jam keberangkatan. Perbaiki semua alasan belum siap sebelum mengaktifkan. Jadwal aktif menunggu waktu keberangkatan, bukan langsung berangkat.",
    },
    {
      title: "Pantau dinas & hasil",
      screen: "fleet",
      done: s.runs.some((r) => r.status === "completed"),
      text: "Pantau tab Dalam perjalanan di Armada dan posisi di Peta. Jika dinas tertahan, baca alasannya lalu perbaiki fuel atau kesiapan. Setelah selesai, tinjau kontribusi di Kantor dan ekspor save sebagai cadangan.",
    },
  ];
  const missions = coreMissionStatus(s);
  const level = coreLevel(s);
  const count = steps.filter((step) => step.done).length;
  const next = steps.findIndex((step) => !step.done);
  return (
    <div className="panel-scroll tutorial-content">
      <Card className="mission-summary">
        <small>MISI PERUSAHAAN</small>
        <h2>
          Level {level.level} · {level.xp} XP
        </h2>
        <div
          className="tutorial-progress"
          role="progressbar"
          aria-label="XP menuju level berikutnya"
          aria-valuenow={level.inLevel}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${level.inLevel}%` }} />
        </div>
        <p>
          {level.nextLevelAt - level.xp} XP menuju level berikutnya. Hadiah awal
          hingga Rp590 jt untuk modal operasi; setiap misi dibayar sekali.
        </p>
        {!s.progression && (
          <button
            className="primary"
            onClick={() => act({ type: "enableMissions" })}
          >
            Aktifkan misi & hadiah untuk perusahaan ini
          </button>
        )}
        {missions.map((mission) => (
          <div className="mission-row" key={mission.id}>
            <div>
              <b>{mission.title}</b>
              <small>
                +{mission.xp} XP · +{compact(mission.cash)}
              </small>
            </div>
            {mission.completed ? (
              <span className="pill good">Hadiah diterima</span>
            ) : (
              <button onClick={() => go(mission.screen)}>
                {mission.eligible ? "Aktifkan misi" : "Kerjakan"}
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        ))}
        <p className="muted">
          Reward masuk otomatis ketika tujuan tercapai. XP tidak didapat dari
          membuka menu. Level menandai progres; kesiapan, biaya dan hak lintas
          tetap berlaku.
        </p>
      </Card>
      <Card className="starter-card">
        <small>PANDUAN OPERATOR BARU</small>
        <h2>Dari dipo ke dinas pertama.</h2>
        <p>
          Ikuti langkah ini sambil bermain. Checklist diperbarui dari kondisi
          perusahaan Anda; membuka menu saja belum menyelesaikan langkah.
        </p>
        <div
          className="tutorial-progress"
          role="progressbar"
          aria-label="Progres tutorial"
          aria-valuenow={count}
          aria-valuemin={0}
          aria-valuemax={steps.length}
        >
          <span style={{ width: `${(count / steps.length) * 100}%` }} />
        </div>
        <p>
          <b>
            {count}/{steps.length} langkah tercapai
          </b>
        </p>
        <div className="toolbar">
          <button
            className="primary"
            onClick={() => go(steps[next < 0 ? 6 : next]!.screen)}
          >
            Lanjut ke {next < 0 ? "hasil" : "langkah berikutnya"}{" "}
            <ArrowRight size={15} />
          </button>
          <button onClick={onContinue}>Tutup panduan</button>
        </div>
        <p className="muted">
          Panduan dapat dibuka lagi kapan saja lewat menu Tutorial.
        </p>
      </Card>
      {steps.map((step, index) => (
        <Card
          key={step.title}
          className={`tutorial-step ${step.done ? "done" : ""}`}
        >
          <div className="tutorial-step-title">
            {step.done ? <CheckCircle2 size={19} /> : <Circle size={19} />}
            <h3>
              {index + 1}. {step.title}
            </h3>
            <span>{step.done ? "Tercapai" : "Belum"}</span>
          </div>
          <p>{step.text}</p>
          <button onClick={() => go(step.screen)}>
            Buka{" "}
            {
              {
                market: "Pasar",
                fleet: "Armada",
                schedule: "Jadwal",
                office: "Kantor",
                map: "Peta",
                tutorial: "Tutorial",
              }[step.screen]
            }{" "}
            <ArrowRight size={14} />
          </button>
        </Card>
      ))}
      <Card title="Suara & pesan tindakan">
        <p>
          Notifikasi hijau dan dua nada naik menandai tindakan berhasil.
          Notifikasi merah dan nada turun menjelaskan tindakan gagal. Pesan
          gagal tetap tampil sampai ditutup atau digantikan notifikasi baru.
        </p>
        <button onClick={toggleSound} aria-pressed={sound}>
          {sound ? <Volume2 size={16} /> : <VolumeX size={16} />} Suara{" "}
          {sound ? "aktif" : "nonaktif"}
        </button>
      </Card>
      <Card title="Waktu, offline & cadangan">
        <p>
          Realism berjalan 1×, Casual 1,5×. Jadwal diproses saat bermain dan
          ketika save dibuka kembali. Siapkan fuel untuk dinas berulang. Save
          tersimpan pada browser dan alamat situs ini; gunakan ekspor/impor di
          Kantor untuk pindah perangkat atau alamat.
        </p>
      </Card>
    </div>
  );
}
