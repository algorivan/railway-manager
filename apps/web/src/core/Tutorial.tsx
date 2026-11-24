import { useState } from "react";
import { CORE_ONBOARDING_MISSIONS } from "@railway/game-data";
import {
  coreMissionStatus,
  coreLevel,
  type CoreState,
} from "@railway/simulation";
import { Card, compact, type Act, type Screen } from "./presentation";
import { StoryCampaign } from "./StoryCampaign";
export const TUTORIAL_KEY = "railway-manager-tutorial-v1";
const cues: Record<string, string> = {
  company: "Pilih kota depo → hub.",
  orders: "1 CC201 + 4 Ekonomi Standar + 1 pembangkit → checkout.",
  accept: "Terima pesanan yang siap.",
  formation: "Rakit 6 unit → simpan. Hadiah jadi modal armada berikutnya.",
  crew: "Rekrut otomatis.",
  fuel: "Beli fuel → isi tangki trainset.",
  service: "Pilih asal & tujuan → simpan relasi.",
  schedule: "Atur jam pergi & balik → simpan jadwal.",
  run: "Selesaikan perjalanan pertama.",
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
  const [view, setView] = useState<"story" | "guide">("story");
  const missions = coreMissionStatus(s),
    current = missions.findIndex((m) => !m.completed),
    [selection, setSelection] = useState<string | null>(null),
    index = selection
      ? missions.findIndex((m) => m.id === selection)
      : Math.max(0, current),
    mission = missions[index]!,
    level = coreLevel(s),
    completed = missions.filter((m) => m.completed).length;
  return (
    <>
      <div className="campaign-tabs" aria-label="Campaign dan panduan">
        <button aria-pressed={view === "story"} onClick={() => setView("story")}>Campaign cerita</button>
        <button aria-pressed={view === "guide"} onClick={() => setView("guide")}>Misi operasional</button>
      </div>
      {view === "story" ? <div className="campaign-scroll"><StoryCampaign state={s} act={act} go={go} onContinue={onContinue} /></div> : (
    <Card title="Misi perjalanan pertama" className="mission-workspace">
      <div className="mission-summary">
        <b>
          Level {level.level} · {level.xp} XP
        </b>
        <span>
          {completed}/{missions.length} ✓ ·{" "}
          {compact(
            CORE_ONBOARDING_MISSIONS.reduce((sum, m) => sum + m.cash, 0),
          )}{" "}
          hadiah
        </span>
      </div>
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
      <div className="mission-grid">
        {missions.map((m, i) => (
          <button
            key={m.id}
            className={m.completed ? "complete" : ""}
            aria-pressed={index === i}
            onClick={() => setSelection(m.id)}
          >
            <span>{m.completed ? "✓" : String(i + 1).padStart(2, "0")}</span>
            <b>{m.title}</b>
          </button>
        ))}
      </div>
      <div className="mission-focus">
        <small>MISI {index + 1}</small>
        <h2>{mission.title}</h2>
        <p>{cues[mission.id]}</p>
        <b>
          +{mission.xp} XP · +{compact(mission.cash)}
        </b>
        <button
          className="primary"
          onClick={() => {
            if (!s.progression) {
              if (act({ type: "enableMissions" })) setSelection(null);
            } else go(mission.screen);
          }}
        >
          {!s.progression
            ? "Mulai misi & hadiah"
            : mission.completed
              ? "Buka menu →"
              : "Kerjakan misi →"}
        </button>
        {mission.completed && <small>✓ Hadiah diterima</small>}
      </div>
      <div className="toolbar">
        <button onClick={onContinue}>Kembali ke peta</button>
        <button onClick={toggleSound} aria-pressed={sound}>
          Suara {sound ? "aktif" : "nonaktif"}
        </button>
      </div>
    </Card>
      )}
    </>
  );
}
