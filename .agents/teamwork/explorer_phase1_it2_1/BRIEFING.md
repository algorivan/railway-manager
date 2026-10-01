# BRIEFING — 2026-09-30T15:42:00Z

## Mission
Investigate Defect 1 in packages/shared/src/prng/mulberry32.ts (state overflow past MAX_SAFE_INTEGER and float precision loss breaking determinism/serialization) and recommend a robust, mathematically sound fix strategy.

## 🔒 My Identity
- Archetype: teamwork_preview_explorer
- Roles: explorer
- Working directory: /home/synx/railway-manager/.agents/teamwork/explorer_phase1_it2_1
- Original parent: 7ae9d93e-7ae5-4ecf-aa5a-b7cd00e810c1
- Milestone: Phase 1 Iteration 2

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT directly modify source code outside working directory

## Current Parent
- Conversation ID: 7ae9d93e-7ae5-4ecf-aa5a-b7cd00e810c1
- Updated: 2026-09-30T15:39:00Z

## Investigation State
- **Explored paths**:
  - `packages/shared/src/prng/mulberry32.ts`
  - `scripts/empirical-stress-suite.mjs`
  - `docs/SIMULATION_RULES.md` (§2.3)
  - `packages/shared/test/prng.test.ts`
- **Key findings**:
  - `this.state += 0x6D2B79F5` executes float64 addition. State breaches uint32 range at step 3 (`state > 2^32-1`), breaking `getState()` / `setState()` round-trip symmetry immediately.
  - At step 4,917,758, `this.state` exceeds `Number.MAX_SAFE_INTEGER` ($2^{53}-1$). IEEE-754 mantissa saturation drops bit 0, causing output divergence from canonical Mulberry32.
  - Serialization and `fork()` diverge because `setState` casts `>>> 0` while active PRNG retains float state.
  - Wrapping accumulation in `>>> 0` (`this.state = (this.state + 0x6D2B79F5) >>> 0`) is mathematically exact, maintains uint32 range for all $N$, eliminates divergence and checkpoint drift, and preserves all existing test vectors.
- **Unexplored areas**: None for Defect 1; implementation left to worker per role constraints.

## Key Decisions Made
- Formulated fix recommendation using `(this.state + 0x6D2B79F5) >>> 0`.
- Prepared `.patch` and `proposed_mulberry32.ts` artifacts for worker.
- Documented secondary synchronization need for `docs/SIMULATION_RULES.md` §2.3.

## Artifact Index
- /home/synx/railway-manager/.agents/teamwork/explorer_phase1_it2_1/DISPATCH.md — Initial dispatch message
- /home/synx/railway-manager/.agents/teamwork/explorer_phase1_it2_1/BRIEFING.md — Situational awareness and identity
- /home/synx/railway-manager/.agents/teamwork/explorer_phase1_it2_1/progress.md — Liveness heartbeat and milestone tracking
- /home/synx/railway-manager/.agents/teamwork/explorer_phase1_it2_1/handoff.md — 5-component handoff report
- /home/synx/railway-manager/.agents/teamwork/explorer_phase1_it2_1/mulberry32.patch — Unified diff patch for worker
- /home/synx/railway-manager/.agents/teamwork/explorer_phase1_it2_1/proposed_mulberry32.ts — Proposed replacement source file
