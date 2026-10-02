import { ArrowRight, CheckCircle2, Circle, Volume2, VolumeX } from "lucide-react";
import { coreMissionStatus, coreLevel, type CoreState } from "@railway/simulation";
import { Card, compact, type Act, type Screen } from "./presentation";
export const TUTORIAL_KEY = "railway-manager-tutorial-v1";
const instructions: Record<string, string> = {
  company: "Pilih kota depo beserta biayanya, lalu stasiun hub pertama. Depo menjadi tempat menyimpan sarana, fuel dan maintenance.",
  orders: "Di Pasar, pesan 1 CC201, 4 Ekonomi Standar dan 1 pembangkit untuk depo yang sama. Paket starter tersedia langsung; pesanan berikutnya memerlukan waktu pengantaran.",
  accept: "Di Pasar, gulir ke Pesanan & acceptance. Tekan Terima untuk setiap pesanan siap agar sarana masuk inventori.",
  formation: "Di Armada → Trainset & dinas, tekan Buat trainset. Pilih lokomotif, empat kereta dan pembangkit di lokasi yang sama, lalu simpan. Paket starter menyediakan 424 kursi.",
  crew: "Di Kantor, gunakan Rekrut otomatis sesuai kebutuhan pada bagian SDM. Kontrak kru diperlukan sebelum trainset dapat berangkat.",
  fuel: "Beli cadangan fuel di Kantor, lalu buka detail trainset di Armada dan tekan Isi tangki penuh. Stok depo berbeda dari fuel onboard.",
  service: "Di Jadwal, tekan Buat relasi. Pilih stasiun awal, akhir dan pemberhentian. Nama memakai kode stasiun dan relasi dapat digunakan dua arah. Tinjau tarif serta forecast.",
  schedule: "Di Jadwal, pilih trainset dan arah sesuai lokasinya. Gunakan sekali jalan, PP otomatis, atau timetable multi-relasi. Blok menunjukkan estimasi tiba dan jeda; pola harus tersambung tanpa bentrok.",
  run: "Pantau trainset di Peta dan Armada. Jika tertahan, baca alasannya dan perbaiki kesiapan. Selesaikan dinas penumpang pertama, lalu tinjau hasil operasi di Kantor.",
};
const menuNames: Record<Screen, string> = { map: "Peta", fleet: "Armada", schedule: "Jadwal", market: "Pasar", office: "Kantor", tutorial: "Misi" };
export function Tutorial({ state: s, act, go, sound, toggleSound, onContinue }: { state: CoreState; act: Act; go: (screen: Screen) => void; sound: boolean; toggleSound: () => void; onContinue: () => void }) {
  const missions = coreMissionStatus(s), level = coreLevel(s);
  const completed = missions.filter((mission) => mission.completed).length;
  const current = missions.find((mission) => !mission.completed);
  const fuelScreen: Screen = s.depots.some((depot) => depot.stock > 0) ? "fleet" : "office";
  const target = (mission: typeof missions[number]): Screen => mission.id === "fuel" ? fuelScreen : mission.screen;
  return <div className="panel-scroll tutorial-content">
    <Card className="mission-summary">
      <small>ONBOARDING MELALUI MISI</small>
      <h2>Dari depo ke dinas pertama.</h2>
      <p>Selesaikan tujuan berikut sambil bermain. Panduan dan hadiah berada dalam satu rangkaian misi.</p>
      <b>Level {level.level} · {level.xp} XP · {completed}/{missions.length} misi selesai</b>
      <div className="tutorial-progress" role="progressbar" aria-label="Progres misi onboarding" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={missions.length}><span style={{ width: `${completed / missions.length * 100}%` }} /></div>
      <p>Hadiah hingga Rp590 jt untuk modal operasi; setiap misi dibayar sekali. {level.nextLevelAt - level.xp} XP menuju level berikutnya.</p>
      {!s.progression && <button className="primary" onClick={() => act({ type: "enableMissions" })}>Aktifkan misi & hadiah untuk perusahaan ini</button>}
      <div className="toolbar">
        {current && s.progression && <button className="primary" onClick={() => go(target(current))}>Lanjutkan misi {missions.indexOf(current) + 1}<ArrowRight size={15} /></button>}
        <button onClick={onContinue}>{completed === missions.length ? "Lanjut bermain" : "Tutup panduan"}</button>
      </div>
      <p className="muted">Buka kembali lewat ikon Tutorial di kanan bawah. Hadiah diterima otomatis saat tujuan tercapai; membuka menu saja tidak menyelesaikan misi.</p>
    </Card>
    {missions.map((mission, index) => <Card key={mission.id} className={`mission-row mission-guide ${mission.completed ? "done" : ""} ${mission.id === current?.id ? "current" : ""}`}>
      <div className="tutorial-step-title">{mission.completed ? <CheckCircle2 size={19} /> : <Circle size={19} />}<h3>{index + 1}. {mission.title}</h3></div>
      <p>{instructions[mission.id]}</p>
      <small>+{mission.xp} XP · +{compact(mission.cash)}</small>
      {mission.completed ? <span className="pill good">Hadiah diterima</span> : <button onClick={() => go(target(mission))}>Kerjakan · {menuNames[target(mission)]}<ArrowRight size={13} /></button>}
      {mission.id === "fuel" && !mission.completed && <button onClick={() => go(fuelScreen === "office" ? "fleet" : "office")}>Buka {fuelScreen === "office" ? "Armada" : "Kantor"}<ArrowRight size={13} /></button>}
    </Card>)}
    <Card title="Suara, waktu & cadangan">
      <p>Pesan hijau dan nada naik menandai tindakan berhasil; pesan merah dan nada turun menjelaskan kegagalan. Realism berjalan 1× dan Casual 1,5×. Jadwal juga diproses ketika save dibuka kembali.</p>
      <p>Save tersimpan pada browser dan alamat situs ini. Gunakan ekspor/impor di Kantor untuk cadangan atau pindah perangkat.</p>
      <button onClick={toggleSound} aria-pressed={sound}>{sound ? <Volume2 size={16} /> : <VolumeX size={16} />} Suara {sound ? "aktif" : "nonaktif"}</button>
    </Card>
  </div>;
}
