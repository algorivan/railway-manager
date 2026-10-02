import { useEffect, useRef, useState } from "react";
import {
  Map as MapIcon,
  CalendarDays,
  TrainFront,
  Store,
  Building2,
  ArrowRight,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  JAVA_STATION_CATALOG as stations,
  JAVA_TRACK_CORRIDOR_SEGMENTS as tracks,
} from "@railway/game-data";
import {
  applyCoreAction,
  catchUpCore,
  createCoreState,
  pace,
  restoreCore,
  serializeCore,
  stationName,
  type CoreState,
} from "@railway/simulation";
import { CoreMap } from "./CoreMap";
import { Fleet } from "./Fleet";
import { Schedules } from "./Schedules";
import { Market } from "./Market";
import { Office } from "./Office";
import { Card, compact, clock, type Act, type Screen } from "./presentation";
import "./core.css";
const SAVE = "railway-manager-v7";

export default function CoreGame() {
  const loadError = useRef("");
  const [state, setState] = useState<CoreState>(() => {
    const saved = localStorage.getItem(SAVE);
    if (!saved) return createCoreState(Date.now());
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
  const [screen, setScreen] = useState<Screen>("fleet");
  const [open, setOpen] = useState(true);
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
  useEffect(() => {
    const timer = setInterval(() => {
      try {
        const next = catchUpCore(stateRef.current, Date.now());
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
  const act: Act = (action, message = "Perubahan tersimpan.") => {
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
      const next = applyCoreAction(stateRef.current, action, id, now);
      stateRef.current = next;
      setState(next);
      setNotice(message);
      setError(false);
      return true;
    } catch (e) {
      setNotice((e as Error).message);
      setError(true);
      return false;
    }
  };
  const completed = state.runs.filter((r) => r.status === "completed");
  const contribution = completed.reduce((v, r) => v + r.revenue - r.cost, 0);
  const exportSave = () => {
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
  };
  const importSave = async (file: File) => {
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
      setNotice("Checkpoint diimpor; progres offline direkonsiliasi.");
      setError(false);
    } catch (e) {
      setNotice(`Impor gagal: ${(e as Error).message}`);
      setError(true);
    }
  };
  const nav = [
    { id: "map", label: "Peta", icon: MapIcon },
    { id: "schedule", label: "Jadwal", icon: CalendarDays },
    { id: "fleet", label: "Armada", icon: TrainFront },
    { id: "market", label: "Pasar", icon: Store },
    { id: "office", label: "Kantor", icon: Building2 },
  ] as const;
  return (
    <main className="core-game">
      <CoreMap state={state} />
      <header className="game-header">
        <div className="brand">
          <span className="brand-mark">
            <TrainFront size={22} />
          </span>
          <div>
            <b>
              RAILWAY<span> MANAGER</span>
            </b>
            <small>Perusahaan Anda · {stationName(state.hub)}</small>
          </div>
        </div>
        <div className="header-metrics">
          <div>
            <small>Kas tersedia</small>
            <strong>{compact(state.cash)}</strong>
          </div>
          <div>
            <small>Reputasi</small>
            <strong>
              {state.reputation.toFixed(1)}
              <em>/100</em>
            </strong>
          </div>
          <div>
            <small>
              {state.mode} · {pace(state)}×
            </small>
            <strong>
              {clock(state.minute)} <em>WIB</em>
            </strong>
          </div>
        </div>
      </header>
      <div className="map-caption">
        <span className="live-dot" /> DUNIA OPERATOR TUNGGAL{" "}
        <span>· Hari {Math.floor(state.minute / 1440) + 1}</span>
      </div>
      {open && (
        <aside className="operations-panel">
          <div className="panel-heading">
            <div>
              <small>RUANG OPERASI</small>
              <h1>
                {screen === "map"
                  ? "Jaringan Jawa"
                  : screen === "fleet"
                    ? "Armada & operasi"
                    : screen === "schedule"
                      ? "Diagram dinas"
                      : screen === "market"
                        ? "Pasar sarana"
                        : "Kantor perusahaan"}
              </h1>
            </div>
            <button
              className="icon-button"
              aria-label="Tutup panel"
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          {screen === "fleet" && (
            <Fleet state={state} act={act} go={setScreen} />
          )}
          {screen === "schedule" && <Schedules state={state} act={act} />}
          {screen === "market" && <Market state={state} act={act} />}
          {screen === "office" && (
            <Office
              state={state}
              act={act}
              exportSave={exportSave}
              importSave={importSave}
            />
          )}
          {screen === "map" && (
            <div className="panel-scroll">
              <Card title="Jaringan yang terhubung">
                <p className="muted">
                  Koridor dari katalog repository. Garis adalah skema
                  konektivitas; belum merupakan dataset blok Gapeka 2025
                  tervalidasi.
                </p>
                {tracks.map((e) => (
                  <div className="list-row" key={e.id}>
                    <div>
                      <b>
                        {stationName(e.originStationId)} →{" "}
                        {stationName(e.destinationStationId)}
                      </b>
                      <small>
                        {e.distanceKm} km ·{" "}
                        {e.isDoubleTrack ? "Double track" : "Single track"}
                      </small>
                    </div>
                    {state.access.includes(e.id) ? (
                      <span className="pill good">Terbuka</span>
                    ) : (
                      <button
                        onClick={() =>
                          act(
                            { type: "access", segmentId: e.id },
                            "Akses lintas dibuka.",
                          )
                        }
                      >
                        Buka · Rp25 jt
                      </button>
                    )}
                  </div>
                ))}
              </Card>
              <Card title="Fasilitas kontrak">
                {stations
                  .filter(
                    (st) => !state.depots.some((d) => d.station === st.id),
                  )
                  .map((st) => (
                    <div className="list-row" key={st.id}>
                      <span>{stationName(st.id)}</span>
                      <button
                        onClick={() => act({ type: "depot", station: st.id })}
                      >
                        Kontrak dipo · Rp10 jt
                      </button>
                    </div>
                  ))}
              </Card>
            </div>
          )}
        </aside>
      )}
      <nav className="game-dock" aria-label="Menu utama">
        {nav.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={screen === id && open ? "active" : ""}
            onClick={() => {
              setScreen(id);
              setOpen(screen !== id || !open);
            }}
            aria-label={label}
          >
            <Icon size={21} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
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
