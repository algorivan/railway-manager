import { useEffect, useState } from "react";
import {
  coreFixedRoundTrip,
  coreAutomaticRoundTrips,
  coreDraftScheduleRuns,
  coreRunStationTimes,
  previewCoreDiagram,
  coreReadiness,
  forecastCore,
  stationName,
  type CoreDuty,
  type CoreRun,
  type CoreState,
} from "@railway/simulation";
import { Card, clock, compact, when, type Act } from "./presentation";
import { ResponsiveColumns } from "./Compact";
const minutes = (value: string) => {
  const [h, m] = value.split(":").map(Number);
  return h! * 60 + m!;
};
export function CompactStopSheet({ run }: { run: CoreRun }) {
  const rows = coreRunStationTimes(run);
  return (
    <div className="stop-sheet">
      <b>
        {stationName(run.origin)} → {stationName(run.destination)}
      </b>
      <small>
        {when(run.start)} — {when(run.end)} · {Math.ceil(run.end - run.start)}{" "}
        menit
      </small>
      <div className="stop-table-scroll detail-scroll" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th>Tujuan</th>
              <th>Tiba</th>
              <th>Berangkat</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.stationId}>
                <td>{stationName(row.stationId)}</td>
                <td>
                  {row.arrival === null
                    ? "—"
                    : clock(row.arrival) +
                      (Math.floor(row.arrival / 1440) >
                      Math.floor(run.start / 1440)
                        ? ` (+${Math.floor(row.arrival / 1440) - Math.floor(run.start / 1440)} hari)`
                        : "")}
                </td>
                <td>{row.departure === null ? "—" : clock(row.departure)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export function SchedulePlanner({
  state: s,
  act,
  onDirty,
}: {
  state: CoreState;
  act: Act;
  onDirty: (dirty: boolean) => void;
}) {
  const [tid, setTid] = useState(s.trainsets[0]?.id ?? ""),
    [rid, setRid] = useState(s.services[0]?.id ?? ""),
    [repeat, setRepeat] = useState(1440),
    [duties, setDuties] = useState<CoreDuty[]>([]),
    [mode, setMode] = useState("pp"),
    [dirty, setDirty] = useState(false),
    [selected, setSelected] = useState(0),
    [error, setError] = useState(""),
    [refuel, setRefuel] = useState(true),
    [nextRelation, setNextRelation] = useState(s.services[0]?.id ?? "");
  const train = s.trainsets.find((t) => t.id === tid),
    relation = s.services.find((r) => r.id === rid),
    busy = s.runs.some(
      (r) =>
        r.trainsetId === tid &&
        ["running", "held", "stopped"].includes(r.status),
    );
  const make = (
    t: string,
    r: string,
    period = repeat,
    first = Math.ceil(s.minute % 1440) + 5,
  ) => {
    const rel = s.services.find((x) => x.id === r),
      tr = s.trainsets.find((x) => x.id === t);
    if (!rel || !tr) return [];
    return coreFixedRoundTrip(
      s,
      t,
      r,
      tr.location === rel.stations.at(-1),
      first % 1440,
      period,
    );
  };
  const load = (t: string) => {
    const plans = s.plans.filter((p) => p.active && p.trainsetId === t);
    if (plans.length) {
      setRid(plans[0]!.serviceId);
      setRepeat(plans[0]!.cycle);
      setMode(plans.every((p) => p.once) ? "once" : "pp");
      setDuties(
        plans.map((p) => ({
          serviceId: p.serviceId,
          reverse: p.reverse,
          offset: p.offset,
        })),
      );
    } else setDuties(make(t, rid));
    setRefuel(
      s.trainsets.find((x) => x.id === t)?.stationRefuel ?? plans.length === 0,
    );
    setSelected(0);
    setDirty(false);
    setError("");
  };
  useEffect(() => {
    if (tid) load(tid);
  }, []);
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  useEffect(() => {
    if (!tid && s.trainsets.length) {
      setTid(s.trainsets[0]!.id);
      setDuties(make(s.trainsets[0]!.id, rid));
    }
    if (!rid && s.services.length) {
      setRid(s.services[0]!.id);
      setDuties(make(tid, s.services[0]!.id));
    }
  }, [s.services.length, s.trainsets.length, tid, rid]);
  const change = (next: CoreDuty[]) => {
    setDuties(next);
    setDirty(true);
    setError("");
  };
  const update = (index: number, patch: Partial<CoreDuty>) =>
    change(duties.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  const preview = previewCoreDiagram(s, tid, repeat, duties);
  let runs: CoreRun[] = [];
  try {
    if (train && duties.length)
      runs =
        mode === "once"
          ? [
              forecastCore(
                s,
                tid,
                duties[0]!.serviceId,
                duties[0]!.reverse,
                Math.floor(s.minute / 1440) * 1440 +
                  duties[0]!.offset +
                  (duties[0]!.offset < s.minute % 1440 ? 1440 : 0),
              ),
            ]
          : coreDraftScheduleRuns(s, tid, repeat, duties);
  } catch {}
  const current = runs[Math.min(selected, Math.max(0, runs.length - 1))],
    selectedDuty = current
      ? duties.findIndex(
          (d) =>
            d.serviceId === current.serviceId &&
            d.reverse ===
              (current.origin ===
                s.services
                  .find((r) => r.id === d.serviceId)
                  ?.stations.at(-1)) &&
            Math.abs(
              (((current.start % repeat) + repeat) % repeat) - d.offset,
            ) < 0.001,
        )
      : -1;
  const a = duties.findIndex((d) => d.serviceId === rid && !d.reverse),
    b = duties.findIndex((d) => d.serviceId === rid && d.reverse);
  const timeField = (index: number, label: string) =>
    index >= 0 ? (
      <label>
        {label}
        <input
          type="time"
          aria-label={label}
          value={clock(duties[index]!.offset)}
          onChange={(e) => {
            if (e.target.value)
              update(index, {
                offset:
                  Math.floor(duties[index]!.offset / 1440) * 1440 +
                  minutes(e.target.value),
              });
          }}
        />
        {repeat > 1440 && (
          <select
            aria-label={`Hari ${label}`}
            value={Math.floor(duties[index]!.offset / 1440)}
            onChange={(e) =>
              update(index, {
                offset:
                  Number(e.target.value) * 1440 +
                  (duties[index]!.offset % 1440),
              })
            }
          >
            {Array.from({ length: repeat / 1440 }, (_, i) => (
              <option key={i} value={i}>
                Hari pola {i + 1}
              </option>
            ))}
          </select>
        )}
      </label>
    ) : null;
  const ready =
    train && current
      ? coreReadiness(
          s,
          train,
          s.services.find((r) => r.id === current.serviceId)!,
          current.origin ===
            s.services.find((r) => r.id === current.serviceId)!.stations.at(-1),
        )
      : [];
  const patternFuel = runs.reduce((sum, run) => sum + run.fuelLiters, 0),
    dailyFuel = patternFuel / (mode === "once" ? 1 : repeat / 1440);
  const save = () => {
    if (!train || !duties.length) return;
    const ok =
      mode === "once"
        ? act(
            {
              type: "schedule",
              trainsetId: tid,
              serviceId: duties[0]!.serviceId,
              reverse: duties[0]!.reverse,
              cycle: 1440,
              offset: duties[0]!.offset % 1440,
              roundTrip: false,
              replace: true,
              stationRefuel: refuel,
            },
            "Jadwal sekali jalan tersimpan. Pantau keberangkatan di sidebar.",
          )
        : act(
            {
              type: "diagram",
              trainsetId: tid,
              cycle: repeat,
              duties,
              replace: true,
              stationRefuel: refuel,
            },
            "Jadwal tersimpan dan aktif. Lihat tab Rekap harian atau pantau sidebar.",
          );
    if (ok) {
      setDirty(false);
      setError("");
    }
  };
  return (
    <div className="schedule-workspace">
      <ResponsiveColumns>
        <Card title="1 · Kereta & jam berangkat">
          <div className="two-column">
            <label>
              Trainset
              <select
                aria-label="Trainset jadwal"
                value={tid}
                onChange={(e) => {
                  if (dirty) {
                    setError(
                      "Simpan atau batalkan rancangan sebelum berganti kereta.",
                    );
                    return;
                  }
                  setTid(e.target.value);
                  load(e.target.value);
                }}
              >
                <option value="">Pilih trainset</option>
                {s.trainsets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {stationName(t.location)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Relasi
              <select
                aria-label="Relasi jadwal"
                value={rid}
                onChange={(e) => {
                  setRid(e.target.value);
                  change(make(tid, e.target.value));
                  setSelected(0);
                  setMode("pp");
                }}
              >
                <option value="">Buat relasi di tab Relasi</option>
                {s.services.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="two-column">
            <label>
              Pengulangan
              <select
                disabled={mode === "once"}
                aria-label="Ulangi jadwal"
                value={repeat}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setRepeat(n);
                  change(make(tid, rid, n));
                }}
              >
                <option value={1440}>Setiap hari</option>
                <option value={2880}>Setiap 2 hari</option>
                <option value={4320}>Setiap 3 hari</option>
              </select>
            </label>
            <label>
              Perjalanan
              <select
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value);
                  if (e.target.value === "once") setRepeat(1440);
                  change(
                    e.target.value === "once"
                      ? make(tid, rid).slice(0, 1)
                      : make(tid, rid),
                  );
                }}
              >
                <option value="pp">Pergi–pulang berulang</option>
                <option value="once">Sekali jalan</option>
              </select>
            </label>
          </div>
          <div className="two-column">
            {timeField(
              a,
              relation
                ? `A → B · ${stationName(relation.stations[0]!)}`
                : "Berangkat A → B",
            )}
            {timeField(
              b,
              relation
                ? `B → A · ${stationName(relation.stations.at(-1)!)}`
                : "Berangkat B → A",
            )}
          </div>
          <p className="muted">
            Relasi berlaku dua arah. Jeda terminal minimal 60 menit. Tanggal
            rekap menandai perjalanan lintas tengah malam.
          </p>
          {mode !== "once" && (
            <button
              disabled={!train || !relation}
              onClick={() => {
                try {
                  change(
                    coreAutomaticRoundTrips(
                      s,
                      tid,
                      rid,
                      train!.location === relation!.stations.at(-1),
                      duties.find(
                        (d) =>
                          d.serviceId === rid &&
                          d.reverse ===
                            (train!.location === relation!.stations.at(-1)),
                      )?.offset ?? 480,
                      repeat,
                    ),
                  );
                  setSelected(0);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Isi otomatis sebanyak mungkin PP
            </button>
          )}
          {mode !== "once" && (
            <details className="schedule-advanced">
              <summary>Lanjutan · gunakan beberapa relasi</summary>
              <label>
                Relasi berikut
                <select
                  value={nextRelation}
                  onChange={(e) => setNextRelation(e.target.value)}
                >
                  {s.services.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => {
                  try {
                    const last = runs.at(-1),
                      r = s.services.find((r) => r.id === nextRelation);
                    if (
                      !last ||
                      !r ||
                      ![r.stations[0], r.stations.at(-1)].includes(
                        last.destination,
                      )
                    )
                      throw new Error(
                        "Relasi berikut harus dimulai dari stasiun tujuan perjalanan terakhir.",
                      );
                    change([
                      ...duties,
                      ...coreFixedRoundTrip(
                        s,
                        tid,
                        r.id,
                        last.destination === r.stations.at(-1),
                        Math.ceil(last.end + 60) % repeat,
                        repeat,
                      ),
                    ]);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Tambahkan PP lanjutan
              </button>
              <p className="muted">
                Satu trainset dapat melayani beberapa relasi. Perjalanan berikut
                harus tersambung secara lokasi dan memiliki jeda yang cukup.
              </p>
            </details>
          )}
          <p>
            {duties.length} keberangkatan / {repeat / 1440} hari ·{" "}
            {mode === "once"
              ? "satu kali"
              : `${Math.floor(duties.length / 2)} PP`}
            .
          </p>
          <label className="stop-choice">
            <input
              type="checkbox"
              checked={refuel}
              onChange={(e) => {
                setRefuel(e.target.checked);
                setDirty(true);
              }}
            />
            Beli fuel otomatis saat perlu di fasilitas stasiun
          </label>
          <small className="muted">
            Stok depo dipakai dahulu; pemasok hanya di stasiun besar, dibayar
            dengan kas.
          </small>
        </Card>
        <Card title="2 · Timetable & pemberhentian">
          <label className="trip-selector">
            Perjalanan ({runs.length})
            <select
              aria-label="Pilih perjalanan timetable"
              value={Math.min(selected, Math.max(0, runs.length - 1))}
              onChange={(e) => setSelected(Number(e.target.value))}
            >
              {runs.map((run, index) => (
                <option key={`${run.serviceId}:${run.start}`} value={index}>
                  {index + 1}. {clock(run.start)} → {clock(run.end)} ·{" "}
                  {stationName(run.origin)} – {stationName(run.destination)}
                </option>
              ))}
            </select>
          </label>
          {current && selectedDuty >= 0 && (
            <div className="trip-adjustment">
              {timeField(selectedDuty, "Jam berangkat perjalanan")}
              <label>
                Relasi perjalanan
                <select
                  value={duties[selectedDuty]!.serviceId}
                  onChange={(e) =>
                    update(selectedDuty, { serviceId: e.target.value })
                  }
                >
                  {s.services.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {current && (
            <CompactStopSheet
              key={`${current.serviceId}:${current.start}`}
              run={current}
            />
          )}
        </Card>
      </ResponsiveColumns>
      <div
        className="schedule-fuel-summary"
        role="status"
        aria-label="Estimasi fuel harian"
      >
        <span>Estimasi fuel</span>
        <b>
          {Math.ceil(dailyFuel).toLocaleString("id-ID")} L /{" "}
          {mode === "once" ? "perjalanan" : "hari"}
        </b>
        <small>
          {repeat > 1440 && mode !== "once"
            ? `Rata-rata ${repeat / 1440} hari · total ${Math.ceil(patternFuel).toLocaleString("id-ID")} L`
            : "Semua keberangkatan pergi & balik"}
        </small>
      </div>
      <div className="schedule-save">
        <div>
          <b>
            {dirty
              ? "Rancangan belum disimpan"
              : s.plans.some((p) => p.active && p.trainsetId === tid)
                ? "Jadwal tersimpan tidak berubah"
                : "Belum ada jadwal aktif · simpan rancangan ini"}
          </b>
          <small>
            {error ||
              (mode !== "once" ? preview.issues[0] : "") ||
              (busy
                ? "Kereta sedang berjalan/tertahan. Selesaikan atau pulihkan perjalanan sebelum mengganti jadwal."
                : ready[0] || "Tinjau rekap, lalu tekan Simpan & aktifkan.")}
          </small>
        </div>
        <button onClick={() => load(tid)}>Batalkan perubahan</button>
        <button
          className="primary"
          disabled={
            !train ||
            !relation ||
            busy ||
            !duties.length ||
            (mode !== "once" && preview.issues.length > 0)
          }
          onClick={save}
        >
          Simpan & aktifkan jadwal
        </button>
      </div>
    </div>
  );
}
