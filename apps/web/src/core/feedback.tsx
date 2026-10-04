import { useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import { StationAudio } from "./station-audio";
import type { CoreAction } from "@railway/simulation";

const SOUND_KEY = "railway-manager-sound";
export function readPreference(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function writePreference(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Preferences are optional. */
  }
}
export const actionMessages: Record<CoreAction["type"], string> = {
  foundCompany:
    "Depo didirikan dan hub pertama ditetapkan. Perusahaan siap beroperasi.",
  enableMissions: "Misi dan reward perusahaan diaktifkan.",
  hub: "Hub awal dipilih.",
  order: "Pesanan tercatat. Terima sarana setelah siap.",
  orderCart: "Checkout berhasil. Pesanan tercatat untuk depo penerima.",
  accept: "Sarana diterima ke inventori.",
  formation: "Formasi trainset disimpan.",
  service: "Relasi baru dibuat. Atur tarif dan jadwal keberangkatan.",
  fare: "Tarif layanan diperbarui.",
  schedule: "Jadwal diaktifkan. Kereta berangkat pada waktu yang ditentukan.",
  diagram: "Diagram dinas diaktifkan.",
  disablePlan: "Jadwal dinonaktifkan.",
  disableDiagram: "Diagram dinas dinonaktifkan.",
  resume: "Dinas dilanjutkan.",
  stop: "Permintaan berhenti dicatat untuk stasiun aman berikutnya.",
  recall: "Permintaan perjalanan pulang dicatat.",
  cargoContract:
    "Kontrak kargo diterima. Dana investasi tercatat terpisah dari pendapatan operasi.",
  fuel: "Fuel dibeli ke dipo. Isi tangki dari detail trainset.",
  recruitAuto:
    "SDM otomatis direkrut dan ditugaskan ke seluruh trainset yang membutuhkan kru.",
  fill: "Tangki trainset diisi dari stok dipo.",
  crew: "Kontrak kru diaktifkan.",
  park: "Trainset diparkir di dipo.",
  maintenance:
    "Pekerjaan perawatan dimulai. Unit belum siap beroperasi sampai selesai.",
  swap: "Unit pengganti dipasang pada trainset.",
  depot: "Kontrak dipo diaktifkan.",
  upgrade: "Upgrade gudang dimulai.",
  access: "Akses lintas dibuka.",
  marketing: "Kampanye marketing diaktifkan.",
  mode: "Tempo permainan diperbarui.",
};
type Notice = { id: number; message: string; failed: boolean; title?: string };
export function useFeedback() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [sound, setSound] = useState(() => readPreference(SOUND_KEY) !== "off");
  const audio = useRef<StationAudio | null>(null);
  const counter = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const station = new StationAudio(readPreference(SOUND_KEY) !== "off");
    audio.current = station;
    const gesture = () => {
      void station.unlock();
    };
    const visibility = () => station.visibility();
    document.addEventListener("pointerdown", gesture, true);
    document.addEventListener("keydown", gesture, true);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      timers.current.forEach(clearTimeout);
      document.removeEventListener("pointerdown", gesture, true);
      document.removeEventListener("keydown", gesture, true);
      document.removeEventListener("visibilitychange", visibility);
      station.dispose();
      audio.current = null;
    };
  }, []);
  useEffect(() => audio.current?.setEnabled(sound), [sound]);
  const notify = (
    message: string,
    failed = false,
    audible = true,
    title?: string,
  ) => {
    const id = ++counter.current;
    setNotices((items) => [...items.slice(-2), { id, message, failed, title }]);
    if (audible) audio.current?.feedback(failed);
    if (!failed) {
      const timer = setTimeout(() => {
        setNotices((items) => items.filter((item) => item.id !== id));
        timers.current.delete(timer);
      }, 6000);
      timers.current.add(timer);
    }
  };
  return {
    notices,
    notify,
    notifyJourney: (message: string, title: string) => {
      notify(message, false, false, title);
      audio.current?.announcement();
    },
    setTrainsMoving: (moving: boolean) =>
      audio.current?.setTrainsMoving(moving),
    sound,
    toggleSound: () =>
      setSound((value) => {
        writePreference(SOUND_KEY, value ? "off" : "on");
        audio.current?.setEnabled(!value);
        return !value;
      }),
    dismiss: (id: number) =>
      setNotices((items) => items.filter((item) => item.id !== id)),
  };
}
export function Feedback({
  notices,
  dismiss,
}: {
  notices: Notice[];
  dismiss: (id: number) => void;
}) {
  return (
    <div className="feedback-stack" aria-label="Notifikasi tindakan">
      {notices.map((item) => (
        <div
          key={item.id}
          className={`feedback-toast ${item.failed ? "failed" : "succeeded"}`}
        >
          {item.failed ? (
            <AlertTriangle size={21} />
          ) : (
            <CheckCircle2 size={21} />
          )}
          <div role={item.failed ? "alert" : "status"}>
            <b>{item.title ?? (item.failed ? "Tindakan gagal" : "Berhasil")}</b>
            <p>{item.message}</p>
          </div>
          <button
            className="icon-button"
            aria-label="Tutup notifikasi"
            onClick={() => dismiss(item.id)}
          >
            <X size={17} />
          </button>
        </div>
      ))}
    </div>
  );
}
