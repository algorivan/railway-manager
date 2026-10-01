import { describe, expect, it } from 'vitest';
import {
  err,
  flatMapResult,
  isErr,
  isOk,
  mapResult,
  ok,
  unwrap,
  unwrapOr,
} from '../src/result/result.js';

describe('Result and DomainError', () => {
  it('handles ok and isOk', () => {
    const res = ok(42);
    expect(res.ok).toBe(true);
    expect(isOk(res)).toBe(true);
    expect(isErr(res)).toBe(false);
    expect(unwrap(res)).toBe(42);
  });

  it('handles err and isErr', () => {
    const res = err({ code: 'INVALID_SPEED', message: 'Speed exceeds track limit' });
    expect(res.ok).toBe(false);
    expect(isErr(res)).toBe(true);
    expect(isOk(res)).toBe(false);
    expect(unwrapOr(res, 0)).toBe(0);

    expect(() => unwrap(res)).toThrow('Failed to unwrap Result [INVALID_SPEED]: Speed exceeds track limit');
  });

  it('supports mapResult and flatMapResult transformations', () => {
    const res = ok(10);
    const doubled = mapResult(res, (x) => x * 2);
    expect(unwrap(doubled)).toBe(20);

    const chained = flatMapResult(doubled, (x) => ok(`Value is ${x}`));
    expect(unwrap(chained)).toBe('Value is 20');

    const failed = flatMapResult(doubled, () => err({ code: 'ERR', message: 'fail' }));
    expect(isErr(failed)).toBe(true);
  });
});
