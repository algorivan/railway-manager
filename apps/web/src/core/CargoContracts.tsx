import { useState } from "react";
import {
  CORE_CARGO_OFFERS,
  CORE_OPERATING_TRACKS,
  coreCargoInvestmentBudget,
} from "@railway/game-data";
import { findCorePath, type CoreState } from "@railway/simulation";
import { compact, money, when, type Act, type Screen } from "./presentation";
import { Fuel, Pickaxe, Container } from "lucide-react";
const icons = { oil: Fuel, mineral: Pickaxe, logistics: Container };
export function CargoContracts({
  state: s,
  act,
  go,
}: {
  state: CoreState;
  act: Act;
  go: (screen: Screen) => void;
}) {
  const [offerId, setOffer] =
      useState<(typeof CORE_CARGO_OFFERS)[number]["id"]>("oil"),
    [rid, setRid] = useState(s.services[0]?.id ?? "");
  const offer = CORE_CARGO_OFFERS.find((o) => o.id === offerId)!,
    budget = coreCargoInvestmentBudget(offerId),
    active = s.cargoContracts?.find((c) => c.status === "active"),
    relation = s.services.find((r) => r.id === rid);
  let km = 0;
  try {
    if (relation)
      km = findCorePath(
        relation.stations[0]!,
        relation.stations.at(-1)!,
        s.access,
      ).segments.reduce(
        (total, id) =>
          total +
          (CORE_OPERATING_TRACKS.find((t) => t.id === id)?.distanceKm ?? 0),
        0,
      );
  } catch {}
  const used = s.cargoContracts?.some((c) => c.offerId === offerId),
    busy =
      relation &&
      (s.plans.some((p) => p.active && p.serviceId === rid) ||
        s.runs.some(
          (r) =>
            r.serviceId === rid &&
            ["running", "held", "stopped"].includes(r.status),
        ));
  const blocked = active
    ? "Selesaikan kontrak aktif terlebih dahulu."
    : used
      ? "Investasi penawaran ini sudah pernah diterima."
      : !relation
        ? "Pilih relasi kargo atau buat di Jadwal."
        : busy
          ? "Pilih relasi tanpa jadwal/perjalanan aktif."
          : km < 25
            ? "Relasi kargo memerlukan sedikitnya 25 km."
            : "Dana masuk saat diterima. Relasi menjadi khusus kargo.";
  return (
    <div className="cargo-funding-workspace">
      <div
        className="cargo-offer-cards"
        role="group"
        aria-label="Penawaran investasi industri"
      >
        {CORE_CARGO_OFFERS.map((o) => {
          const Icon = icons[o.id];
          return (
            <button
              key={o.id}
              aria-pressed={offerId === o.id}
              onClick={() => setOffer(o.id)}
            >
              <Icon size={18} />
              <b>{o.name}</b>
              <strong>{compact(o.investment)}</strong>
            </button>
          );
        })}
      </div>
      <div className="cargo-funding-scroll detail-scroll">
        <section
          className="cargo-investment-hero"
          aria-label="Modal investasi di muka"
        >
          <small>MODAL DI MUKA</small>
          <strong>{compact(offer.investment)}</strong>
          <span>
            {offer.trips} pengiriman · {offer.days} hari game · bonus{" "}
            {compact(offer.bonus)}
          </span>
        </section>
        <section
          className="cargo-budget"
          aria-label="Rencana penggunaan investasi"
        >
          <b>Contoh modal: {budget.trainsets} trainset kargo 80 t</b>
          <div>
            <span>{budget.trainsets} × CC201 + 2 gerbong</span>
            <strong>{compact(budget.fleetCost)}</strong>
          </div>
          <div>
            <span>Cadangan operasional</span>
            <strong>{compact(budget.reserve)}</strong>
          </div>
          <div className="budget-surplus">
            <span>Sisa untuk lintas & pengembangan</span>
            <strong>{compact(budget.networkBudget)}</strong>
          </div>
          <small>Alokasi contoh; beli sarana dan simpan jadwal sendiri.</small>
        </section>
        <label>
          Relasi khusus kargo
          <select
            aria-label="Relasi kontrak kargo"
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
        <p className="cargo-rate">
          {money(offer.paymentPerTonKm)}/ton-km · contoh 80 t:{" "}
          <b>{compact(80 * km * offer.paymentPerTonKm)}</b>/pengiriman
        </p>
        <div className="cargo-steps">
          <span>1 · Terima investasi</span>
          <span>2 · Beli & rakit</span>
          <span>3 · Kru & jadwal PP</span>
        </div>
        <div className="toolbar">
          <button onClick={() => go("market")}>Beli sarana</button>
          <button onClick={() => go("fleet")}>Rakit trainset</button>
          <button onClick={() => go("schedule")}>Buat relasi / jadwal</button>
        </div>
        <p className="muted cargo-terms">
          Bayaran setelah tiba tepat waktu; balik kosong. Penalti maksimal 10%
          modal kontrak sesuai sisa target. Setiap penawaran investasi hanya
          sekali.
        </p>
        {(s.cargoContracts?.length ?? 0) > 0 && (
          <section className="cargo-existing" aria-label="Kontrak diterima">
            <b>Kontrak Anda</b>
            {[...(s.cargoContracts ?? [])].reverse().map((c) => {
              const extra =
                s.ledger.find((e) => e.id === `cargo-expansion:${c.id}`)
                  ?.cash ?? 0;
              return (
                <article className="contract-progress" key={c.id}>
                  <b>
                    {CORE_CARGO_OFFERS.find((o) => o.id === c.offerId)!.name} ·{" "}
                    {s.services.find((r) => r.id === c.serviceId)?.name}
                  </b>
                  <span>
                    {c.delivered}/{c.target} pengiriman ·{" "}
                    {c.status === "active"
                      ? "Aktif"
                      : c.status === "completed"
                        ? "Selesai"
                        : "Kedaluwarsa"}
                  </span>
                  <progress
                    value={c.delivered}
                    max={c.target}
                    aria-label="Progres kontrak"
                  />
                  <small>
                    Batas {when(c.deadline)} · total modal{" "}
                    {compact(c.investment + extra)}
                  </small>
                  {extra > 0 && (
                    <small>
                      Tambahan ekspansi {compact(extra)} · syarat kontrak awal
                      tetap.
                    </small>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </div>
      <footer className="cargo-funding-footer">
        <small>{blocked}</small>
        <button
          className="primary"
          disabled={!relation || !!active || !!used || !!busy || km < 25}
          onClick={() =>
            act(
              { type: "cargoContract", offerId, serviceId: rid },
              "Investasi masuk. Modal cukup untuk beberapa trainset kargo dan pengembangan lintas; beli sarana lalu simpan jadwal PP.",
            )
          }
        >
          Terima kontrak · +{compact(offer.investment)}
        </button>
      </footer>
    </div>
  );
}
