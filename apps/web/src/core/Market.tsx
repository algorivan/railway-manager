import { useState } from "react";
import { CORE_PRODUCTS } from "@railway/game-data";
import { coreProduct, stationName, type CoreState } from "@railway/simulation";
import { Asset, Card, compact, remaining, type Act } from "./presentation";
import { CompactWorkspace, PagedList, ResponsiveColumns } from "./Compact";
export function Market({ state: s, act }: { state: CoreState; act: Act }) {
  const [productId, setProduct] = useState("cc201"),
    [qty, setQty] = useState(1),
    [depot, setDepot] = useState(s.hub);
  const p = coreProduct(productId),
    pending = s.orders.filter((o) => !o.accepted);
  return (
    <CompactWorkspace>
      <Card title="Beli sarana">
        <ResponsiveColumns>
          <div>
            <label>
              Depo penerima
              <select value={depot} onChange={(e) => setDepot(e.target.value)}>
                {s.depots.map((d) => (
                  <option key={d.station} value={d.station}>
                    {stationName(d.station)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sarana
              <select
                aria-label="Sarana pasar"
                value={productId}
                onChange={(e) => {
                  setProduct(e.target.value);
                  setQty(
                    e.target.value === "ec-standard"
                      ? 4
                      : e.target.value.startsWith("cargo-")
                        ? 2
                        : 1,
                  );
                }}
              >
                {CORE_PRODUCTS.filter((p) => !p.id.endsWith("retrofit")).map(
                  (p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {compact(p.price)}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              Jumlah
              <input
                aria-label={`Jumlah ${p.name}`}
                type="number"
                min={1}
                max={20}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
              />
            </label>
            <button
              className="primary"
              onClick={() =>
                act(
                  {
                    type: "order",
                    productId,
                    quantity: qty,
                    station: depot,
                    starter: true,
                  },
                  "Pesanan disimpan. Buka tab Pesanan untuk menerima sarana saat siap.",
                )
              }
            >
              Pesan · {compact(p.price * qty)}
            </button>
          </div>
          <div>
            <Asset id={p.id} />
            <h2>{p.name}</h2>
            <div className="stats">
              <div>
                <strong>
                  {p.cargoTons ? `${p.cargoTons} t` : p.seats || "—"}
                </strong>
                <small>{p.cargoTons ? "Muatan per gerbong" : "Kursi"}</small>
              </div>
              <div>
                <strong>{p.speed}</strong>
                <small>km/jam maksimum</small>
              </div>
              <div>
                <strong>{p.tank.toLocaleString("id-ID")}</strong>
                <small>Tangki game (L)</small>
              </div>
            </div>
            <p>
              Harga {compact(p.price)} per unit · pengantaran{" "}
              {p.deliveryMinutes} menit game.
            </p>
            <p className="muted">
              Paket pertama 1 CC201 + 4 Ekonomi Standar + 1 pembangkit tersedia
              langsung di hub (424 kursi). Untuk kargo: lokomotif + sedikitnya 2
              gerbong sesuai jenis kontrak; tanpa kereta penumpang.
            </p>
            <small className="muted">
              Harga, tangki dan durasi disesuaikan untuk game. Ilustrasi kargo
              adalah konsep.
            </small>
          </div>
        </ResponsiveColumns>
      </Card>
      <Card title={`Pesanan (${pending.length})`}>
        {!pending.length && <p>Belum ada pesanan menunggu acceptance.</p>}
        <PagedList
          items={[...pending].reverse()}
          render={(o) => (
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
                    "Sarana diterima. Rakit trainset lewat Armada atau kelola inventori di Depo.",
                  )
                }
              >
                Terima
              </button>
            </div>
          )}
        />
      </Card>
    </CompactWorkspace>
  );
}
