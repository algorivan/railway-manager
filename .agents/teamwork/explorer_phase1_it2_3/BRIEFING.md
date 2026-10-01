# BRIEFING — 2026-09-30T15:43:00Z

## Mission
Investigate how to integrate empirical stress tests from scripts/empirical-stress-suite.mjs (PRNG 5M step canonical matching, serialization round-trip) into packages/shared/test/prng.test.ts without causing CI timeout or performance issues, and formulate a clear test addition strategy for the worker.

## 🔒 My Identity
- Archetype: teamwork_preview_explorer
- Roles: explorer
- Working directory: /home/synx/railway-manager/.agents/teamwork/explorer_phase1_it2_3
- Original parent: orchestrator_1 (7ae9d93e-7ae5-4ecf-aa5a-b7cd00e810c1)
- Milestone: Phase 1 Iteration 2

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Analyze empirical stress tests integration into Vitest suite
- Recommend clear test addition strategy for the worker

## Current Parent
- Conversation ID: 7ae9d93e-7ae5-4ecf-aa5a-b7cd00e810c1
- Updated: 2026-09-30T15:43:00Z

## Investigation State
- **Explored paths**:
  - `scripts/empirical-stress-suite.mjs` (Section 1: PRNG stress tests, seed boundaries, 1M sequence determinism, Chi-Square uniformity, 5M step canonical divergence, serialization drift)
  - `packages/shared/test/prng.test.ts` (Current 6 baseline tests covering only 10 steps and step 2 checkpoint)
  - `packages/shared/src/prng/mulberry32.ts` (Unmasked `+= 0x6D2B79F5` causing float loss at step 4,917,758)
  - `packages/shared/test/units.test.ts` & `packages/shared/test/time.test.ts`
  - `packages/network/test/adversarial-domain.test.ts` & `packages/game-data/test/adversarial-catalog.test.ts`
  - Baseline execution time and resource consumption benchmarks for 5,000,000 PRNG iterations
- **Key findings**:
  1. 5,000,000 PRNG steps take only ~95ms in Node.js V8; the entire suite of 5 stress tests executes in ~213ms total.
  2. Testing 5M iterations inside Vitest requires avoiding per-iteration `expect()` calls (which allocate 5M Chai objects); using a fast primitive loop with break-on-mismatch provides O(1) memory overhead and instant error reporting (`{ mismatchStep: 4917758, actual: 2543212789, expected: 2345769536 }`).
  3. Setting a 15-second timeout on the 5M test prevents any false timeout failures on throttled CI runners.
  4. An independent canonical Mulberry32 oracle function embedded in the test ensures the implementation is verified against the pure specification rather than circular self-comparison.
  5. The proposed tests serve as strict Red-to-Green guards: they reliably fail on current code and pass once `mulberry32.ts` wraps state accumulation in `>>> 0`.
- **Unexplored areas**:
  - None within PRNG testing scope. Fully mapped and benchmarked.

## Key Decisions Made
- Formulate a 4-part modular test addition strategy for `packages/shared/test/prng.test.ts`:
  1. Boundary Seeds & Bitwise Normalization (negative, 2^32, safe integer limits, equivalence)
  2. Long-Sequence Determinism & Uniformity (1M steps twin determinism, Chi-Square goodness-of-fit)
  3. Canonical Mulberry32 Compliance & Float Boundary (5,000,000 steps with independent canonical oracle)
  4. Checkpoint Serialization & Restoration Round-Trip at Scale (5M steps getState/setState uint32 invariants, twin-stream equality, fork)
- Provide exact drop-in TypeScript test code for the worker.

## Artifact Index
- DISPATCH.md — Incoming task dispatch record
- BRIEFING.md — Persistent working memory
- progress.md — Liveness heartbeat and milestone tracker
- handoff.md — Final structured report
