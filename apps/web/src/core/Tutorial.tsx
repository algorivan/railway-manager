import { ResponsiveColumns } from "./Compact";
import { useState } from "react";
import {
  coreMissionStatus,
  coreLevel,
  type CoreState,
} from "@railway/simulation";
import { Card, compact, type Act, type Screen } from "./presentation";
export const TUTORIAL_KEY = "railway-manager-tutorial-v1";
const instructions: Record<string, string> = {
  company:
    "Pilih kota depo dan biaya kontraknya, kemudian hub pertama. Depo menyimpan sarana, stok fuel dan bay maintenance.",
  orders:
    "Di Pasar → Beli sarana, pesan 1 CC201, 4 Ekonomi Standar dan 1 pembangkit ke depo yang sama. Paket pertama tersedia langsung.",
  accept:
    "Di Pasar → Pesanan, tekan Terima untuk setiap pesanan siap. Sarana baru masuk inventori setelah diterima.",
  formation:
    "Di Armada, tekan Buat trainset. Pilih lokomotif, empat kereta dan pembangkit di lokasi yang sama, kemudian Simpan trainset (424 kursi).",
  crew: "Di Kantor → SDM, tekan Rekrut otomatis sesuai kebutuhan. Kontrak kru aktif sebelum keberangkatan.",
  fuel: "Beli cadangan di Kantor → Fuel, lalu Armada → Isi tangki penuh. Stasiun besar menyediakan pemasok; stok depo dan fuel onboard berbeda.",
  service:
    "Di Jadwal → Relasi, pilih asal, tujuan dan pemberhentian. Tekan Simpan relasi. Nama otomatis berupa kode stasiun A–B, berlaku dua arah.",
  schedule:
    "Di Jadwal → Atur jadwal, pilih trainset dan relasi. Tentukan jam A→B dan B→A, atau Isi otomatis sebanyak mungkin PP. Tinjau timetable, lalu Simpan & aktifkan jadwal. Rekap harian menampilkan Tujuan | Tiba | Berangkat.",
  run: "Pantau posisi di sidebar. Jika tertahan, baca alasan di Armada dan tekan Periksa & lanjutkan setelah kesiapan diperbaiki. Hasil operasi tersedia di Jadwal → Rekap harian → Hasil perjalanan.",
};
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
  const missions = coreMissionStatus(s),
    current = missions.findIndex((m) => !m.completed),
    [index, setIndex] = useState(Math.max(0, current)),
    mission = missions[index]!,
    level = coreLevel(s),
    completed = missions.filter((m) => m.completed).length;
  return (
    <ResponsiveColumns>
      <Card title="Misi perjalanan pertama">
        <h2>Dari depo menuju operasi.</h2>
        <p>
          Onboarding dan misi terintegrasi. Hadiah diterima otomatis saat tujuan
          tercapai.
        </p>
        <b>
          Level {level.level} · {level.xp} XP · {completed}/{missions.length}{" "}
          selesai
        </b>
        <div
          className="tutorial-progress"
          role="progressbar"
          aria-label="Progres misi onboarding"
          aria-valuenow={completed}
          aria-valuemin={0}
          aria-valuemax={missions.length}
        >
          <span style={{ width: `${(completed / missions.length) * 100}%` }} />
        </div>
        <p>
          Hadiah total hingga Rp590 jt untuk modal operasional; setiap misi
          hanya sekali.
        </p>
        {!s.progression && (
          <button
            className="primary"
            onClick={() => act({ type: "enableMissions" })}
          >
            Aktifkan misi & hadiah
          </button>
        )}
        <div className="toolbar">
          {current >= 0 && (
            <button onClick={() => go(missions[current]!.screen)}>
              Kerjakan misi berikutnya
            </button>
          )}
          <button onClick={onContinue}>Kembali ke peta</button>
        </div>
        <p className="muted">
          Setelah membuka menu untuk misi, gunakan Kembali ke misi di bagian
          atas dialog. Tutorial juga dapat dibuka lewat ikon kanan bawah.
        </p>
        <button onClick={toggleSound} aria-pressed={sound}>
          Suara {sound ? "aktif" : "nonaktif"}
        </button>
        <p className="muted">
          Waktu tetap Realism 1× / Casual 1,5×; operasi berlanjut saat browser
          ditutup. Buat cadangan save di Kantor → Tempo & checkpoint.
        </p>
      </Card>
      <Card title="Panduan misi">
        <label>
          Pilih misi
          <select
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
          >
            {missions.map((m, i) => (
              <option key={m.id} value={i}>
                {m.completed ? "✓" : "○"} {i + 1}. {m.title}
              </option>
            ))}
          </select>
        </label>
        <h2>
          {index + 1}. {mission.title}
        </h2>
        <p>{instructions[mission.id]}</p>
        <b>
          +{mission.xp} XP · +{compact(mission.cash)}
        </b>
        <p className={`pill ${mission.completed ? "good" : "warn"}`}>
          {mission.completed
            ? "Selesai · hadiah diterima"
            : "Tujuan belum terpenuhi"}
        </p>
        <div className="toolbar">
          <button className="primary" onClick={() => go(mission.screen)}>
            Buka menu misi →
          </button>
          <button disabled={!index} onClick={() => setIndex(index - 1)}>
            ←
          </button>
          <button
            disabled={index + 1 === missions.length}
            onClick={() => setIndex(index + 1)}
          >
            →
          </button>
        </div>
      </Card>
    </ResponsiveColumns>
  );
}
