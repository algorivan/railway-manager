# Progress Log — challenger_phase1_1

Last visited: 2026-09-30T15:38:00Z

## Status
Completed Phase 1 adversarial stress testing. Verdict: CHALLENGE_FOUND.

## Completed Tasks
- [x] Initialized DISPATCH.md, BRIEFING.md, and progress.md.
- [x] Verified baseline test suite across monorepo (15 test files, 84 tests passing).
- [x] Implemented independent empirical stress suite (`scripts/empirical-stress-suite.mjs`).
- [x] Executed PRNG stress testing:
  - Seed boundaries (0, 1, 0xFFFFFFFF, negative seeds, overflows): PASS.
  - Long sequence determinism (1,000,000 identical numbers): PASS.
  - Uniform distribution check (100,000 `nextInt(1, 10)` with Chi-Square test): PASS (Chi-Square: 6.9646 vs critical 21.67 at p=0.01).
- [x] Uncovered PRNG 32-bit state truncation and float overflow bug:
  - At step 4,917,758 (`this.state > Number.MAX_SAFE_INTEGER`), PRNG diverges from canonical Mulberry32.
  - State serialization drift on `getState()` -> `setState()` after step 4,917,758 due to float rounding.
- [x] Executed Arithmetic & Money precision stress tests:
  - Upper boundary: `toMoney(MAX_SAFE_INTEGER)` (9.007e15 IDR) accepted without precision loss.
  - Exceeding bounds: `toMoney(MAX_SAFE_INTEGER + 1)` strictly rejected with `RangeError`.
  - Negative money: `toMoney(MIN_SAFE_INTEGER)` accepted.
  - Decimal rejection: all fractional amounts strictly rejected with `TypeError`.
  - Non-finites: NaN, Infinity, -Infinity strictly rejected.
  - Addition and multiplication with rounding verified.
- [x] Executed TAC and Route Opening calculators stress tests:
  - Gambir - Bandung canonical reference vectors verified down to exact Rupiah.
  - Fractional tonnages and distances verified to produce exact integer Rupiah.
  - 0 km distance handled (0 IDR in TAC; rejected with `InvalidRouteOpeningError` in Route Opening).
  - 0 and 1 station count in Route Opening strictly rejected.
  - 0 and negative tonnage in TAC strictly rejected.
  - Extreme distances (50,000 km) and consist weights (5,000 tons) handled accurately.
- [x] Executed GameTimestamp invariant tests:
  - Minute wrap-around across midnight (tick 1439 Day 1 -> tick 1440 Day 2 -> tick 1441 Day 2) verified.
  - Negative minute handling and underflow rejection verified.
  - Subtraction across midnight (Day 2 00:00 - 1 = Day 1 23:59) verified.
  - Bidirectional diff across midnight verified (+10 and -10).
  - 100 simulated years verified.
- [x] Identified Node.js ESM packaging issue (missing `.js` extensions in `dist/index.js` exports).

## Deliverables Status
- `progress.md`: Updated
- `scripts/empirical-stress-suite.mjs`: Complete and verified
- `handoff.md`: Ready to write
