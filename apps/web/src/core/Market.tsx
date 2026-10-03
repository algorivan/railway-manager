import { useState } from "react";
import { CORE_PRODUCTS } from "@railway/game-data";
import { coreProduct, stationName, type CoreState } from "@railway/simulation";
import { Asset, compact, remaining, type Act } from "./presentation";
import { ScrollList } from "./Compact";
import { readPreference, writePreference } from "./feedback";
const CART_KEY = "railway-manager-cart-v1";
type Item = { productId: string; quantity: number };
const products = CORE_PRODUCTS.filter((p) => !p.id.endsWith("retrofit"));
const categories = [
  { id: "loco", name: "Lokomotif" },
  { id: "coach", name: "Penumpang" },
  { id: "cargo", name: "Kargo" },
] as const;
function readCart(): Item[] {
  try {
    const value: unknown = JSON.parse(readPreference(CART_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value.filter((item): item is Item => {
      if (
        !item ||
        typeof item !== "object" ||
        !products.some((p) => p.id === item.productId) ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 20 ||
        seen.has(item.productId)
      )
        return false;
      seen.add(item.productId);
      return true;
    });
  } catch {
    return [];
  }
}
export function Market({
  state: s,
  act,
  notify,
}: {
  state: CoreState;
  act: Act;
  notify: (message: string, failed?: boolean) => void;
}) {
  const [tab, setTab] = useState("catalog"),
    [category, setCategory] = useState("loco"),
    [cart, setCart] = useState<Item[]>(readCart),
    [depot, setDepot] = useState(s.hub);
  const pending = s.orders.filter((o) => !o.accepted),
    count = cart.reduce((n, item) => n + item.quantity, 0),
    total = cart.reduce(
      (n, item) => n + coreProduct(item.productId).price * item.quantity,
      0,
    );
  const update = (next: Item[]) => {
    setCart(next);
    writePreference(CART_KEY, JSON.stringify(next));
  };
  const add = (productId: string) => {
    const current = cart.find((item) => item.productId === productId);
    if (current?.quantity === 20) {
      notify("Maksimum 20 unit per jenis dalam satu checkout.", true);
      return;
    }
    update(
      current
        ? cart.map((item) =>
            item.productId === productId
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          )
        : [...cart, { productId, quantity: 1 }],
    );
    notify(`${coreProduct(productId).name} ditambahkan ke keranjang.`);
  };
  return (
    <div className="compact-workspace market-workspace">
      <div className="workspace-tabs" role="tablist" aria-label="Pasar sarana">
        {[
          ["catalog", "Katalog"],
          ["cart", `Keranjang (${count})`],
          ["orders", `Pesanan (${pending.length})`],
        ].map(([id, title]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id!)}
          >
            {title}
          </button>
        ))}
      </div>
      {tab === "catalog" && (
        <section className="shop-panel" aria-label="Katalog sarana">
          <div
            className="category-tabs"
            role="tablist"
            aria-label="Kategori sarana"
          >
            {categories.map((c) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={category === c.id}
                onClick={() => setCategory(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div
            className="catalog-grid detail-scroll"
            tabIndex={0}
            aria-label="Daftar sarana"
          >
            {products
              .filter((p) =>
                category === "coach"
                  ? ["coach", "generator", "dining"].includes(p.kind)
                  : p.kind === category,
              )
              .map((p) => (
                <article className="product-card" key={p.id}>
                  <Asset id={p.id} />
                  <h3>{p.name}</h3>
                  <small>
                    {p.cargoTons
                      ? `${p.cargoTons} ton`
                      : p.seats
                        ? `${p.seats} kursi`
                        : p.kind === "generator"
                          ? "Pembangkit"
                          : p.kind === "dining"
                            ? "Kereta makan"
                            : `${p.tank.toLocaleString("id-ID")} L`}{" "}
                    · {p.speed} km/jam
                  </small>
                  <button
                    className="primary"
                    aria-label={`Tambah ${p.name} ke keranjang`}
                    onClick={() => add(p.id)}
                  >
                    {compact(p.price)} <span>＋</span>
                  </button>
                  {cart.some((item) => item.productId === p.id) && (
                    <small className="in-cart">
                      {cart.find((item) => item.productId === p.id)!.quantity}{" "}
                      di keranjang
                    </small>
                  )}
                </article>
              ))}
          </div>
          <footer className="shop-footer">
            <span>
              {count} unit · <b>{compact(total)}</b>
            </span>
            <button
              className="primary"
              disabled={!count}
              onClick={() => setTab("cart")}
            >
              Lihat keranjang →
            </button>
          </footer>
        </section>
      )}
      {tab === "cart" && (
        <section className="shop-panel" aria-label="Keranjang sarana">
          <b>Depo penerima</b>
          <div className="depot-chips detail-scroll">
            {s.depots.map((d) => (
              <button
                key={d.station}
                aria-pressed={depot === d.station}
                onClick={() => setDepot(d.station)}
              >
                {stationName(d.station)}
              </button>
            ))}
          </div>
          <div
            className="cart-items detail-scroll"
            tabIndex={0}
            aria-label="Isi keranjang"
          >
            {!cart.length && <p>Keranjang kosong. Pilih sarana di Katalog.</p>}
            {cart.map((item) => {
              const p = coreProduct(item.productId);
              return (
                <article key={p.id} className="cart-item">
                  <Asset id={p.id} />
                  <div>
                    <b>{p.name}</b>
                    <small>{compact(p.price)} / unit</small>
                  </div>
                  <div className="quantity-control">
                    <button
                      aria-label={`Kurangi ${p.name}`}
                      onClick={() =>
                        update(
                          cart
                            .map((i) =>
                              i.productId === p.id
                                ? { ...i, quantity: i.quantity - 1 }
                                : i,
                            )
                            .filter((i) => i.quantity > 0),
                        )
                      }
                    >
                      −
                    </button>
                    <span aria-label={`Jumlah ${p.name}`}>{item.quantity}</span>
                    <button
                      aria-label={`Tambah jumlah ${p.name}`}
                      disabled={item.quantity >= 20}
                      onClick={() => add(p.id)}
                    >
                      ＋
                    </button>
                  </div>
                  <button
                    aria-label={`Hapus ${p.name}`}
                    onClick={() =>
                      update(cart.filter((i) => i.productId !== p.id))
                    }
                  >
                    ✕
                  </button>
                </article>
              );
            })}
          </div>
          <small>
            Kas {compact(s.cash)} · paket pertama CC201 + 4 Ekonomi Standar +
            pembangkit langsung tersedia di hub.
          </small>
          {total > s.cash && (
            <p className="warning-text" role="status">
              Kas belum cukup. Kurangi isi keranjang.
            </p>
          )}
          <footer className="shop-footer">
            <span>
              {count} unit · <b>{compact(total)}</b>
            </span>
            <button
              className="primary"
              disabled={!count || total > s.cash}
              onClick={() => {
                if (
                  act(
                    { type: "orderCart", station: depot, items: cart },
                    "Checkout berhasil. Terima sarana siap di tab Pesanan.",
                  )
                ) {
                  update([]);
                  setTab("orders");
                }
              }}
            >
              Checkout · {compact(total)}
            </button>
          </footer>
        </section>
      )}
      {tab === "orders" && (
        <section className="shop-panel" aria-label="Pesanan sarana">
          {!pending.length && <p>Belum ada pesanan menunggu penerimaan.</p>}
          <ScrollList
            items={[...pending].reverse()}
            render={(o) => (
              <div className="list-row" key={o.id}>
                <Asset id={o.productId} />
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
                      "Sarana diterima. Rakit trainset di Armada atau periksa inventori di Depo.",
                    )
                  }
                >
                  Terima
                </button>
              </div>
            )}
          />
        </section>
      )}
    </div>
  );
}
