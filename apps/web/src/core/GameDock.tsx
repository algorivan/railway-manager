import { useEffect, useRef } from "react";
import {
  Map as MapIcon, CalendarDays, TrainFront, Store, Building2,
  BookOpen, Warehouse, Volume2, VolumeX, Menu,
} from "lucide-react";
import type { Screen } from "./presentation";

const primary = [
  { id: "map", label: "Peta", icon: MapIcon },
  { id: "schedule", label: "Jadwal", icon: CalendarDays },
  { id: "fleet", label: "Armada", icon: TrainFront },
  { id: "market", label: "Pasar", icon: Store },
  { id: "office", label: "Kantor", icon: Building2 },
] as const;

/** Keep the five primary destinations visible; secondary actions tuck away on phones. */
export function GameDock({ screen, depot, open, go, sound, toggleSound }: {
  screen: Screen;
  depot: boolean;
  open: boolean;
  go: (screen: Screen, view?: "operations" | "depot") => void;
  sound: boolean;
  toggleSound: () => void;
}) {
  const more = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (more.current && !more.current.contains(event.target as Node))
        more.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && more.current?.open) {
        more.current.open = false;
        more.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const visit = (target: Screen, view?: "operations" | "depot") => {
    if (more.current) more.current.open = false;
    go(target, view);
  };
  const secondary = (mobile: boolean) => (
    <>
      <button className={`${!mobile ? "dock-secondary " : ""}${screen === "tutorial" && open ? "active" : ""}`}
        aria-label="Tutorial" aria-current={screen === "tutorial" && open ? "page" : undefined}
        onClick={() => visit("tutorial")}>
        <BookOpen size={20} /><span>{mobile ? "Misi & panduan" : "Tutorial"}</span>
      </button>
      <button className={`${!mobile ? "dock-secondary " : ""}${screen === "fleet" && depot && open ? "active" : ""}`}
        aria-label="Depo" onClick={() => visit("fleet", "depot")}>
        <Warehouse size={20} /><span>Depo</span>
      </button>
      <button className={!mobile ? "dock-secondary" : undefined}
        aria-label={sound ? "Nonaktifkan suara" : "Aktifkan suara"}
        aria-pressed={sound} onClick={toggleSound}>
        {sound ? <Volume2 size={20} /> : <VolumeX size={20} />}<span>Suara</span>
      </button>
    </>
  );
  return (
    <nav className="game-dock" aria-label="Menu utama">
      {primary.map(({ id, label, icon: Icon }) => (
        <button key={id} aria-label={label}
          aria-current={screen === id && open && !(id === "fleet" && depot) ? "page" : undefined}
          className={screen === id && open && !(id === "fleet" && depot) ? "active" : ""}
          onClick={() => visit(id)}>
          <Icon size={20} /><span>{label}</span>
        </button>
      ))}
      {secondary(false)}
      <details ref={more} className="dock-more">
        <summary aria-label="Menu lainnya"><Menu size={20} /><span>Lainnya</span></summary>
        <div className="dock-more-actions" aria-label="Menu tambahan">{secondary(true)}</div>
      </details>
    </nav>
  );
}
