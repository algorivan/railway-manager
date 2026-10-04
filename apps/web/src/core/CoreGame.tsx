import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Map as MapIcon,
  CalendarDays,
  TrainFront,
  Store,
  Building2,
  ArrowRight,
  AlertTriangle,
  BookOpen,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Warehouse,
} from "lucide-react";
import {
  CORE_SELECTABLE_STATIONS as stations,
  CORE_ROUTING_TRACKS as tracks,
  EAST_JAVA_CORRIDORS,
  CORE_NETWORK_SOURCE,
  operatingTrackAccessible,
  depotContractPrice,
} from "@railway/game-data";
import {
  applyCoreAction,
  catchUpCore,
  createCoreState,
  createCompanyDraft,
  coreLevel,
  pace,
  restoreCore,
  serializeCore,
  stationName,
  type CoreState,
} from "@railway/simulation";
import { Card, compact, clock, type Act, type Screen } from "./presentation";
import {
  Feedback,
  useFeedback,
  actionMessages,
  readPreference,
  writePreference,
} from "./feedback";
import { journeyEvents } from "./journey-events";
import { CompanySetup } from "./CompanySetup";
import { FleetMonitor } from "./FleetMonitor";
import { TrainJourneyDetails } from "./TrainJourneyDetails";
import { GameHeader } from "./GameHeader";
import { ManagementDialog } from "./Compact";
import { NetworkManagement } from "./NetworkManagement";
import "./core.css";
const TUTORIAL_KEY = "railway-manager-tutorial-v1";
const CoreMap = lazy(() =>
  import("./CoreMap").then((module) => ({ default: module.CoreMap })),
);
const Fleet = lazy(() =>
  import("./Fleet").then((module) => ({ default: module.Fleet })),
);
const Schedules = lazy(() =>
  import("./Schedules").then((module) => ({ default: module.Schedules })),
);
const Market = lazy(() =>
  import("./Market").then((module) => ({ default: module.Market })),
);
const Office = lazy(() =>
  import("./Office").then((module) => ({ default: module.Office })),
);
const Tutorial = lazy(() =>
  import("./Tutorial").then((module) => ({ default: module.Tutorial })),
);
const SAVE = "railway-manager-v7";

export default function CoreGame() {
  const feedback = useFeedback();
  const loadError = useRef("");
  const [state, setState] = useState<CoreState>(() => {
    const saved = localStorage.getItem(SAVE);
    if (!saved) return createCompanyDraft(Date.now());
    try {
      return catchUpCore(restoreCore(saved), Date.now());
    } catch {
      loadError.current =
        "Save tidak dapat dibaca. File asli dipertahankan; impor checkpoint untuk memulihkan.";
      return createCoreState(Date.now());
    }
  });
  const stateRef = useRef(state);
  const recentActions = useRef(new Map<string, { id: string; at: number }>());
  const [screen, setScreen] = useState<Screen>(() =>
    readPreference(TUTORIAL_KEY) ? "fleet" : "tutorial",
  );
  const [open, setOpen] = useState(true);
  const [detailTrainsetId, setDetailTrainsetId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(
    () => !readPreference(TUTORIAL_KEY),
  );
  const [mapPicking, setMapPicking] = useState<{
    target: "origin" | "destination";
    onSelect: (station: string) => void;
  } | null>(null);
  const [draftDirty, setDraftDirty] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fleetView, setFleetView] = useState<"operations" | "depot">(
    "operations",
  );
  const [tutorialJourney, setTutorialJourney] = useState(false);
  const [notice, setNotice] = useState(
    loadError.current ||
      "Mulai dari sarana kecil. Bangun layanan yang bisa Anda andalkan.",
  );
  const [error, setError] = useState(!!loadError.current);
  const [saveBlocked, setSaveBlocked] = useState(!!loadError.current);
  const [ownsSave, setOwnsSave] = useState(false);
  const ownsSaveRef = useRef(false);
  const [welcome, setWelcome] = useState(() =>
    state.runs.some((r) => r.status === "completed"),
  );
  useEffect(() => {
    let disposed = false;
    let release = () => {};
    if (!navigator.locks) {
      ownsSaveRef.current = true;
      setOwnsSave(true);
      return;
    }
    void navigator.locks.request(SAVE, async () => {
      if (disposed) return;
      // Re-read after acquiring the lock: another tab may have progressed while this tab waited.
      const saved = localStorage.getItem(SAVE);
      if (saved && !loadError.current) {
        try {
          const next = catchUpCore(restoreCore(saved), Date.now());
          stateRef.current = next;
          setState(next);
        } catch {
          setSaveBlocked(true);
        }
      }
      ownsSaveRef.current = true;
      setOwnsSave(true);
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    });
    return () => {
      disposed = true;
      ownsSaveRef.current = false;
      release();
    };
  }, []);
  const notifyJourneys = (before: CoreState, next: CoreState) => {
    const events = journeyEvents(before, next);
    const recent = events.slice(-3);
    for (const event of recent) {
      const run = event.run;
      const name =
        next.trainsets.find((t) => t.id === run.trainsetId)?.name ?? run.name;
      feedback.notifyJourney(
        event.kind === "departure"
          ? `${name} berangkat dari ${stationName(run.origin)} menuju ${stationName(run.destination)} · ${clock(event.minute)}.`
          : `${name} telah tiba di ${stationName(run.destination)} · ${clock(event.minute)}.`,
        event.kind === "departure" ? "Kereta diberangkatkan" : "Kereta tiba",
      );
    }
  };
  useEffect(() => {
    feedback.setTrainsMoving(
      state.runs.some(
        (run) => run.status === "running" && run.phase === "move",
      ),
    );
  }, [state.runs]);
  useEffect(() => {
    const timer = setInterval(() => {
      try {
        const before = stateRef.current;
        const next = catchUpCore(before, Date.now());
        notifyJourneys(before, next);
        const earnedXP =
          (next.progression?.xp ?? 0) - (before.progression?.xp ?? 0);
        if (earnedXP > 0) {
          const cash = next.ledger
            .filter(
              (entry) =>
                entry.id.startsWith("mission:") &&
                !before.ledger.some((old) => old.id === entry.id),
            )
            .reduce((sum, entry) => sum + entry.cash, 0);
          const message = `Misi selesai! +${earnedXP} XP · +${compact(cash)} modal operasi.`;
          setNotice(message);
          setError(false);
          feedback.notify(message, false, false);
        }
        stateRef.current = next;
        setState(next);
      } catch (e) {
        setNotice((e as Error).message);
        setError(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (saveBlocked || !ownsSave) return;
    try {
      localStorage.setItem(SAVE, serializeCore(state));
    } catch {
      setNotice(
        "Penyimpanan browser penuh/tidak tersedia. Ekspor save sebelum menutup tab.",
      );
      setError(true);
    }
  }, [state, saveBlocked, ownsSave]);
  const go = (target: Screen, view: "operations" | "depot" = "operations") => {
    if (draftDirty) {
      notify("Simpan atau tutup rancangan jadwal sebelum berganti menu.", true);
      return;
    }
    setMapPicking(null);
    if (screen === "tutorial" && target !== "tutorial")
      setTutorialJourney(true);
    if (target === "tutorial") setTutorialJourney(false);
    setScreen(target);
    setFleetView(view);
    setModalOpen(true);
  };
  const notify = (message: string, failed = false) => {
    setNotice(message);
    setError(failed);
    feedback.notify(message, failed);
  };
  const act: Act = (action, message = actionMessages[action.type]) => {
    try {
      if (saveBlocked)
        throw new Error("Pulihkan atau ekspor save lama sebelum melanjutkan.");
      if (!ownsSaveRef.current)
        throw new Error(
          "Save sedang digunakan tab lain. Tutup tab operasi tersebut untuk melanjutkan di sini.",
        );
      const now = Date.now(),
        key = JSON.stringify(action),
        recent = recentActions.current.get(key);
      const id =
        recent && now - recent.at < 1000 ? recent.id : crypto.randomUUID();
      recentActions.current.set(key, { id, at: now });
      const before = stateRef.current;
      const beforeXP = before.progression?.xp ?? 0;
      const next = applyCoreAction(stateRef.current, action, id, now);
      notifyJourneys(before, next);
      stateRef.current = next;
      setState(next);
      const earnedXP = (next.progression?.xp ?? 0) - beforeXP;
      const cashReward = next.ledger
        .filter(
          (entry) =>
            entry.id.startsWith("mission:") &&
            !before.ledger.some((old) => old.id === entry.id),
        )
        .reduce((sum, entry) => sum + entry.cash, 0);
      notify(
        earnedXP > 0
          ? `${message} Misi selesai! +${earnedXP} XP · +${compact(cashReward)} modal operasi.`
          : message,
      );
      return true;
    } catch (e) {
      notify((e as Error).message, true);
      return false;
    }
  };
  const completed = state.runs.filter((r) => r.status === "completed");
  const contribution = completed.reduce((v, r) => v + r.revenue - r.cost, 0);
  const exportSave = () => {
    try {
      const contents = saveBlocked
        ? localStorage.getItem(SAVE)!
        : serializeCore(stateRef.current);
      const url = URL.createObjectURL(
        new Blob([contents], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "railway-manager-save.json";
      a.click();
      URL.revokeObjectURL(url);
      notify("File checkpoint disiapkan untuk diunduh.");
    } catch (e) {
      notify(`Ekspor gagal: ${(e as Error).message}`, true);
    }
  };
  const importSave = async (file: File) => {
    setImporting(true);
    try {
      if (!ownsSaveRef.current)
        throw new Error("Tutup tab operasi lain sebelum mengimpor save.");
      const next = catchUpCore(restoreCore(await file.text()), Date.now());
      // Keep a recoverable copy when importing over a current game.
      localStorage.setItem(
        `${SAVE}-backup`,
        localStorage.getItem(SAVE) ?? serializeCore(stateRef.current),
      );
      stateRef.current = next;
      setState(next);
      setSaveBlocked(false);
      notify("Checkpoint diimpor; progres offline direkonsiliasi.");
    } catch (e) {
      notify(`Impor gagal: ${(e as Error).message}`, true);
    } finally {
      setImporting(false);
    }
  };
  const nav = [
    { id: "map", label: "Peta", icon: MapIcon },
    { id: "schedule", label: "Jadwal", icon: CalendarDays },
    { id: "fleet", label: "Armada", icon: TrainFront },
    { id: "market", label: "Pasar", icon: Store },
    { id: "office", label: "Kantor", icon: Building2 },
    { id: "tutorial", label: "Tutorial", icon: BookOpen },
  ] as const;
  if (state.companyStarted === false && !saveBlocked)
    return (
      <main className="core-game">
        <CompanySetup
          state={state}
          act={act}
          ready={ownsSave}
          onStarted={() => go("tutorial")}
        />
        <Feedback notices={feedback.notices} dismiss={feedback.dismiss} />
      </main>
    );
  return (
    <main
      className={`core-game ${open ? "sidebar-open" : "sidebar-collapsed"} ${mapPicking ? "station-picking" : ""}`}
    >
      <Suspense
        fallback={
          <div className="map-boot-loading" role="status">
            Memuat peta operasi…
          </div>
        }
      >
        <CoreMap
          state={state}
          picking={mapPicking?.target}
          onPick={(station) => mapPicking?.onSelect(station)}
          onTrainDetails={(trainsetId) => {
            setDetailTrainsetId(trainsetId);
            setOpen(true);
          }}
        />
      </Suspense>
      <GameHeader state={state} />
      <div className="map-caption">
        <span className="live-dot" /> DUNIA OPERATOR TUNGGAL{" "}
        <span>· Hari {Math.floor(state.minute / 1440) + 1}</span>
      </div>
      <aside
        id="operations-sidebar"
        className="operations-panel monitoring-panel"
        hidden={!open}
      >
        <div className="panel-heading">
          <div>
            <small>PANTAU PERJALANAN</small>
            <h1>
              {detailTrainsetId ? "Detail perjalanan" : "Armada langsung"}
            </h1>
          </div>
          <button
            className="icon-button"
            aria-label="Ciutkan sidebar"
            onClick={() => setOpen(false)}
          >
            <ChevronLeft size={20} />
          </button>
        </div>
        {detailTrainsetId ? (
          <TrainJourneyDetails
            state={state}
            trainsetId={detailTrainsetId}
            back={() => setDetailTrainsetId(null)}
          />
        ) : (
          <FleetMonitor state={state} onDetails={setDetailTrainsetId} />
        )}
      </aside>
      {modalOpen && (
        <ManagementDialog
          key={`${screen}:${fleetView}`}
          title={
            screen === "map"
              ? "Peta & jaringan"
              : screen === "schedule"
                ? "Jadwal perjalanan"
                : screen === "market"
                  ? "Pasar sarana"
                  : screen === "office"
                    ? "Kantor perusahaan"
                    : screen === "tutorial"
                      ? "Misi & panduan"
                      : fleetView === "depot"
                        ? "Depo & inventori"
                        : "Kelola armada"
          }
          returnToMissions={
            tutorialJourney && screen !== "tutorial"
              ? () => go("tutorial")
              : undefined
          }
          interactiveMap={!!mapPicking}
          dirty={draftDirty && !mapPicking}
          discard={() => setDraftDirty(false)}
          close={() => {
            if (mapPicking) {
              setMapPicking(null);
              return;
            }
            setModalOpen(false);
            setDraftDirty(false);
          }}
        >
          <Suspense
            fallback={
              <div className="panel-loading" role="status">
                <span className="loading-spinner" />
                Memuat menu…
              </div>
            }
          >
            {screen === "fleet" && (
              <Fleet
                state={state}
                act={act}
                go={go}
                view={fleetView}
                setView={setFleetView}
              />
            )}
            {screen === "schedule" && (
              <Schedules
                state={state}
                act={act}
                onDirty={setDraftDirty}
                notify={notify}
                picking={mapPicking?.target}
                pickStation={(target, onSelect) =>
                  setMapPicking({ target, onSelect })
                }
                finishPicking={() => setMapPicking(null)}
              />
            )}
            {screen === "market" && (
              <Market state={state} act={act} notify={notify} />
            )}
            {screen === "office" && (
              <Office
                go={go}
                state={state}
                act={act}
                exportSave={exportSave}
                importSave={importSave}
                notify={notify}
              />
            )}
            {screen === "tutorial" && (
              <Tutorial
                state={state}
                act={act}
                go={go}
                sound={feedback.sound}
                toggleSound={feedback.toggleSound}
                onContinue={() => {
                  writePreference(TUTORIAL_KEY, "seen");
                  setModalOpen(false);
                  setTutorialJourney(false);
                }}
              />
            )}
            {screen === "map" && <NetworkManagement state={state} act={act} />}
          </Suspense>
        </ManagementDialog>
      )}
      {!open && (
        <button
          className="sidebar-expand"
          aria-label="Buka sidebar"
          aria-controls="operations-sidebar"
          aria-expanded={false}
          onClick={() => setOpen(true)}
        >
          <ChevronRight size={22} />
        </button>
      )}
      <nav className="game-dock" aria-label="Menu utama">
        {nav.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            aria-label={label}
            aria-current={screen === id && modalOpen ? "page" : undefined}
            className={screen === id && modalOpen ? "active" : ""}
            onClick={() => go(id)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
        <button
          aria-label="Depo"
          className={
            screen === "fleet" && fleetView === "depot" && modalOpen
              ? "active"
              : ""
          }
          onClick={() => go("fleet", "depot")}
        >
          <Warehouse size={22} />
          <span>Depo</span>
        </button>
        <button
          aria-label={feedback.sound ? "Nonaktifkan suara" : "Aktifkan suara"}
          aria-pressed={feedback.sound}
          onClick={feedback.toggleSound}
        >
          {feedback.sound ? <Volume2 size={20} /> : <VolumeX size={20} />}
          <span>Suara</span>
        </button>
      </nav>
      {importing && (
        <div className="import-loading" role="status">
          <span className="loading-spinner" />
          Memulihkan checkpoint dan progres offline…
        </div>
      )}
      {!ownsSave && (
        <div className="save-access-loading" role="status">
          Menunggu akses save. Tutup tab operasi lain jika masih terbuka.
        </div>
      )}
      <Feedback notices={feedback.notices} dismiss={feedback.dismiss} />
      <div
        role={error ? "alert" : "status"}
        className={`game-notice ${error ? "error" : ""}`}
      >
        {error ? <AlertTriangle size={16} /> : <span className="live-dot" />}
        <span>{notice}</span>
      </div>
      {welcome && (
        <div className="modal-backdrop">
          <section className="welcome-card">
            <small>KEMBALI KE RUANG OPERASI</small>
            <h2>Rencana Anda terus berjalan.</h2>
            <div className="stats">
              <div>
                <strong>{completed.length}</strong>
                <small>Dinas selesai</small>
              </div>
              <div>
                <strong>{compact(contribution)}</strong>
                <small>Kontribusi dinas</small>
              </div>
            </div>
            <p>
              {state.runs.filter((r) => r.status === "held").length} dinas
              tertahan. Periksa fuel, lokasi dan kesiapan sebelum melanjutkan.
            </p>
            <button className="primary" onClick={() => setWelcome(false)}>
              Tinjau operasi <ArrowRight size={16} />
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
