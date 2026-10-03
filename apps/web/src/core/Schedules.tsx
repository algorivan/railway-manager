import { useEffect, useState } from "react";
import {
  CORE_SELECTABLE_STATIONS as stations,
  CORE_OPERATING_TRACKS,
  CORE_ROUTING_TRACKS,
  operatingTrackAccessible,
  type CoreClass,
} from "@railway/game-data";
import {
  findCorePath,
  coreServiceName,
  coreDailySchedule,
  stationName,
  type CoreState,
} from "@railway/simulation";
import { Card, clock, when, type Act } from "./presentation";
import { ScrollList, ResponsiveColumns } from "./Compact";
import { StationPicker } from "./StationPicker";
import { SchedulePlanner, CompactStopSheet } from "./SchedulePlanner";
import { NetworkManagement } from "./NetworkManagement";
import { RunReport } from "./RunReport";
export function Schedules({
  state: s,
  act,
  onDirty,
  notify,
  picking,
  pickStation,
  finishPicking,
}: {
  state: CoreState;
  act: Act;
  onDirty: (dirty: boolean) => void;
  notify: (message: string, failed?: boolean) => void;
  picking?: "origin" | "destination";
  pickStation: (
    target: "origin" | "destination",
    onSelect: (station: string) => void,
  ) => void;
  finishPicking: () => void;
}) {
  const [tab, setTab] = useState("relasi"),
    [plannerDirty, setPlannerDirty] = useState(false),
    [relationDirty, setRelationDirty] = useState(false),
    [origin, setOrigin] = useState(s.hub),
    [dest, setDest] = useState(
      stations.find((st) => {
        try {
          return st.id !== s.hub && !!findCorePath(s.hub, st.id, s.access);
        } catch {
          return false;
        }
      })?.id ?? s.hub,
    ),
    [skipped, setSkipped] = useState<string[]>([]),
    [rid, setRid] = useState(s.services[0]?.id ?? ""),
    [day, setDay] = useState(Math.floor(s.minute / 1440)),
    [selected, setSelected] = useState(0),
    [history, setHistory] = useState(false),
    [buyingAccess, setBuyingAccess] = useState(false);
  useEffect(
    () => onDirty(plannerDirty || relationDirty),
    [plannerDirty, relationDirty, onDirty],
  );
  let path: ReturnType<typeof findCorePath> | undefined,
    error = "";
  try {
    path = findCorePath(origin, dest, s.access);
  } catch (e) {
    error = (e as Error).message;
  }
  if (origin === dest) error = "Pilih stasiun awal dan akhir yang berbeda.";
  let lockedSegments: string[] = [];
  if (error && origin !== dest) {
    try {
      lockedSegments = findCorePath(origin, dest).segments.filter((id) => {
        const edge = CORE_ROUTING_TRACKS.find((e) => e.id === id);
        return edge && !operatingTrackAccessible(edge, s.access);
      });
      if (lockedSegments.length)
        error = "Lintasan belum dibuka. Beli akses lintas terlebih dahulu.";
    } catch {
      /* Disconnected stations retain the routing error. */
    }
  }
  const choose = (target: "origin" | "destination", id: string) => {
    const from = target === "origin" ? id : origin,
      to = target === "destination" ? id : dest;
    if (target === "origin") setOrigin(id);
    else setDest(id);
    setSkipped([]);
    setRelationDirty(true);
    if (target === "destination") {
      try {
        findCorePath(from, to, s.access);
      } catch {
        notify(
          "Relasi gagal: lintasan belum dibuka atau belum terhubung. Beli akses lintas melalui tombol di Relasi.",
          true,
        );
      }
    }
  };
  const selectOnMap = (target: "origin" | "destination") => {
    pickStation(target, (id) => {
      choose(target, id);
      if (target === "origin") {
        pickStation("destination", (destination) => {
          setDest(destination);
          setSkipped([]);
          setRelationDirty(true);
          finishPicking();
          try {
            findCorePath(id, destination, s.access);
          } catch {
            notify(
              "Relasi gagal: lintasan belum dibuka atau belum terhubung. Beli akses lintas melalui tombol di Relasi.",
              true,
            );
          }
        });
      } else finishPicking();
    });
  };
  if (picking)
    return (
      <Card
        title={
          picking === "origin"
            ? "1 · Pilih stasiun awal di peta"
            : "2 · Pilih stasiun akhir di peta"
        }
      >
        <p>Klik titik → pilih stasiun. Perbesar peta untuk titik kecil.</p>
        <b>
          {stationName(origin)} → {stationName(dest)}
        </b>
        <div className="toolbar">
          <button onClick={() => selectOnMap("origin")}>
            Pilih ulang asal
          </button>
          <button onClick={finishPicking}>Kembali ke relasi</button>
        </div>
      </Card>
    );
  if (buyingAccess)
    return (
      <div className="compact-workspace">
        <div className="toolbar">
          <button onClick={() => setBuyingAccess(false)}>
            ← Kembali ke relasi
          </button>
        </div>
        <NetworkManagement
          state={s}
          act={act}
          initialSegment={lockedSegments[0]}
        />
      </div>
    );
  const stops =
      path?.stations.filter((id) => stations.some((st) => st.id === id)) ?? [],
    name = coreServiceName(origin, dest),
    relation = s.services.find((r) => r.id === rid),
    daily = coreDailySchedule(s, day),
    current = daily[selected];
  return (
    <div className="compact-workspace">
      <div className="workspace-tabs" role="tablist">
        {[
          ["relasi", "Relasi"],
          ["jadwal", "Atur jadwal"],
          ["rekap", "Rekap harian"],
        ].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id!)}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" hidden={tab !== "jadwal"}>
        <SchedulePlanner state={s} act={act} onDirty={setPlannerDirty} />
      </div>
      <div role="tabpanel" hidden={tab !== "relasi"}>
        <ResponsiveColumns>
          <Card title="Relasi baru · dua arah">
            <div className="toolbar">
              <button className="primary" onClick={() => selectOnMap("origin")}>
                Pilih asal & tujuan di peta
              </button>
              <button onClick={() => selectOnMap("destination")}>
                Pilih tujuan di peta
              </button>
            </div>
            <div className="two-column">
              <StationPicker
                compact
                label="Stasiun awal"
                value={origin}
                onChange={(id) => choose("origin", id)}
              />
              <StationPicker
                compact
                label="Stasiun akhir"
                value={dest}
                onChange={(id) => choose("destination", id)}
              />
            </div>
            <h2>{name}</h2>
            <p>
              {error ||
                `${Math.round(path?.segments.reduce((total, id) => total + (CORE_OPERATING_TRACKS.find((t) => t.id === id)?.distanceKm ?? 0), 0) ?? 0)} km · ${stops.length} stasiun pada lintas`}
            </p>
            {lockedSegments.length > 0 && (
              <div className="locked-route" role="alert">
                <b>Lintasan belum dibuka</b>
                <button onClick={() => setBuyingAccess(true)}>
                  Buka & beli lintas →
                </button>
              </div>
            )}
            <button
              className="primary"
              disabled={!!error}
              onClick={() => {
                if (
                  act(
                    {
                      type: "service",
                      origin,
                      destination: dest,
                      category: "Custom",
                      stops: stops.filter((id) => !skipped.includes(id)),
                    },
                    "Relasi dua arah disimpan. Pilih relasi ini di tab Atur jadwal.",
                  )
                ) {
                  setRelationDirty(false);
                  setTab("jadwal");
                }
              }}
            >
              Simpan relasi
            </button>
            <button
              onClick={() => {
                setOrigin(s.hub);
                setRelationDirty(false);
                setSkipped([]);
              }}
            >
              Batalkan
            </button>
            <p className="muted">
              Relasi gratis; TAC dibayar per perjalanan. Setelah membuat relasi,
              atur kedua jam di tab Atur jadwal.
            </p>
          </Card>
          <Card title="Pemberhentian & tarif">
            <ScrollList
              items={stops.slice(1, -1)}
              render={(id) => (
                <label className="stop-choice" key={id}>
                  <input
                    type="checkbox"
                    checked={!skipped.includes(id)}
                    onChange={(e) => {
                      setSkipped(
                        e.target.checked
                          ? skipped.filter((x) => x !== id)
                          : [...skipped, id],
                      );
                      setRelationDirty(true);
                    }}
                  />
                  {stationName(id)} · 3 menit
                </label>
              )}
            />
            <p className="muted">
              Terminal selalu berhenti; titik yang tidak dicentang hanya
              dilalui.
            </p>
            <label>
              Tarif relasi tersimpan
              <select
                aria-label="Relasi tarif"
                value={rid}
                onChange={(e) => setRid(e.target.value)}
              >
                <option value="">Pilih relasi</option>
                {s.services.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="fare-controls">
              {relation &&
                (["EC", "EX", "LX"] as CoreClass[]).map((cls) => (
                  <label key={cls}>
                    {cls} (% referensi)
                    <input
                      type="number"
                      min={50}
                      max={200}
                      key={`${rid}:${cls}:${relation.fares[cls]}`}
                      defaultValue={Math.round(relation.fares[cls] * 100)}
                      onBlur={(e) =>
                        act({
                          type: "fare",
                          serviceId: rid,
                          cls,
                          multiplier: Number(e.target.value) / 100,
                          auto: false,
                        })
                      }
                    />
                  </label>
                ))}
            </div>
            {relation && (
              <button
                onClick={() => {
                  for (const cls of ["EC", "EX", "LX"] as CoreClass[])
                    act({
                      type: "fare",
                      serviceId: rid,
                      cls,
                      multiplier: 1,
                      auto: true,
                    });
                }}
              >
                Pulihkan tarif otomatis
              </button>
            )}
          </Card>
        </ResponsiveColumns>
      </div>
      <div role="tabpanel" hidden={tab !== "rekap"}>
        <div className="toolbar">
          <button aria-pressed={!history} onClick={() => setHistory(false)}>
            Jadwal harian
          </button>
          <button aria-pressed={history} onClick={() => setHistory(true)}>
            Hasil perjalanan
          </button>
          {!history && (
            <label>
              Hari game
              <input
                type="number"
                min={1}
                value={day + 1}
                onChange={(e) => {
                  setDay(Math.max(0, Number(e.target.value) - 1));
                  setSelected(0);
                }}
              />
            </label>
          )}
        </div>
        {history ? (
          <Card title="Hasil perjalanan">
            <ScrollList
              items={[...s.runs].reverse()}
              render={(run) => (
                <div key={run.id}>
                  <b>{run.name}</b>
                  <RunReport run={run} state={s} />
                  {["held", "stopped"].includes(run.status) && (
                    <button
                      onClick={() => act({ type: "resume", runId: run.id })}
                    >
                      Periksa & lanjutkan
                    </button>
                  )}
                </div>
              )}
            />
          </Card>
        ) : (
          <ResponsiveColumns>
            <Card title={`${daily.length} perjalanan · hari ${day + 1}`}>
              <ScrollList
                items={daily}
                render={(run, i) => (
                  <button
                    key={`${run.planId}:${run.start}`}
                    className={`schedule-block ${selected === i ? "selected" : ""}`}
                    onClick={() => setSelected(i)}
                  >
                    <b>
                      {clock(run.start)} → {clock(run.end)} · {run.name}
                    </b>
                    <span>
                      {stationName(run.origin)} → {stationName(run.destination)}
                    </span>
                    <small>{when(run.start)}</small>
                  </button>
                )}
              />
              {!daily.length && (
                <p>
                  Belum ada jadwal aktif pada hari ini. Simpan jadwal pada tab
                  Atur jadwal.
                </p>
              )}
              <label>
                Jeda jadwal trainset
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value)
                      act(
                        { type: "disableDiagram", trainsetId: e.target.value },
                        "Jadwal berikutnya dijeda. Perjalanan berjalan tetap diselesaikan.",
                      );
                    e.target.value = "";
                  }}
                >
                  <option value="">Pilih kereta untuk menjeda</option>
                  {s.trainsets
                    .filter((t) =>
                      s.plans.some((p) => p.active && p.trainsetId === t.id),
                    )
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </label>
            </Card>
            <Card title="Tujuan | tiba | berangkat">
              {current ? (
                <CompactStopSheet
                  key={`${current.planId}:${current.start}`}
                  run={current}
                />
              ) : (
                <p>Pilih perjalanan untuk melihat pemberhentian.</p>
              )}
            </Card>
          </ResponsiveColumns>
        )}
      </div>
    </div>
  );
}
