import { useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";
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
type Notice = { id: number; message: string; failed: boolean };
export function useFeedback() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [sound, setSound] = useState(() => readPreference(SOUND_KEY) !== "off");
  const audio = useRef<AudioContext | null>(null);
  const counter = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      void audio.current?.close().catch(() => {});
    },
    [],
  );
  const play = (failed: boolean) => {
    if (!sound) return;
    try {
      // Created only during a player gesture; never autoplay on page load.
      const context = (audio.current ??= new AudioContext());
      const tone = () => {
        const start = context.currentTime;
        (failed ? [330, 220] : [523, 784]).forEach((frequency, index) => {
          const oscillator = context.createOscillator(),
            gain = context.createGain();
          oscillator.type = "sine";
          oscillator.frequency.value = frequency;
          const at = start + index * 0.12;
          gain.gain.setValueAtTime(0, at);
          gain.gain.linearRampToValueAtTime(0.08, at + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, at + 0.16);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start(at);
          oscillator.stop(at + 0.18);
          oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
          };
        });
      };
      if (context.state === "suspended")
        void context
          .resume()
          .then(tone)
          .catch(() => {});
      else if (context.state === "running") tone();
    } catch {
      /* Visual feedback remains available without browser audio. */
    }
  };
  const notify = (message: string, failed = false, audible = true) => {
    const id = ++counter.current;
    setNotices((items) => [...items.slice(-2), { id, message, failed }]);
    if (audible) play(failed);
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
    sound,
    toggleSound: () =>
      setSound((value) => {
        writePreference(SOUND_KEY, value ? "off" : "on");
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
            <b>{item.failed ? "Tindakan gagal" : "Berhasil"}</b>
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
