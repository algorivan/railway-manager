import { useState } from "react";
import { Plus, ArrowRight, ShieldCheck, Play, X } from "lucide-react";
import {
  CORE_FARES,
  JAVA_STATION_CATALOG as stations,
  JAVA_TRACK_CORRIDOR_SEGMENTS as tracks,
  type CoreClass,
} from "@railway/game-data";
import {
  findCorePath,
  coreFormation,
  coreReadiness,
  previewCoreRoundTrip,
  forecastCore,
  stationName,
  type CoreState,
} from "@railway/simulation";
import { Card, clock, when, money, compact, type Act } from "./presentation";
import { RunReport } from "./RunReport";

export function Schedules({ state: s, act }: { state: CoreState; act: Act }) {
  const [wizard, setWizard] = useState(false),
    [stage, setStage] = useState(1);
  const [name, setName] = useState("Layanan pertama"),
    [origin, setOrigin] = useState(s.hub);
  const defaultDest = tracks.find(
    (e) => e.originStationId === s.hub || e.destinationStationId === s.hub,
  );
  const [dest, setDest] = useState(
    defaultDest
      ? defaultDest.originStationId === s.hub
        ? defaultDest.destinationStationId
        : defaultDest.originStationId
      : stations[0]!.id,
  );
  const [skippedStops, setSkippedStops] = useState<string[]>([]);
  const [category, setCategory] = useState("Custom");
  const [tid, setTid] = useState(s.trainsets[0]?.id ?? ""),
    [rid, setRid] = useState(s.services[0]?.id ?? "");
  const [cycle, setCycle] = useState(1440),
    [offset, setOffset] = useState(Math.ceil(s.minute + 2) % 1440);
  const [showPreview, setShowPreview] = useState(false),
    [graph, setGraph] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [duties, setDuties] = useState<
    { serviceId: string; reverse: boolean; offset: number }[]
  >([]);
  let path: ReturnType<typeof findCorePath> | undefined,
    pathError = "";
  try {
    path = findCorePath(origin, dest, s.access);
  } catch (e) {
    pathError = (e as Error).message;
  }
  const commercialStops =
    path?.stations.filter((id) => !skippedStops.includes(id)) ?? [];
  const selectedT = s.trainsets.find((t) => t.id === tid),
    selectedR = s.services.find((r) => r.id === rid);
  const preview =
    selectedT && selectedR ? previewCoreRoundTrip(s, tid, rid) : undefined;
  const readiness =
    selectedT && selectedR ? coreReadiness(s, selectedT, selectedR) : [];
  return (
    <div className="panel-scroll">
      <div className="toolbar">
        <button
          className="primary"
          onClick={() => {
            setWizard(!wizard);
            setStage(1);
          }}
        >
          <Plus size={15} /> Buat relasi
        </button>
        <button onClick={() => setGraph(!graph)}>
          {graph ? "Daftar" : "Grafik"}
        </button>
      </div>
      {wizard && (
        <Card title={`Relasi baru · ${stage}/3`}>
          <div className="wizard-steps">
            {["Lintas", "Layanan", "Tinjauan"].map((x, i) => (
              <span className={stage === i + 1 ? "active" : ""} key={x}>
                {i + 1}. {x}
              </span>
            ))}
          </div>
          {stage === 1 && (
            <>
              <label>
                Stasiun awal
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                >
                  {stations.map((st) => (
                    <option key={st.id} value={st.id}>
                      {stationName(st.id)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Stasiun akhir
                <select value={dest} onChange={(e) => setDest(e.target.value)}>
                  {stations.map((st) => (
                    <option key={st.id} value={st.id}>
                      {stationName(st.id)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Kategori
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {["Capital", "Domestic", "Local", "Custom"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <p className={pathError ? "warning-text" : "muted"}>
                {pathError || path?.stations.map(stationName).join(" → ")}
              </p>
              {path?.stations.slice(1, -1).map((id) => (
                <label className="stop-choice" key={id}>
                  <input
                    type="checkbox"
                    checked={!skippedStops.includes(id)}
                    onChange={(e) =>
                      setSkippedStops(
                        e.target.checked
                          ? skippedStops.filter((x) => x !== id)
                          : [...skippedStops, id],
                      )
                    }
                  />
                  Berhenti komersial di {stationName(id)}
                </label>
              ))}
              <p className="muted">
                Preset Capital/Domestic belum memiliki klasifikasi stasiun
                tervalidasi. Tinjau pemberhentian secara manual. Local
                memvalidasi provinsi sepanjang path.
              </p>
            </>
          )}
          {stage === 2 && (
            <>
              <label>
                Nama layanan
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <p className="muted">
                Relasi milik perusahaan, dapat ditugaskan ke trainset lain.
                Katalog saat ini memakai simpul koridor besar. Pilih
                pemberhentian komersial pada tahap lintas; simpul lain tetap
                dilalui tanpa dwell atau penjualan tiket.
              </p>
            </>
          )}
          {stage === 3 && (
            <>
              <h2>{name}</h2>
              <p>{path?.stations.map(stationName).join(" → ")}</p>
              <p className="muted">
                Draft dan pembukaan relasi gratis. TAC dibayar untuk setiap
                perjalanan, setelah penugasan aktif. Tarif otomatis memakai
                harga referensi; estimasi ditampilkan setelah trainset dipilih.
              </p>
            </>
          )}
          <div className="toolbar">
            {stage > 1 && (
              <button onClick={() => setStage(stage - 1)}>Kembali</button>
            )}
            {stage < 3 ? (
              <button
                className="primary"
                disabled={!!pathError}
                onClick={() => setStage(stage + 1)}
              >
                Lanjut <ArrowRight size={14} />
              </button>
            ) : (
              <button
                className="primary"
                onClick={() => {
                  if (
                    act(
                      {
                        type: "service",
                        name,
                        origin,
                        destination: dest,
                        category,
                        stops: commercialStops,
                      },
                      "Relasi dibuat. Pilih relasi ini untuk penugasan.",
                    )
                  )
                    setWizard(false);
                }}
              >
                Simpan relasi
              </button>
            )}
          </div>
        </Card>
      )}
      {!s.services.length && !wizard && (
        <Card title="Buat relasi pertama">
          <p>
            Relasi adalah layanan perusahaan. Trainset mempertahankan
            identitasnya saat nama KA berubah.
          </p>
          <button
            onClick={() => {
              setWizard(true);
              setStage(1);
            }}
          >
            Buat relasi pertama
          </button>
        </Card>
      )}
      {!!s.services.length && (
        <Card title="Penugasan & forecast">
          <label>
            Trainset
            <select value={tid} onChange={(e) => setTid(e.target.value)}>
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
            <select value={rid} onChange={(e) => setRid(e.target.value)}>
              <option value="">Pilih relasi</option>
              {s.services.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          {selectedR && (
            <>
              {(["LX", "EX", "EC"] as CoreClass[])
                .filter(
                  (c) => !selectedT || coreFormation(s, selectedT).seats[c] > 0,
                )
                .map((c) => (
                  <div className="fare-row" key={c}>
                    <b>{c}</b>
                    <button
                      aria-label={`Turunkan tarif ${c}`}
                      onClick={() =>
                        act({
                          type: "fare",
                          serviceId: rid,
                          cls: c,
                          multiplier: Math.max(0.5, selectedR.fares[c] - 0.05),
                          auto: false,
                        })
                      }
                    >
                      −
                    </button>
                    <input
                      aria-label={`Tarif ${c} persen`}
                      type="number"
                      min="50"
                      max="200"
                      key={`${c}:${selectedR.fares[c]}`}
                      defaultValue={Math.round(selectedR.fares[c] * 100)}
                      onBlur={(e) =>
                        act({
                          type: "fare",
                          serviceId: rid,
                          cls: c,
                          multiplier: Number(e.target.value) / 100,
                          auto: false,
                        })
                      }
                    />
                    <span>%</span>
                    <button
                      aria-label={`Naikkan tarif ${c}`}
                      onClick={() =>
                        act({
                          type: "fare",
                          serviceId: rid,
                          cls: c,
                          multiplier: Math.min(2, selectedR.fares[c] + 0.05),
                          auto: false,
                        })
                      }
                    >
                      +
                    </button>
                    <button
                      onClick={() =>
                        act({
                          type: "fare",
                          serviceId: rid,
                          cls: c,
                          multiplier: 1,
                          auto: true,
                        })
                      }
                    >
                      Auto
                    </button>
                  </div>
                ))}
              <details>
                <summary>Tarif antarstasiun · referensi OD</summary>
                {selectedR.stations.flatMap((from, i) =>
                  selectedR.stations.slice(i + 1).map((to) => {
                    const j = selectedR.stations.indexOf(to),
                      km = selectedR.segments
                        .slice(i, j)
                        .reduce(
                          (v, id) =>
                            v + tracks.find((t) => t.id === id)!.distanceKm,
                          0,
                        );
                    return (
                      <p className="muted" key={`${from}:${to}`}>
                        {stationName(from)} → {stationName(to)} · EC{" "}
                        {money(
                          (CORE_FARES.EC.boarding + CORE_FARES.EC.perKm * km) *
                            selectedR.fares.EC,
                        )}
                      </p>
                    );
                  }),
                )}
              </details>
            </>
          )}
          {preview && (
            <>
              <div className="stats">
                <div>
                  <strong>
                    {Math.round(
                      (preview.outbound.passengerKm /
                        Math.max(1, preview.outbound.seatKm)) *
                        100,
                    )}
                    %
                  </strong>
                  <small>LF pergi estimasi</small>
                </div>
                <div>
                  <strong>
                    {Math.round(
                      preview.outbound.fuelLiters + preview.inbound.fuelLiters,
                    )}{" "}
                    L
                  </strong>
                  <small>Fuel satu PP</small>
                </div>
                <div>
                  <strong>{compact(preview.contribution)}</strong>
                  <small>Kontribusi PP</small>
                </div>
              </div>
              <div className={`readiness ${readiness.length ? "warning" : ""}`}>
                <ShieldCheck size={16} />
                <div>
                  <b>
                    {readiness.length
                      ? "Kesiapan perlu tindakan"
                      : "Siap untuk dinas pertama"}
                  </b>
                  {readiness.map((reason) => (
                    <p key={reason}>{reason}</p>
                  ))}
                </div>
              </div>
              <button onClick={() => setShowPreview(!showPreview)}>
                <Play size={14} /> Preview satu PP · tanpa mengubah perusahaan
              </button>
              {showPreview && (
                <>
                  <RunReport
                    run={{ ...preview.outbound, status: "completed" }}
                    state={s}
                  />
                  <RunReport
                    run={{ ...preview.inbound, status: "completed" }}
                    state={s}
                  />
                  <p className="muted">
                    Forecast, bukan settlement. Tidak ada debit, hadiah,
                    pemakaian fuel, atau perubahan clock.
                  </p>
                </>
              )}
            </>
          )}
          <label>
            Siklus diagram
            <select
              value={cycle}
              onChange={(e) => setCycle(Number(e.target.value))}
            >
              <option value={1440}>24 jam</option>
              <option value={2880}>48 jam</option>
              <option value={4320}>72 jam</option>
            </select>
          </label>
          <div className="field-pair">
            <label>
              Hari dalam siklus
              <select
                value={Math.floor(offset / 1440)}
                onChange={(e) =>
                  setOffset(Number(e.target.value) * 1440 + (offset % 1440))
                }
              >
                {Array.from({ length: cycle / 1440 }, (_, i) => (
                  <option value={i} key={i}>
                    Hari {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Berangkat
              <input
                type="time"
                value={clock(offset)}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(":").map(Number);
                  setOffset(Math.floor(offset / 1440) * 1440 + h! * 60 + m!);
                }}
              />
            </label>
          </div>
          <button onClick={() => setOffset(Math.ceil(s.minute + 2) % cycle)}>
            Slot terdekat +2 menit game
          </button>
          <p className="muted">
            PP otomatis, jeda terminus 60 menit. Jadwal berikutnya tidak dapat
            melompati lokasi. Diagram tetap berjalan saat aplikasi ditutup.
          </p>
          <button
            className="primary"
            disabled={!selectedT || !selectedR}
            onClick={() =>
              act(
                {
                  type: "schedule",
                  trainsetId: tid,
                  serviceId: rid,
                  cycle,
                  offset,
                  roundTrip: true,
                },
                "Diagram diaktifkan. Departure otomatis setelah readiness lolos.",
              )
            }
          >
            Aktifkan diagram PP
          </button>
        </Card>
      )}
      {!!s.services.length && (
        <Card title="Diagram multi-relasi">
          <p className="muted">
            Satu identitas trainset dapat melayani beberapa nama KA. Akhir tiap
            dinas harus sama dengan awal berikutnya, termasuk batas siklus.
            Pergantian relasi memerlukan fasilitas service dan jeda 30 menit; PP
            60 menit.
          </p>
          <button onClick={() => setAdvanced(!advanced)}>
            {advanced ? "Tutup editor chain" : "Susun chain lanjutan"}
          </button>
          {advanced && (
            <>
              <p>
                Editor memakai pilihan trainset, relasi, siklus dan hari/jam
                pada penugasan di atas.
              </p>
              <button
                disabled={!rid}
                onClick={() =>
                  setDuties([
                    ...duties,
                    { serviceId: rid, reverse: false, offset },
                  ])
                }
              >
                Tambah dinas pergi pada {when(offset)}
              </button>
              <button
                disabled={!rid}
                onClick={() =>
                  setDuties([
                    ...duties,
                    { serviceId: rid, reverse: true, offset },
                  ])
                }
              >
                Tambah dinas balik pada {when(offset)}
              </button>
              {duties.map((d, i) => (
                <div className="list-row" key={i}>
                  <div>
                    <b>
                      {s.services.find((r) => r.id === d.serviceId)?.name}{" "}
                      {d.reverse ? "←" : "→"}
                    </b>
                    <small>{when(d.offset)}</small>
                  </div>
                  <button
                    aria-label={`Hapus dinas ${i + 1}`}
                    onClick={() =>
                      setDuties(duties.filter((_, index) => index !== i))
                    }
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                className="primary"
                disabled={!tid || duties.length < 2}
                onClick={() =>
                  act(
                    { type: "diagram", trainsetId: tid, cycle, duties },
                    "Diagram multi-relasi diaktifkan.",
                  )
                }
              >
                Validasi & aktifkan chain
              </button>
            </>
          )}
        </Card>
      )}
      <Card title="Diagram aktif">
        {s.plans
          .filter((p) => p.active)
          .map((p) => (
            <div className="list-row" key={p.id}>
              <div>
                <b>
                  {s.services.find((r) => r.id === p.serviceId)?.name}{" "}
                  {p.reverse ? "← balik" : "→ pergi"}
                </b>
                <small>
                  {when(p.nextAt)} · siklus {p.cycle / 60} jam
                </small>
              </div>
              <button
                onClick={() =>
                  act({ type: "disableDiagram", trainsetId: p.trainsetId })
                }
              >
                Jeda diagram
              </button>
            </div>
          ))}
        {!s.plans.some((p) => p.active) && (
          <p className="muted">Belum ada diagram aktif.</p>
        )}
        {graph && <TimetableGraph state={s} />}
      </Card>
      <Card title="Hasil operasi">
        {s.runs
          .slice(-8)
          .reverse()
          .map((r) => (
            <div key={r.id}>
              <b>{r.name}</b>
              {r.status === "held" || r.status === "stopped" ? (
                <div className="readiness warning">
                  <p>{r.reason}</p>
                  <button onClick={() => act({ type: "resume", runId: r.id })}>
                    Konfirmasi lanjutkan
                  </button>
                </div>
              ) : (
                <RunReport run={r} state={s} />
              )}
            </div>
          ))}
        {!s.runs.length && (
          <p className="muted">
            Hasil dan LF kursi-km akan muncul setelah dinas dimulai.
          </p>
        )}
      </Card>
    </div>
  );
}

function TimetableGraph({ state: s }: { state: CoreState }) {
  const [day, setDay] = useState(0);
  const visible = s.plans.filter((p) => p.active);
  const base = Math.floor(s.minute / 1440) * 1440 + day * 1440;
  return (
    <div className="diagram">
      <label>
        Viewport
        <select value={day} onChange={(e) => setDay(Number(e.target.value))}>
          {[0, 1, 2].map((d) => (
            <option key={d} value={d}>
              Hari {Math.floor(base / 1440) + 1 - day + d}
            </option>
          ))}
        </select>
      </label>
      <svg
        viewBox="0 0 400 200"
        role="img"
        aria-label="Grafik waktu dan jarak diagram dinas"
      >
        <text x="8" y="15">
          Jarak relatif
        </text>
        {[0, 6, 12, 18, 24].map((h) => (
          <g key={h}>
            <line
              x1={30 + (h / 24) * 350}
              x2={30 + (h / 24) * 350}
              y1="25"
              y2="170"
              stroke="#cbd5e1"
            />
            <text x={25 + (h / 24) * 350} y="188">
              {h}:00
            </text>
          </g>
        ))}
        {visible.map((p) => {
          const r = forecastCore(s, p.trainsetId, p.serviceId, p.reverse);
          const duration = r.end - r.start;
          let start = p.nextAt;
          while (start < base) start += p.cycle;
          if (start > base + 1440) return null;
          return (
            <g key={p.id}>
              <line
                x1={30 + ((start - base) / 1440) * 350}
                x2={30 + ((start - base + duration) / 1440) * 350}
                y1={p.reverse ? 150 : 40}
                y2={p.reverse ? 40 : 150}
                stroke="#ea580c"
                strokeWidth="3"
              />
              <title>
                {r.name} · {when(start)}
              </title>
            </g>
          );
        })}
      </svg>
      <p className="muted">
        Skema per relasi; persilangan garis belum membuktikan konflik blok.
      </p>
    </div>
  );
}
