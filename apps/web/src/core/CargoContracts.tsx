import { useState } from "react";
import { CORE_CARGO_OFFERS, CORE_OPERATING_TRACKS } from "@railway/game-data";
import { findCorePath, type CoreState } from "@railway/simulation";
import { compact, money, when, type Act, type Screen } from "./presentation";
import { ScrollList, ResponsiveColumns } from "./Compact";
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
  return (
    <ResponsiveColumns labels={["Penawaran", "Progres & panduan"]}>
      <div>
        <label>
          Penawaran industri
          <select
            value={offerId}
            onChange={(e) => setOffer(e.target.value as typeof offerId)}
          >
            {CORE_CARGO_OFFERS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <h2>{compact(offer.investment)}</h2>
        <p>
          Investasi sarana saat kontrak diterima. {offer.trips} pengiriman A→B
          dalam {offer.days} hari game; bonus selesai {compact(offer.bonus)}.
        </p>
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
        <p>
          {money(offer.paymentPerTonKm)}/ton-km · contoh 80 ton:{" "}
          {compact(80 * km * offer.paymentPerTonKm)} per pengiriman.
        </p>
        <button
          className="primary"
          disabled={
            !relation ||
            !!active ||
            s.cargoContracts?.some((c) => c.offerId === offerId)
          }
          onClick={() =>
            act(
              { type: "cargoContract", offerId, serviceId: rid },
              "Investasi diterima. Beli gerbong sesuai kontrak, rakit trainset kargo, lalu simpan jadwal PP.",
            )
          }
        >
          Terima kontrak & investasi
        </button>
        <p className="muted">
          Relasi ini menjadi khusus kargo, berhenti hanya di terminal. Relasi
          dengan jadwal atau perjalanan aktif tidak dapat dialihkan. Setiap
          penawaran investasi hanya sekali.
        </p>
      </div>
      <div>
        <b>Alur kontrak</b>
        <ol>
          <li>Buat relasi minimal 25 km di Jadwal.</li>
          <li>Terima investasi, beli lokomotif dan ≥2 gerbong sejenis.</li>
          <li>Rakit trainset kargo di Armada, rekrut kru.</li>
          <li>Simpan jadwal PP: A→B berisi muatan, B→A kosong.</li>
        </ol>
        <div className="toolbar">
          <button onClick={() => go("market")}>Beli sarana</button>
          <button onClick={() => go("fleet")}>Rakit trainset</button>
          <button onClick={() => go("schedule")}>Atur jadwal</button>
        </div>
        <p className="muted">
          Pembayaran setelah tiba sebelum deadline. Recall atau terlambat tidak
          dibayar. Penalti maksimal 10% investasi, proporsional sisa target.
          Jadwal pengiriman berhenti saat kontrak selesai/kedaluwarsa;
          perjalanan balik tetap tersedia.
        </p>
        <ScrollList
          items={[...(s.cargoContracts ?? [])].reverse()}
          render={(c) => (
            <article className="contract-progress" key={c.id}>
              <b>
                {CORE_CARGO_OFFERS.find((o) => o.id === c.offerId)!.name} ·{" "}
                {s.services.find((r) => r.id === c.serviceId)?.name}
              </b>
              <p>
                {c.delivered}/{c.target} pengiriman ·{" "}
                {c.status === "active"
                  ? "Aktif"
                  : c.status === "completed"
                    ? "Selesai"
                    : "Kedaluwarsa"}
              </p>
              <progress
                value={c.delivered}
                max={c.target}
                aria-label="Progres kontrak"
              />
              <small>
                Batas: {when(c.deadline)} · investasi {compact(c.investment)}
              </small>
            </article>
          )}
        />
      </div>
    </ResponsiveColumns>
  );
}
