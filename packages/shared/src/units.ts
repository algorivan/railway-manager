import { Brand } from './brand.js';

export type Money = Brand<number, 'Money'>;
export type Km = Brand<number, 'Km'>;
export type Kmh = Brand<number, 'Kmh'>;
export type Tons = Brand<number, 'Tons'>;
export type Meters = Brand<number, 'Meters'>;
export type Minutes = Brand<number, 'Minutes'>;
export type Percentage = Brand<number, 'Percentage'>;

// --- Money Helpers ---

export function toMoney(val: number): Money {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    throw new TypeError(`Money must be a finite number, received: ${val}`);
  }
  if (!Number.isInteger(val)) {
    throw new TypeError(`Money must be an integer (IDR has zero decimal places), received: ${val}`);
  }
  if (!Number.isSafeInteger(val)) {
    throw new RangeError(`Money value ${val} exceeds safe integer bounds`);
  }
  return val as Money;
}

export function isMoney(val: unknown): val is Money {
  return typeof val === 'number' && Number.isSafeInteger(val);
}

export function addMoney(a: Money, b: Money): Money {
  return toMoney(a + b);
}

export function subtractMoney(a: Money, b: Money): Money {
  return toMoney(a - b);
}

export function multiplyMoney(m: Money, factor: number): Money {
  if (typeof factor !== 'number' || !Number.isFinite(factor)) {
    throw new TypeError(`Multiplication factor must be a finite number, received: ${factor}`);
  }
  return toMoney(Math.round(m * factor));
}

export function formatRupiah(m: Money): string {
  const isNegative = m < 0;
  const absVal = Math.abs(m);
  const formatted = absVal.toLocaleString('id-ID');
  return isNegative ? `Rp -${formatted}` : `Rp ${formatted}`;
}

// --- Km (Kilometers) Helpers ---

export function toKm(n: number): Km {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
    throw new RangeError(`Km must be a non-negative finite number, received: ${n}`);
  }
  return (Math.round(n * 100) / 100) as Km;
}

export function isKm(v: unknown): v is Km {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

// --- Kmh (Kilometers per hour) Helpers ---

export function toKmh(n: number): Kmh {
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) {
    throw new RangeError(`Kmh must be a non-negative integer, received: ${n}`);
  }
  return n as Kmh;
}

export function isKmh(v: unknown): v is Kmh {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

// --- Tons Helpers ---

export function toTons(n: number): Tons {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
    throw new RangeError(`Tons must be a non-negative finite number, received: ${n}`);
  }
  return (Math.round(n * 100) / 100) as Tons;
}

export function isTons(v: unknown): v is Tons {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

// --- Meters Helpers ---

export function toMeters(n: number): Meters {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
    throw new RangeError(`Meters must be a non-negative finite number, received: ${n}`);
  }
  return (Math.round(n * 100) / 100) as Meters;
}

export function isMeters(v: unknown): v is Meters {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

// --- Minutes Helpers ---

export function toMinutes(n: number): Minutes {
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) {
    throw new RangeError(`Minutes must be a non-negative integer, received: ${n}`);
  }
  return n as Minutes;
}

export function isMinutes(v: unknown): v is Minutes {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

// --- Percentage Helpers ---

export function toPercentage(n: number): Percentage {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 100) {
    throw new RangeError(`Percentage must be a number between 0.00 and 100.00, received: ${n}`);
  }
  return (Math.round(n * 100) / 100) as Percentage;
}

export function isPercentage(v: unknown): v is Percentage {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;
}
