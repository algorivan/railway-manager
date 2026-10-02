import { useState } from "react";
import { Check } from "lucide-react";
import { CORE_PRODUCTS } from "@railway/game-data";
import { coreProduct, stationName, type CoreState } from "@railway/simulation";
import { Asset, Card, compact, remaining, type Act } from "./presentation";

export function Market({ state: s, act }: { state: CoreState; act: Act }) {
  const [kind, setKind] = useState("all"),
    [qty, setQty] = useState<Record<string, number>>({ "ec-standard": 4 });
  const [depot, setDepot] = useState(s.hub);
  return (
    <div className="panel-scroll">
      <Card title="Starter ready-stock">
        <p>
          CC201 baru + 4 Ekonomi Standar + pembangkit. Vendor menyediakan paket
          awal di hub; beli unit terpisah, lakukan acceptance, lalu rakit
          trainset.
        </p>
        <p className="muted">
          424 kursi. Sarana baru berikutnya memakai waktu produksi 3–14 hari
          game. Harga, kondisi dan waktu adalah balance prototype.
        </p>
      </Card>
      <label>
        Dipo penerima
        <select value={depot} onChange={(e) => setDepot(e.target.value)}>
          {s.depots.map((d) => (
            <option key={d.station} value={d.station}>
              {stationName(d.station)}
            </option>
          ))}
        </select>
      </label>
      <div className="filter-chips">
        {[
          { id: "all", label: "Semua" },
          { id: "loco", label: "Lokomotif" },
          { id: "coach", label: "Penumpang" },
          { id: "generator", label: "Pembangkit" },
          { id: "dining", label: "Restorasi" },
        ].map((c) => (
          <button
            key={c.id}
            className={kind === c.id ? "selected" : ""}
            onClick={() => setKind(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      {CORE_PRODUCTS.filter(
        (p) =>
          !p.id.endsWith("retrofit") && (kind === "all" || p.kind === kind),
      ).map((p) => (
        <Card key={p.id} className="product-card">
          <div className="product-top">
            <span className="pill">
              {p.kind === "loco"
                ? "LOKOMOTIF"
                : (p.serviceClass ?? "SARANA SERVIS")}
            </span>
            <strong>{compact(p.price)}</strong>
          </div>
          <Asset id={p.id} />
          <h2>{p.name}</h2>
          <div className="stats">
            <div>
              <strong>{p.seats || "—"}</strong>
              <small>Kursi</small>
            </div>
            <div>
              <strong>{p.speed}</strong>
              <small>km/h</small>
            </div>
            <div>
              <strong>{p.body === "stainless" ? "SS" : "MS"}</strong>
              <small>Badan</small>
            </div>
          </div>
          <div className="buy-row">
            <label>
              Jumlah
              <input
                aria-label={`Jumlah ${p.name}`}
                type="number"
                min="1"
                max="20"
                value={qty[p.id] ?? 1}
                onChange={(e) =>
                  setQty({ ...qty, [p.id]: Number(e.target.value) })
                }
              />
            </label>
            <button
              className="primary"
              onClick={() =>
                act(
                  {
                    type: "order",
                    productId: p.id,
                    quantity: qty[p.id] ?? 1,
                    station: depot,
                    starter: true,
                  },
                  "Pesanan tercatat. Terima sarana saat siap; unit belum masuk formasi.",
                )
              }
            >
              Pesan · {compact(p.price * (qty[p.id] ?? 1))}
            </button>
          </div>
        </Card>
      ))}
      <Card title="Pesanan & acceptance">
        {s.orders
          .filter((o) => !o.accepted)
          .map((o) => (
            <div className="list-row" key={o.id}>
              <div>
                <b>
                  {o.quantity} × {coreProduct(o.productId).name}
                </b>
                <small>
                  {stationName(o.station)} ·{" "}
                  {o.due <= s.minute ? "Siap diterima" : remaining(o.due, s)}
                </small>
              </div>
              <button
                disabled={o.due > s.minute}
                onClick={() =>
                  act(
                    { type: "accept", orderId: o.id },
                    "Unit diterima dan tersedia di inventori.",
                  )
                }
              >
                Terima <Check size={14} />
              </button>
            </div>
          ))}
      </Card>
      <p className="muted">
        Ilustrasi konsep dari aset Anda; beberapa varian berbagi artwork. CC203
        tersedia dalam kit, tetapi belum dijual karena katalog spesifikasinya
        belum tersedia.
      </p>
    </div>
  );
}
