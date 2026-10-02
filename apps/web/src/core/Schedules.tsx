import { useState } from "react";
import { Plus, ArrowRight } from "lucide-react";
import {
  CORE_SELECTABLE_STATIONS as stations,
  type CoreClass,
} from "@railway/game-data";
import {
  findCorePath,
  coreServiceName,
  stationName,
  type CoreState,
} from "@railway/simulation";
import { Card, type Act } from "./presentation";
import { RunReport } from "./RunReport";
import { StationPicker } from "./StationPicker";
import { SchedulePlanner } from "./SchedulePlanner";

export function Schedules({ state: s, act }: { state: CoreState; act: Act }) {
  const [wizard, setWizard] = useState(false),
    [stage, setStage] = useState(1);
  const [origin, setOrigin] = useState(s.hub);
  const defaultDest = stations.find((st) => {
    if (st.id === s.hub || !st.connected) return false;
    try {
      findCorePath(s.hub, st.id, s.access);
      return true;
    } catch {
      return false;
    }
  });
  const [dest, setDest] = useState(
    defaultDest?.id ??
      stations.find((st) => st.connected && st.id !== s.hub)?.id ??
      s.hub,
  );
  const [skippedStops, setSkippedStops] = useState<string[]>([]);
  const [category, setCategory] = useState("Custom");
  const [rid, setRid] = useState(s.services[0]?.id ?? "");
  const name = coreServiceName(origin, dest);
  let path: ReturnType<typeof findCorePath> | undefined,
    pathError = "";
  try {
    path = findCorePath(origin, dest, s.access);
  } catch (e) {
    pathError = (e as Error).message;
  }
  const commercialStops =
    path?.stations.filter(
      (id) => stations.some((st) => st.id === id) && !skippedStops.includes(id),
    ) ?? [];
  const selectedR = s.services.find((r) => r.id === rid);
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
              <StationPicker
                label="Stasiun awal"
                value={origin}
                onChange={setOrigin}
              />
              <StationPicker
                label="Stasiun akhir"
                value={dest}
                onChange={setDest}
              />
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
                {pathError ||
                  path?.stations
                    .filter((id) => stations.some((st) => st.id === id))
                    .map(stationName)
                    .join(" → ")}
              </p>
              {path?.stations
                .slice(1, -1)
                .filter((id) => stations.some((st) => st.id === id))
                .map((id) => (
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
                <input
                  value={name}
                  readOnly
                  aria-label="Nama relasi otomatis"
                />
              </label>
              <p className="muted">
                Nama otomatis memakai kode stasiun. Relasi berlaku dua arah dan
                dapat dipakai oleh beberapa trainset; tidak perlu membuat relasi
                terpisah untuk perjalanan balik. Stasiun besar, sedang, dan
                kecil dari data yang tersedia dapat dipilih. Pilih pemberhentian
                komersial pada tahap lintas; simpul lain tetap dilalui tanpa
                dwell atau penjualan tiket.
              </p>
            </>
          )}
          {stage === 3 && (
            <>
              <h2>{name}</h2>
              <p>
                {path?.stations
                  .filter((id) => stations.some((st) => st.id === id))
                  .map(stationName)
                  .join(" → ")}
              </p>
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
                      "Relasi dibuat. Lanjutkan mengatur jam di formulir jadwal di bawah.",
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
      <SchedulePlanner state={s} act={act} />
      {!!s.services.length && (
        <Card title="Pengaturan relasi & tarif">
          <details>
            <summary>Ubah tarif relasi</summary>
            <label>
              Relasi tarif
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
            {selectedR &&
              (["EC", "EX", "LX"] as CoreClass[]).map((cls) => (
                <label key={cls}>
                  Tarif {cls} (% referensi)
                  <input
                    type="number"
                    min="50"
                    max="200"
                    key={`${rid}:${cls}:${selectedR.fares[cls]}`}
                    defaultValue={Math.round(selectedR.fares[cls] * 100)}
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
                  <button
                    onClick={() =>
                      act({
                        type: "fare",
                        serviceId: rid,
                        cls,
                        multiplier: 1,
                        auto: true,
                      })
                    }
                  >
                    Tarif otomatis {cls}
                  </button>
                </label>
              ))}
          </details>
        </Card>
      )}
      <Card title="Hasil operasi">
        {s.runs
          .slice(-8)
          .reverse()
          .map((run) => (
            <div key={run.id}>
              <b>{run.name}</b>
              {run.status === "held" || run.status === "stopped" ? (
                <div className="readiness warning">
                  <p>{run.reason}</p>
                  <button
                    onClick={() => act({ type: "resume", runId: run.id })}
                  >
                    Konfirmasi lanjutkan
                  </button>
                </div>
              ) : (
                <RunReport run={run} state={s} />
              )}
            </div>
          ))}
        {!s.runs.length && (
          <p>Hasil perjalanan muncul setelah kereta berangkat.</p>
        )}
      </Card>
    </div>
  );
}
