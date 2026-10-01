export interface DomainError {
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export type Result<T, E = DomainError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function isOk<T, E>(r: Result<T, E>): r is { readonly ok: true; readonly value: T } {
  return r.ok;
}

export function isErr<T, E>(r: Result<T, E>): r is { readonly ok: false; readonly error: E } {
  return !r.ok;
}

export function unwrap<T, E>(r: Result<T, E>): T {
  if (r.ok) {
    return r.value;
  }
  const errorObj = r.error as unknown;
  if (errorObj && typeof errorObj === 'object') {
    const code = (errorObj as { code?: string }).code ?? 'DOMAIN_ERROR';
    const message = (errorObj as { message?: string }).message ?? JSON.stringify(errorObj);
    throw new Error(`Failed to unwrap Result [${code}]: ${message}`);
  }
  throw new Error(`Failed to unwrap Result: ${String(r.error)}`);
}

export function unwrapOr<T, E>(r: Result<T, E>, fallback: T): T {
  return r.ok ? r.value : fallback;
}

export function mapResult<T, U, E>(r: Result<T, E>, fn: (val: T) => U): Result<U, E> {
  return r.ok ? ok(fn(r.value)) : r;
}

export function flatMapResult<T, U, E>(r: Result<T, E>, fn: (val: T) => Result<U, E>): Result<U, E> {
  return r.ok ? fn(r.value) : r;
}
