import { useState } from "react";
import {
  Plus,
  ArrowRight,
  ArrowLeft,
  X,
  ChevronUp,
  ChevronDown,
  Fuel,
  TrainFront,
  CalendarDays,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { CORE_SELECTABLE_STATIONS as stations } from "@railway/game-data";
import {
  coreProduct,
  coreFormation,
  stationName,
  type CoreState,
  type CoreTrainset,
} from "@railway/simulation";
import { Asset, Card, remaining, type Act, type Screen } from "./presentation";
import { RunReport } from "./RunReport";
import { Depot } from "./Depot";

export function Fleet({
  state: s,
  act,
  go,
  view,
  setView,
}: {
  state: CoreState;
  act: Act;
  go: (screen: Screen) => void;
  view: "operations" | "depot";
  setView: (view: "operations" | "depot") => void;
}) {
  const [tab, setTab] = useState("parked");
  const [selected, setSelected] = useState<string>();
  const [editing, setEditing] = useState(false);
  const status = (t: CoreTrainset) =>
    s.runs.some((r) => r.trainsetId === t.id && r.status === "running")
      ? "travel"
      : t.units.some((id) => s.units.find((u) => u.id === id)?.job)
        ? "pending"
        : t.parked
          ? "parked"
          : "idle";
  const t = s.trainsets.find((x) => x.id === selected);
  const tabs = [
    { id: "travel", label: "Dalam perjalanan" },
    { id: "idle", label: "Idle di stasiun" },
    { id: "parked", label: "Parked di dipo" },
    { id: "pending", label: "Pending" },
  ];
  return (
    <>
      <div className="fleet-views" aria-label="Tampilan armada">
        <button
          className={view === "operations" ? "active" : ""}
          onClick={() => setView("operations")}
        >
          Trainset & dinas
        </button>
        <button
          className={view === "depot" ? "active" : ""}
          onClick={() => setView("depot")}
        >
          Inventori & depo
        </button>
      </div>
      {view === "depot" ? (
        <Depot state={s} act={act} />
      ) : (
        <>
          <div className="panel-scroll">
            <div className="toolbar">
              <button
                className="primary"
                onClick={() => {
                  setSelected(undefined);
                  setEditing(!editing);
                }}
              >
                <Plus size={15} /> Buat trainset
              </button>
              <button onClick={() => go("schedule")}>
                Relasi <ArrowRight size={14} />
              </button>
            </div>
            {editing ? (
              <Formation
                state={s}
                trainset={t}
                act={act}
                close={() => setEditing(false)}
              />
            ) : t ? (
              <>
                <button
                  className="back-link"
                  onClick={() => setSelected(undefined)}
                >
                  <ArrowLeft size={14} /> Kembali ke daftar
                </button>
                <TrainDetail
                  state={s}
                  trainset={t}
                  act={act}
                  edit={() => setEditing(true)}
                  go={go}
                />
              </>
            ) : (
              <>
                {!s.trainsets.length && (
                  <Card className="starter-card">
                    <small>LANGKAH PERTAMA</small>
                    <h2>
                      Satu loko.
                      <br />
                      Empat kereta.
                      <br />
                      <span>Banyak kemungkinan.</span>
                    </h2>
                    {!s.orders.length && (
                      <label>
                        Hub awal
                        <select
                          disabled={!!s.companyStarted}
                          value={s.hub}
                          onChange={(e) =>
                            act(
                              { type: "hub", station: e.target.value },
                              "Hub awal dipilih.",
                            )
                          }
                        >
                          {stations.map((st) => (
                            <option
                              key={st.id}
                              value={st.id}
                              disabled={!st.connected}
                            >
                              {stationName(st.id)}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <Asset id="cc201" />
                    <p>
                      Bangun trainset pertama dengan 424 kursi Ekonomi dan
                      sumber listrik terpisah.
                    </p>
                    <button className="primary" onClick={() => go("market")}>
                      Pilih sarana starter <ArrowRight size={16} />
                    </button>
                    <p className="muted">
                      Modal mencakup harga paket baru + Rp150 juta cadangan
                      operasi sementara.
                    </p>
                  </Card>
                )}
                {s.trainsets
                  .filter((x) => status(x) === tab)
                  .map((x) => (
                    <button
                      className="train-row"
                      key={x.id}
                      onClick={() => setSelected(x.id)}
                    >
                      <Asset
                        id={s.units.find((u) => u.id === x.units[0])!.productId}
                      />
                      <div>
                        <small>{x.id.slice(0, 8).toUpperCase()}</small>
                        <b>{x.name}</b>
                        <span>
                          {stationName(x.location)} ·{" "}
                          {coreFormation(s, x).capacity} kursi
                        </span>
                      </div>
                      <ArrowRight size={16} />
                    </button>
                  ))}
                {!!s.trainsets.length &&
                  !s.trainsets.some((x) => status(x) === tab) && (
                    <div className="empty">
                      Tidak ada trainset pada status ini.
                    </div>
                  )}
                {tab === "pending" && (
                  <Card title="Pesanan sarana">
                    {s.orders
                      .filter((o) => !o.accepted)
                      .map((o) => (
                        <div className="list-row" key={o.id}>
                          <div>
                            <b>
                              {o.quantity} × {coreProduct(o.productId).name}
                            </b>
                            <small>
                              {o.due <= s.minute
                                ? "Siap acceptance"
                                : remaining(o.due, s)}
                            </small>
                          </div>
                          <button
                            disabled={o.due > s.minute}
                            onClick={() =>
                              act({ type: "accept", orderId: o.id })
                            }
                          >
                            Terima
                          </button>
                        </div>
                      ))}
                    {!s.orders.some((o) => !o.accepted) && (
                      <p className="muted">
                        Belum ada pesanan dalam pengantaran.
                      </p>
                    )}
                  </Card>
                )}
              </>
            )}
          </div>
          <footer className="status-tabs">
            {tabs.map((item) => (
              <button
                key={item.id}
                className={tab === item.id ? "active" : ""}
                onClick={() => {
                  setTab(item.id);
                  setSelected(undefined);
                  setEditing(false);
                }}
              >
                <b>
                  {s.trainsets.filter((x) => status(x) === item.id).length +
                    (item.id === "pending"
                      ? s.orders.filter((o) => !o.accepted).length
                      : 0)}
                </b>
                <span>{item.label}</span>
              </button>
            ))}
          </footer>
        </>
      )}
    </>
  );
}

function Formation({
  state: s,
  trainset: t,
  act,
  close,
}: {
  state: CoreState;
  trainset?: CoreTrainset;
  act: Act;
  close: () => void;
}) {
  const [name, setName] = useState(t?.name ?? "Trainset 01");
  const [units, setUnits] = useState(t?.units ?? []);
  const available = s.units.filter(
    (u) =>
      !u.job &&
      !s.trainsets.some(
        (other) => other.id !== t?.id && other.units.includes(u.id),
      ),
  );
  const proposed = {
    id: t?.id ?? "preview",
    name,
    units,
    location: s.hub,
    readyAt: 0,
    parked: true,
    crew: false,
  };
  const f = coreFormation(s, proposed);
  const move = (index: number, delta: number) => {
    const next = [...units];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setUnits(next);
  };
  return (
    <Card title={t ? "Edit formasi" : "Rakit trainset"}>
      <label>
        Nama / kode internal
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <p className="muted">
        Pilih unit di lokasi yang sama. Susun urutan dengan tombol naik/turun.
      </p>
      {available
        .filter((u) => !units.includes(u.id))
        .map((u) => (
          <button
            className="add-unit"
            key={u.id}
            onClick={() => setUnits([...units, u.id])}
          >
            <Asset id={u.productId} />
            <span>
              {coreProduct(u.productId).name}
              <small>
                #{u.id.slice(-8)} · {stationName(u.location)}
              </small>
            </span>
            <Plus size={16} />
          </button>
        ))}
      {units.map((uid, i) => {
        const u = s.units.find((x) => x.id === uid)!;
        return (
          <div className="formation-unit" key={uid}>
            <b>{i + 1}</b>
            <Asset id={u.productId} />
            <span>{coreProduct(u.productId).name}</span>
            <button
              aria-label="Pindah ke depan"
              disabled={i === 0}
              onClick={() => move(i, -1)}
            >
              <ChevronUp size={14} />
            </button>
            <button
              aria-label="Pindah ke belakang"
              disabled={i === units.length - 1}
              onClick={() => move(i, 1)}
            >
              <ChevronDown size={14} />
            </button>
            <button
              aria-label="Hapus unit"
              onClick={() => setUnits(units.filter((x) => x !== uid))}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
      <div className="stats">
        <div>
          <strong>{f.capacity}</strong>
          <small>Kursi</small>
        </div>
        <div>
          <strong>{f.length.toFixed(1)} m</strong>
          <small>Panjang</small>
        </div>
        <div>
          <strong>{f.power} kW</strong>
          <small>Surplus daya</small>
        </div>
      </div>
      <p className="muted">
        EC {f.seats.EC} · EX {f.seats.EX} · LX {f.seats.LX} · {f.weight} ton ·
        batas {Number.isFinite(f.speed) ? f.speed : "—"} km/h
      </p>
      <div className="toolbar">
        <button
          className="primary"
          onClick={() => {
            if (
              act(
                {
                  type: "formation",
                  ...(t ? { trainsetId: t.id } : {}),
                  name,
                  units,
                },
                "Formasi disimpan.",
              )
            )
              close();
          }}
        >
          {t ? "Simpan formasi" : "Buat trainset"}
        </button>
        <button onClick={close}>Kembali</button>
      </div>
    </Card>
  );
}

function TrainDetail({
  state: s,
  trainset: t,
  act,
  edit,
  go,
}: {
  state: CoreState;
  trainset: CoreTrainset;
  act: Act;
  edit: () => void;
  go: (screen: Screen) => void;
}) {
  const f = coreFormation(s, t),
    run = s.runs.find((r) => r.trainsetId === t.id && r.status === "running");
  const held = s.runs.find(
    (r) =>
      r.trainsetId === t.id && (r.status === "held" || r.status === "stopped"),
  );
  const [oldUnit, setOldUnit] = useState(t.units[0] ?? ""),
    [replacement, setReplacement] = useState("");
  return (
    <>
      <Card>
        <small className="eyebrow">
          {t.id.slice(0, 8).toUpperCase()} · {stationName(t.location)}
        </small>
        <h2>{run?.name ?? t.name}</h2>
        <div className="consist-art">
          {f.units.map((u) => (
            <Asset key={u.id} id={u.productId} />
          ))}
        </div>
        <div className="stats">
          <div>
            <strong>{f.capacity}</strong>
            <small>Kursi</small>
          </div>
          <div>
            <strong>{f.speed}</strong>
            <small>km/h batas</small>
          </div>
          <div>
            <strong>
              {Math.round(f.units.reduce((v, u) => v + u.fuel, 0))} L
            </strong>
            <small>Fuel onboard</small>
          </div>
        </div>
        <p className="muted">
          Kapasitas EC {f.seats.EC} · EX {f.seats.EX} · LX {f.seats.LX}. Umur
          unit tidak direset oleh servis.
        </p>
        {run && (
          <>
            <RunReport run={run} state={s} />
            <div className="toolbar">
              <button
                onClick={() =>
                  act(
                    { type: "stop", runId: run.id },
                    "Berhenti diminta di stasiun aman berikutnya.",
                  )
                }
              >
                Berhenti luar biasa
              </button>
              <button
                disabled={run.recalling}
                onClick={() =>
                  act(
                    { type: "recall", runId: run.id },
                    "Recall diminta. Perjalanan pulang memakai fuel dan lintas.",
                  )
                }
              >
                Recall & batalkan tiket belum dilayani
              </button>
            </div>
          </>
        )}
        {held && (
          <div className="readiness warning">
            <b>Dinas tertahan</b>
            <p>{held.reason}</p>
            <button
              onClick={() =>
                act(
                  { type: "resume", runId: held.id },
                  "Occurrence dilanjutkan setelah pemeriksaan kesiapan.",
                )
              }
            >
              Tinjau dan lanjutkan
            </button>
          </div>
        )}
        {!run && (
          <div className="action-grid">
            <button onClick={() => go("schedule")}>
              <CalendarDays size={16} /> Buka menu Jadwal
            </button>
            <button onClick={edit}>
              <TrainFront size={16} /> Edit formasi
            </button>
            <button onClick={() => act({ type: "fill", trainsetId: t.id })}>
              <Fuel size={16} /> Isi tangki penuh
            </button>
            <button onClick={() => act({ type: "crew", trainsetId: t.id })}>
              <ShieldCheck size={16} />{" "}
              {t.crew ? "Kru aktif" : "Aktifkan kontrak kru"}
            </button>
            <button onClick={() => act({ type: "park", trainsetId: t.id })}>
              Parkir di dipo ini
            </button>
          </div>
        )}
      </Card>
      <Card title="Maintenance per unit">
        {f.units.map((u) => (
          <div className="list-row" key={u.id}>
            <div>
              <b>{coreProduct(u.productId).name}</b>
              <small>
                {u.job
                  ? `${u.job.kind} · ${remaining(u.job.end, s)}`
                  : `P1 berikut · ${remaining(u.nextService, s)}`}
              </small>
            </div>
            <button
              disabled={!!run || !!u.job}
              onClick={() => act({ type: "maintenance", unitId: u.id })}
            >
              <Wrench size={14} /> P1
            </button>
            {["ec-standard", "ec-regular"].includes(u.productId) && (
              <button
                disabled={!!run || !!u.job}
                onClick={() =>
                  act({ type: "maintenance", unitId: u.id, retrofit: true })
                }
              >
                Retrofit 72
              </button>
            )}
          </div>
        ))}
        <p className="muted">
          Biaya/durasi adalah balance sementara. Jeda jadwal melalui menu Jadwal sebelum servis,
          atau gunakan unit pengganti.
        </p>
        <label>
          Lepas unit
          <select value={oldUnit} onChange={(e) => setOldUnit(e.target.value)}>
            {f.units.map((u) => (
              <option key={u.id} value={u.id}>
                {coreProduct(u.productId).name} #{u.id.slice(-4)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Unit pengganti
          <select
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
          >
            <option value="">Pilih inventori tersedia</option>
            {s.units
              .filter(
                (u) =>
                  !u.job &&
                  u.location === t.location &&
                  !s.trainsets.some((x) => x.units.includes(u.id)),
              )
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {coreProduct(u.productId).name} #{u.id.slice(-4)}
                </option>
              ))}
          </select>
        </label>
        <button
          disabled={!replacement || !!run}
          onClick={() =>
            act({
              type: "swap",
              trainsetId: t.id,
              oldUnitId: oldUnit,
              newUnitId: replacement,
            })
          }
        >
          Ganti unit di fasilitas ini
        </button>
      </Card>
    </>
  );
}
