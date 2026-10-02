import type { ReactNode } from "react";
import {
  coreProduct,
  pace,
  type CoreAction,
  type CoreState,
} from "@railway/simulation";

export const money = (n: number) =>
  `Rp${Math.round(n).toLocaleString("id-ID")}`;
export const compact = (n: number) =>
  n >= 1e9
    ? `Rp${(n / 1e9).toFixed(2)} M`
    : n >= 1e6
      ? `Rp${(n / 1e6).toFixed(1)} jt`
      : money(n);
export const clock = (m: number) =>
  `${String(Math.floor((m % 1440) / 60)).padStart(2, "0")}:${String(Math.floor(m % 60)).padStart(2, "0")}`;
export const when = (m: number) =>
  `Hari ${Math.floor(m / 1440) + 1} · ${clock(m)}`;
export const remaining = (m: number, s: CoreState) =>
  `${Math.max(0, Math.ceil(m - s.minute))} m game · ${Math.max(0, Math.ceil((m - s.minute) / pace(s)))} m nyata`;
export function Asset({
  id,
  className = "",
}: {
  id: string;
  className?: string;
}) {
  const p = coreProduct(id);
  return (
    <img
      className={`vehicle-art ${className}`}
      src={`/vehicles/${p.asset}.webp`}
      alt={p.name}
    />
  );
}
export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`game-card ${className}`}>
      {title && <h3>{title}</h3>}
      {children}
    </section>
  );
}
export type Act = (action: CoreAction, message?: string) => boolean;
export type Screen =
  "map" | "schedule" | "fleet" | "market" | "office" | "tutorial";
