// --- Money Helpers ---
export function toMoney(val) {
    if (typeof val !== 'number' || !Number.isFinite(val)) {
        throw new TypeError(`Money must be a finite number, received: ${val}`);
    }
    if (!Number.isInteger(val)) {
        throw new TypeError(`Money must be an integer (IDR has zero decimal places), received: ${val}`);
    }
    if (!Number.isSafeInteger(val)) {
        throw new RangeError(`Money value ${val} exceeds safe integer bounds`);
    }
    return val;
}
export function isMoney(val) {
    return typeof val === 'number' && Number.isSafeInteger(val);
}
export function addMoney(a, b) {
    return toMoney(a + b);
}
export function subtractMoney(a, b) {
    return toMoney(a - b);
}
export function multiplyMoney(m, factor) {
    if (typeof factor !== 'number' || !Number.isFinite(factor)) {
        throw new TypeError(`Multiplication factor must be a finite number, received: ${factor}`);
    }
    return toMoney(Math.round(m * factor));
}
export function formatRupiah(m) {
    const isNegative = m < 0;
    const absVal = Math.abs(m);
    const formatted = absVal.toLocaleString('id-ID');
    return isNegative ? `Rp -${formatted}` : `Rp ${formatted}`;
}
// --- Km (Kilometers) Helpers ---
export function toKm(n) {
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
        throw new RangeError(`Km must be a non-negative finite number, received: ${n}`);
    }
    return (Math.round(n * 100) / 100);
}
export function isKm(v) {
    return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}
// --- Kmh (Kilometers per hour) Helpers ---
export function toKmh(n) {
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) {
        throw new RangeError(`Kmh must be a non-negative integer, received: ${n}`);
    }
    return n;
}
export function isKmh(v) {
    return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}
// --- Tons Helpers ---
export function toTons(n) {
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
        throw new RangeError(`Tons must be a non-negative finite number, received: ${n}`);
    }
    return (Math.round(n * 100) / 100);
}
export function isTons(v) {
    return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}
// --- Meters Helpers ---
export function toMeters(n) {
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
        throw new RangeError(`Meters must be a non-negative finite number, received: ${n}`);
    }
    return (Math.round(n * 100) / 100);
}
export function isMeters(v) {
    return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}
// --- Minutes Helpers ---
export function toMinutes(n) {
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) {
        throw new RangeError(`Minutes must be a non-negative integer, received: ${n}`);
    }
    return n;
}
export function isMinutes(v) {
    return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}
// --- Percentage Helpers ---
export function toPercentage(n) {
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 100) {
        throw new RangeError(`Percentage must be a number between 0.00 and 100.00, received: ${n}`);
    }
    return (Math.round(n * 100) / 100);
}
export function isPercentage(v) {
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;
}
//# sourceMappingURL=units.js.map