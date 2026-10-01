export function ok(value) {
    return { ok: true, value };
}
export function err(error) {
    return { ok: false, error };
}
export function isOk(r) {
    return r.ok;
}
export function isErr(r) {
    return !r.ok;
}
export function unwrap(r) {
    if (r.ok) {
        return r.value;
    }
    const errorObj = r.error;
    if (errorObj && typeof errorObj === 'object') {
        const code = errorObj.code ?? 'DOMAIN_ERROR';
        const message = errorObj.message ?? JSON.stringify(errorObj);
        throw new Error(`Failed to unwrap Result [${code}]: ${message}`);
    }
    throw new Error(`Failed to unwrap Result: ${String(r.error)}`);
}
export function unwrapOr(r, fallback) {
    return r.ok ? r.value : fallback;
}
export function mapResult(r, fn) {
    return r.ok ? ok(fn(r.value)) : r;
}
export function flatMapResult(r, fn) {
    return r.ok ? fn(r.value) : r;
}
//# sourceMappingURL=result.js.map