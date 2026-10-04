import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent,
  type KeyboardEvent,
} from "react";
import {
  coreProduct,
  coreFormation,
  stationName,
  type CoreState,
  type CoreTrainset,
} from "@railway/simulation";
import { Asset, Card, type Act } from "./presentation";
import {
  dropFormationUnits,
  groupFormationUnits,
  type FormationDrag,
  type FormationDrop,
} from "./formation-draft";

type HeldCard = FormationDrag & { x: number; y: number; moving: boolean };
export function FormationBuilder({
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
  const [name, setName] = useState(t?.name ?? "Trainset Nusantara"),
    [location, setLocation] = useState(t?.location ?? s.hub),
    [ids, setIds] = useState(t?.units ?? []),
    [held, setHeld] = useState<HeldCard | null>(null),
    [hover, setHover] = useState<string | null>(null),
    [announcement, setAnnouncement] = useState("");
  const pointer = useRef<{
    id: number;
    x: number;
    y: number;
    drag: FormationDrag;
    moved: boolean;
  } | null>(null);
  const available = s.units.filter(
      (u) =>
        u.location === location &&
        !u.job &&
        !s.trainsets.some(
          (other) => other.id !== t?.id && other.units.includes(u.id),
        ),
    ),
    remaining = available.filter((u) => !ids.includes(u.id)),
    groups = groupFormationUnits(
      ids.flatMap((id) => {
        const unit = available.find((u) => u.id === id);
        return unit ? [unit] : [];
      }),
    ),
    stock = groupFormationUnits(remaining),
    formation = coreFormation(s, {
      id: t?.id ?? "draft",
      name,
      units: ids,
      location,
      readyAt: 0,
      crew: false,
      parked: true,
    });
  const targetAt = (x: number, y: number) =>
    document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>("[data-formation-drop]") ?? null;
  const finish = (drag: FormationDrag, target: FormationDrop) => {
    setIds((current) => dropFormationUnits(current, available, drag, target));
    setAnnouncement(
      `${coreProduct(drag.productId).name}: ${target.area === "inventory" ? "grup dikembalikan ke inventori" : "rangkaian diperbarui"}.`,
    );
    setHeld(null);
    setHover(null);
  };
  const dropOn = (element: HTMLElement | null, drag: FormationDrag) => {
    if (!element) {
      setHeld(null);
      setHover(null);
      return;
    }
    finish(drag, {
      area: element.dataset.formationDrop as FormationDrop["area"],
      before: element.dataset.before,
    });
  };
  const begin = (
    e: ReactPointerEvent<HTMLButtonElement>,
    drag: FormationDrag,
  ) => {
    if (e.button !== 0) return;
    pointer.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      drag,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6) return;
    p.moved = true;
    setHeld({ ...p.drag, x: e.clientX, y: e.clientY, moving: true });
    const target = targetAt(e.clientX, e.clientY);
    setHover(
      target
        ? `${target.dataset.formationDrop}:${target.dataset.before ?? ""}`
        : null,
    );
    // Keep long inventories usable while dragging towards an edge.
    const scroll = target?.closest<HTMLElement>(".builder-scroll");
    if (scroll) {
      const box = scroll.getBoundingClientRect();
      if (e.clientY < box.top + 24) scroll.scrollTop -= 12;
      if (e.clientY > box.bottom - 24) scroll.scrollTop += 12;
    }
  };
  const end = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    pointer.current = null;
    if (p.moved) dropOn(targetAt(e.clientX, e.clientY), p.drag);
    // A tap/click is the accessible lift-and-place alternative to dragging.
  };
  const lift = (drag: FormationDrag) => {
    if (held) {
      finish(held, {
        area: drag.source === "formation" ? "formation" : "inventory",
        before: drag.source === "formation" ? drag.productId : undefined,
      });
    } else {
      setHeld({ ...drag, x: 0, y: 0, moving: false });
      setAnnouncement(
        `${coreProduct(drag.productId).name} diangkat. Pilih rangkaian atau inventori untuk meletakkan. Escape membatalkan.`,
      );
    }
  };
  const draggedClick = useRef(false);
  const card = (
    group: { productId: string; unitIds: string[] },
    source: FormationDrag["source"],
  ) => {
    const product = coreProduct(group.productId),
      drag = { source, productId: group.productId };
    return (
      <button
        key={group.productId}
        type="button"
        className={`builder-unit ${held?.productId === group.productId && held.source === source ? "lifted" : ""} ${hover === `formation:${group.productId}` && source === "formation" ? "drop-over" : ""}`}
        data-product={group.productId}
        data-source={source}
        data-formation-drop={source === "formation" ? "formation" : undefined}
        data-before={source === "formation" ? group.productId : undefined}
        aria-label={`${source === "inventory" ? "Inventori" : "Rangkaian"}: ${product.name}, ${group.unitIds.length} unit`}
        aria-pressed={
          held?.productId === group.productId && held.source === source
        }
        onPointerDown={(e) => {
          draggedClick.current = false;
          begin(e, drag);
        }}
        onPointerMove={move}
        onPointerUp={(e) => {
          if (pointer.current) draggedClick.current = pointer.current.moved;
          end(e);
        }}
        onPointerCancel={() => {
          pointer.current = null;
          setHeld(null);
          setHover(null);
        }}
        onClick={() => {
          if (draggedClick.current) {
            draggedClick.current = false;
            return;
          }
          lift(drag);
        }}
      >
        <span className="unit-multiplier">×{group.unitIds.length}</span>
        <Asset id={group.productId} />
        <b>{product.name}</b>
        <small>
          {source === "inventory"
            ? "Seret 1 unit ke rangkaian"
            : "Seret untuk atur grup"}
        </small>
      </button>
    );
  };
  const zoneProps = (area: FormationDrop["area"]) => ({
    "data-formation-drop": area,
    onClick: (e: MouseEvent<HTMLElement>) => {
      if (
        held &&
        !held.moving &&
        !(e.target as HTMLElement).closest(".builder-unit")
      )
        finish(held, { area });
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (
        held &&
        (e.key === "Enter" || e.key === " ") &&
        e.target === e.currentTarget
      ) {
        e.preventDefault();
        finish(held, { area });
      }
    },
  });
  return (
    <Card
      title={t ? "Rakit ulang trainset" : "Rakit trainset"}
      className="formation-builder"
    >
      <div
        onKeyDown={(e) => {
          if (e.key === "Escape" && held) {
            e.preventDefault();
            e.stopPropagation();
            setHeld(null);
            setHover(null);
            pointer.current = null;
            draggedClick.current = true;
            setAnnouncement("Pemindahan dibatalkan.");
          }
        }}
        className="builder-content"
      >
        <div className="builder-fields">
          <label>
            Nama trainset
            <input
              aria-label="Nama trainset"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Depo
            <select
              aria-label="Lokasi depo"
              value={location}
              disabled={!!t}
              onChange={(e) => {
                setLocation(e.target.value);
                setIds([]);
                setHeld(null);
                setHover(null);
              }}
            >
              {s.depots.map((d) => (
                <option key={d.station} value={d.station}>
                  {stationName(d.station)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="formation-metrics" aria-label="Kapasitas rangkaian">
          <div>
            <strong>{ids.length}</strong>
            <small>Unit</small>
          </div>
          <div>
            <strong>{formation.capacity}</strong>
            <small>Penumpang</small>
          </div>
          <div>
            <strong>
              {formation.cargoTons}
              <em>t</em>
            </strong>
            <small>Muatan</small>
          </div>
          <div>
            <strong>
              {Number(formation.length.toFixed(1))}
              <em>m</em>
            </strong>
            <small>Panjang</small>
          </div>
        </div>
        <div className="builder-zones">
          <section
            className={`builder-zone ${hover?.startsWith("formation:") ? "drop-over" : ""}`}
            aria-label="Rangkaian yang dirakit"
          >
            <header>
              <b>Rangkaian · {ids.length} unit</b>
              <small>Seret grup untuk ubah urutan</small>
            </header>
            <div
              {...zoneProps("formation")}
              tabIndex={0}
              role="group"
              aria-keyshortcuts="Enter Space"
              aria-label="Letakkan di akhir rangkaian"
              className="builder-scroll builder-grid detail-scroll"
            >
              {groups.map((g) => card(g, "formation"))}
              {!groups.length && (
                <span className="builder-empty">
                  Seret lokomotif dan gerbong ke sini
                </span>
              )}
            </div>
          </section>
          <section
            className={`builder-zone ${hover === "inventory:" ? "drop-over" : ""}`}
            aria-label="Inventori untuk perakitan"
          >
            <header>
              <b>Inventori · {remaining.length} unit</b>
              <small>Seret kembali untuk melepas grup</small>
            </header>
            <div
              {...zoneProps("inventory")}
              tabIndex={0}
              role="group"
              aria-keyshortcuts="Enter Space"
              aria-label="Kembalikan grup ke inventori"
              className="builder-scroll builder-grid detail-scroll"
            >
              {stock.map((g) => card(g, "inventory"))}
              {!stock.length && (
                <span className="builder-empty">
                  Semua unit telah dirangkai. Seret grup ke sini untuk melepas.
                </span>
              )}
            </div>
          </section>
        </div>
        <div className="builder-footer">
          <small>
            {held
              ? `Letakkan ${coreProduct(held.productId).name} · Escape untuk batal`
              : "1 lokomotif · Penumpang + pembangkit atau kargo"}
          </small>
          <div>
            <button onClick={close}>Batalkan</button>
            <button
              className="primary"
              disabled={!name.trim() || !ids.length}
              onClick={() => {
                if (
                  act(
                    { type: "formation", trainsetId: t?.id, name, units: ids },
                    "Trainset disimpan. Aktifkan kru dan fuel, lalu atur jadwal.",
                  )
                )
                  close();
              }}
            >
              Simpan trainset
            </button>
          </div>
        </div>
        <span className="visually-hidden" role="status" aria-live="polite">
          {announcement}
        </span>
        {held?.moving && (
          <div
            className="builder-drag-ghost"
            style={{ left: held.x + 12, top: held.y + 12 }}
            aria-hidden="true"
          >
            <Asset id={held.productId} />
            <b>{coreProduct(held.productId).name}</b>
          </div>
        )}
      </div>
    </Card>
  );
}
