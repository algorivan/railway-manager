import { useEffect, useRef, useState } from "react";
import {
  coreFixedRoundTrip,
  coreDraftScheduleRuns,
  coreRunStationTimes,
  coreDailySchedule,
  coreReadiness,
  forecastCore,
  previewCoreDiagram,
  coreDutyTurnaround,
  stationName,
  type CoreDuty,
  type CoreRun,
  type CoreState,
} from "@railway/simulation";
import { Card, clock, when, type Act } from "./presentation";
import { TimetableEditor } from "./TimetableEditor";

export function SchedulePlanner({
  state: s,
  act,
}: {
  state: CoreState;
  act: Act;
}) {
  const [tid, setTid] = useState(s.trainsets[0]?.id ?? ""),
    [rid, setRid] = useState(s.services[0]?.id ?? "");
  const [mode, setMode] = useState("pp"),
    [repeat, setRepeat] = useState(1440),
    [departure, setDeparture] = useState(480);
  const [duties, setDuties] = useState<CoreDuty[]>([]),
    [automatic, setAutomatic] = useState(true);
  const [day, setDay] = useState(Math.floor(s.minute / 1440));
  const planner = useRef<HTMLDivElement>(null);
  const train = s.trainsets.find((t) => t.id === tid),
    relation = s.services.find((r) => r.id === rid);
  const reverse = !!relation && train?.location === relation.stations.at(-1);
  useEffect(() => {
    if (!tid && s.trainsets.length) setTid(s.trainsets[0]!.id);
    if (!rid && s.services.length) setRid(s.services[0]!.id);
  }, [s.trainsets.length, s.services.length, tid, rid]);
  useEffect(() => {
    if (automatic && tid && rid && mode === "pp")
      setDuties(coreFixedRoundTrip(s, tid, rid, reverse, departure, repeat));
  }, [tid, rid, mode, repeat, automatic]);
  const setAutoPP = () => {
    if (train && relation) {
      setDuties(coreFixedRoundTrip(s, tid, rid, reverse, departure, repeat));
      setAutomatic(false);
    }
  };
  const preview = previewCoreDiagram(s, tid, repeat, duties);
  const draftRuns =
    mode === "once" && train && relation
      ? [
          forecastCore(
            s,
            tid,
            rid,
            reverse,
            Math.floor(s.minute / 1440) * 1440 +
              departure +
              (departure < s.minute % 1440 ? 1440 : 0),
          ),
        ]
      : train && duties.length
        ? coreDraftScheduleRuns(s, tid, repeat, duties)
        : [];
  const active = s.plans.filter((p) => p.active && p.trainsetId === tid);
  const busy = s.runs.some(
    (r) =>
      r.trainsetId === tid && ["running", "held", "stopped"].includes(r.status),
  );
  const load = (trainsetId: string) => {
    const plans = s.plans.filter(
      (p) => p.active && p.trainsetId === trainsetId,
    );
    if (!plans.length) return;
    setAutomatic(false);
    setTid(trainsetId);
    setRid(plans[0]!.serviceId);
    setRepeat(plans[0]!.cycle);
    setMode(plans.every((p) => p.once) ? "once" : "manual");
    setDeparture(plans[0]!.offset % 1440);
    setDuties(
      plans.map((p) => ({
        serviceId: p.serviceId,
        reverse: p.reverse,
        offset: p.offset,
      })),
    );
    requestAnimationFrame(() =>
      planner.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };
  const add = () => {
    if (!train || !relation) return;
    const last = draftRuns.at(-1);
    const chosen =
      last &&
      ![relation.stations[0], relation.stations.at(-1)].includes(
        last.destination,
      )
        ? s.services.find((r) => r.id === last.serviceId)!
        : relation;
    const back = last ? chosen.stations.at(-1) === last.destination : reverse;
    const next = forecastCore(s, tid, chosen.id, back, 0);
    const offset = last
      ? Math.ceil(last.end + coreDutyTurnaround(last, next)) % repeat
      : departure;
    setAutomatic(false);
    setDuties([...duties, { serviceId: chosen.id, reverse: back, offset }]);
  };
  const readiness =
    train && draftRuns.length
      ? coreReadiness(
          s,
          train,
          s.services.find((r) => r.id === draftRuns[0]!.serviceId)!,
          draftRuns[0]!.origin ===
            s.services
              .find((r) => r.id === draftRuns[0]!.serviceId)!
              .stations.at(-1),
        )
      : [];
  const daily = coreDailySchedule(s, day);
  return (
    <>
      <div ref={planner}>
        <Card title="Buat atau ubah jadwal">
          <p>
            1. Pilih kereta dan relasi. 2. Atur jam. 3. Tinjau pemberhentian,
            lalu simpan. Semua penjadwalan dilakukan di sini.
          </p>
          {!s.trainsets.length && (
            <p className="warning-text">
              Buat trainset di Armada terlebih dahulu, lalu kembali ke Jadwal.
            </p>
          )}
          {!s.services.length && (
            <p className="warning-text">
              Tekan Buat relasi di atas untuk menentukan tujuan dan stasiun
              pemberhentian.
            </p>
          )}
          <label>
            Trainset
            <select
              aria-label="Trainset jadwal"
              value={tid}
              onChange={(e) => {
                setTid(e.target.value);
                setAutomatic(true);
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
                setAutomatic(true);
              }}
            >
              <option value="">Pilih relasi</option>
              {s.services.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          {active.length > 0 && (
            <button onClick={() => load(tid)}>
              Muat jadwal tersimpan untuk diedit
            </button>
          )}
          <label>
            Jenis jadwal
            <select
              aria-label="Jenis jadwal"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                setAutomatic(true);
                if (e.target.value === "manual") setDuties([]);
              }}
            >
              <option value="pp">PP otomatis pada jam tetap</option>
              <option value="manual">Susun sendiri / beberapa relasi</option>
              <option value="once">Sekali jalan</option>
            </select>
          </label>
          {mode !== "once" && (
            <label>
              Ulangi jadwal
              <select
                aria-label="Ulangi jadwal"
                value={repeat}
                onChange={(e) => setRepeat(Number(e.target.value))}
              >
                <option value={1440}>Setiap hari</option>
                <option value={2880}>Setiap 2 hari</option>
                <option value={4320}>Setiap 3 hari</option>
              </select>
            </label>
          )}
          <p className="muted">
            {mode === "once"
              ? "Berangkat satu kali dari lokasi kereta saat ini. Setelah tiba, kereta menunggu jadwal berikutnya."
              : `Jam yang Anda atur akan diulang ${repeat === 1440 ? "setiap hari" : `setiap ${repeat / 1440} hari`} dalam waktu game. Contoh: pergi pukul 08:00 hari ini, lalu pukul 08:00 lagi ${repeat === 1440 ? "besok" : `${repeat / 1440} hari kemudian`}. Jadwal tetap diproses saat aplikasi ditutup.`}
          </p>
          {mode !== "manual" && (
            <label>
              Jam berangkat{" "}
              {relation && train ? `dari ${stationName(train.location)}` : ""}
              <input
                aria-label="Jam berangkat tetap"
                type="time"
                value={clock(departure)}
                onChange={(e) => {
                  if (e.target.value) {
                    const [h, m] = e.target.value.split(":").map(Number);
                    setDeparture(h! * 60 + m!);
                    setAutomatic(false);
                    if (mode === "pp" && train && relation)
                      setDuties(
                        coreFixedRoundTrip(
                          s,
                          tid,
                          rid,
                          reverse,
                          h! * 60 + m!,
                          repeat,
                        ),
                      );
                  }
                }}
              />
            </label>
          )}
          {mode === "pp" && (
            <>
              <p>
                Jam pulang dihitung dari estimasi tiba + 60 menit persiapan.
                Anda dapat memindahkan kedua blok atau mengubah jamnya di
                timetable.
              </p>
              <button disabled={!train || !relation} onClick={setAutoPP}>
                Susun ulang PP otomatis
              </button>
            </>
          )}
          {mode !== "once" && train && (
            <>
              <button disabled={!relation || duties.length >= 24} onClick={add}>
                Tambah perjalanan berikutnya
              </button>
              <TimetableEditor
                state={s}
                trainsetId={tid}
                cycle={repeat}
                duties={duties}
                onChange={(next) => {
                  setAutomatic(false);
                  setDuties(next);
                }}
              />
            </>
          )}
          {mode === "once" && draftRuns[0] && (
            <p>
              Keberangkatan pertama: {when(draftRuns[0].start)} · estimasi tiba{" "}
              {when(draftRuns[0].end)}.
            </p>
          )}
          {readiness.length > 0 && (
            <div className="readiness warning">
              <div>
                <b>Periksa sebelum keberangkatan</b>
                {readiness.map((reason) => (
                  <p key={reason}>{reason}</p>
                ))}
              </div>
            </div>
          )}
          {busy && (
            <p className="warning-text">
              Jadwal bisa ditinjau, tetapi tunggu perjalanan aktif selesai atau
              dipulihkan sebelum menyimpan perubahan.
            </p>
          )}
          <button
            className="primary"
            disabled={
              !train ||
              !relation ||
              busy ||
              (mode !== "once" && preview.issues.length > 0)
            }
            onClick={() =>
              act(
                mode === "once"
                  ? {
                      type: "schedule",
                      trainsetId: tid,
                      serviceId: rid,
                      reverse,
                      roundTrip: false,
                      cycle: 1440,
                      offset: departure,
                      replace: true,
                    }
                  : {
                      type: "diagram",
                      trainsetId: tid,
                      cycle: repeat,
                      duties,
                      replace: true,
                    },
                "Jadwal disimpan. Keberangkatan mengikuti jam yang Anda tentukan.",
              )
            }
          >
            Simpan {active.length ? "perubahan " : ""}jadwal
          </button>
          <p className="muted">
            Menyimpan mengganti jadwal trainset ini setelah validasi. Kereta
            tetap harus siap, berada di stasiun yang benar, dan mendapat lintas
            bebas saat berangkat.
          </p>
          {!!draftRuns.length && (
            <>
              <h3>Rekap rancangan perjalanan</h3>
              {draftRuns.map((run, i) => (
                <StopSheet key={i} run={run} trainName={train?.name ?? ""} />
              ))}
            </>
          )}
        </Card>
      </div>
      <Card title="Jadwal tersimpan">
        {s.trainsets
          .filter((t) => s.plans.some((p) => p.active && p.trainsetId === t.id))
          .map((t) => (
            <div className="list-row" key={t.id}>
              <div>
                <b>{t.name}</b>
                <small>
                  {
                    s.plans.filter((p) => p.active && p.trainsetId === t.id)
                      .length
                  }{" "}
                  perjalanan terjadwal
                </small>
              </div>
              <button onClick={() => load(t.id)}>Edit timetable</button>
              <button
                onClick={() =>
                  act(
                    { type: "disableDiagram", trainsetId: t.id },
                    "Jadwal dijeda.",
                  )
                }
              >
                Jeda jadwal
              </button>
            </div>
          ))}
        {!s.plans.some((p) => p.active) && (
          <p>Belum ada jadwal tersimpan yang aktif.</p>
        )}
      </Card>
      <Card title="Rekap jadwal harian">
        <label>
          Hari operasi
          <select
            aria-label="Hari rekap jadwal"
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
          >
            {Array.from(
              { length: 4 },
              (_, i) => Math.floor(s.minute / 1440) + i,
            ).map((d) => (
              <option key={d} value={d}>
                Hari {d + 1}
                {d === Math.floor(s.minute / 1440) ? " · hari ini" : ""}
              </option>
            ))}
          </select>
        </label>
        <p className="muted">
          Jadwal rencana semua trainset, termasuk perjalanan dari hari
          sebelumnya yang tiba pada hari ini. Waktu adalah waktu game; kondisi
          lintas dapat mengubah waktu aktual.
        </p>
        {daily.map((run, i) => (
          <StopSheet
            key={`${run.planId}:${i}`}
            run={run}
            trainName={
              s.trainsets.find((t) => t.id === run.trainsetId)?.name ?? ""
            }
          />
        ))}
        {!daily.length && <p>Tidak ada perjalanan terjadwal pada hari ini.</p>}
      </Card>
    </>
  );
}
function StopSheet({ run, trainName }: { run: CoreRun; trainName: string }) {
  return (
    <div className="stop-sheet">
      <b>
        {trainName} · {stationName(run.origin)} → {stationName(run.destination)}
      </b>
      <small>
        {when(run.start)} → {when(Math.ceil(run.end))}
      </small>
      <table
        aria-label={`Pemberhentian ${stationName(run.origin)} ke ${stationName(run.destination)}`}
      >
        <thead>
          <tr>
            <th>Tujuan</th>
            <th>Tiba</th>
            <th>Berangkat</th>
          </tr>
        </thead>
        <tbody>
          {coreRunStationTimes(run).map((row, i) => (
            <tr key={i}>
              <td>{stationName(row.stationId)}</td>
              <td>
                {row.arrival === null ? "—" : when(Math.ceil(row.arrival))}
              </td>
              <td>
                {row.departure === null ? "—" : when(Math.ceil(row.departure))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
