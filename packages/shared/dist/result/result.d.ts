export interface DomainError {
    readonly code: string;
    readonly message: string;
    readonly details?: Readonly<Record<string, unknown>>;
}
export type Result<T, E = DomainError> = {
    readonly ok: true;
    readonly value: T;
} | {
    readonly ok: false;
    readonly error: E;
};
export declare function ok<T>(value: T): Result<T, never>;
export declare function err<E>(error: E): Result<never, E>;
export declare function isOk<T, E>(r: Result<T, E>): r is {
    readonly ok: true;
    readonly value: T;
};
export declare function isErr<T, E>(r: Result<T, E>): r is {
    readonly ok: false;
    readonly error: E;
};
export declare function unwrap<T, E>(r: Result<T, E>): T;
export declare function unwrapOr<T, E>(r: Result<T, E>, fallback: T): T;
export declare function mapResult<T, U, E>(r: Result<T, E>, fn: (val: T) => U): Result<U, E>;
export declare function flatMapResult<T, U, E>(r: Result<T, E>, fn: (val: T) => Result<U, E>): Result<U, E>;
//# sourceMappingURL=result.d.ts.map