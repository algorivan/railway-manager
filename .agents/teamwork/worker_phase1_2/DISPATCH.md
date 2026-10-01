## 2026-09-30T15:44:28Z
You are worker_phase1_2, a teamwork_preview_worker executing Phase 1 Iteration 2 remediation.

Working Directory: /home/synx/railway-manager/.agents/teamwork/worker_phase1_2
Project Root: /home/synx/railway-manager
Parent: orchestrator_1 (Conversation ID: 7ae9d93e-7ae5-4ecf-aa5a-b7cd00e810c1)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY READING:
1. /home/synx/railway-manager/.agents/teamwork/ORIGINAL_REQUEST.md
2. /home/synx/railway-manager/.agents/teamwork/orchestrator_1/PROJECT.md
3. /home/synx/railway-manager/.agents/teamwork/challenger_phase1_1/handoff.md
4. /home/synx/railway-manager/.agents/teamwork/explorer_phase1_it2_1/handoff.md (PRNG patch & analysis)
5. /home/synx/railway-manager/.agents/teamwork/explorer_phase1_it2_2/handoff.md (ESM resolution strategy)
6. /home/synx/railway-manager/.agents/teamwork/explorer_phase1_it2_3/handoff.md (Vitest test hardening)

Task Objectives:
1. Fix PRNG 32-bit state truncation in `packages/shared/src/prng/mulberry32.ts`:
   - In `nextUint32()`, accumulate state with 32-bit wrapping: `let t = (this.state = (this.state + 0x6D2B79F5) >>> 0);`
   - In `next()`, delegate cleanly: `return this.nextUint32() / 4294967296;`
   - In `getState()`, return `this.state >>> 0`.
   - Update `docs/SIMULATION_RULES.md` line 113 to keep documentation synchronized.
2. Fix ESM export resolution:
   - Follow `explorer_phase1_it2_2/handoff.md`:
     Ensure all relative imports and re-exports in TypeScript sources use explicit `.js` extensions (e.g. `export * from './brand.js'`) across `@railway/shared`, `@railway/game-data`, `@railway/network`.
     Configure tsconfigs with `"moduleResolution": "NodeNext"`, `"module": "NodeNext"` and package.json exports.
     Verify that pure Node.js can import `@railway/shared`, `@railway/game-data`, and `@railway/network` directly without module resolution errors.
3. Harden PRNG tests in `packages/shared/test/prng.test.ts`:
   - Add the 5,000,000-step canonical Mulberry32 bit-for-bit test.
   - Add state serialization and `fork()` invariance tests across the 4,917,758 float overflow boundary.
   - Add Chi-Square uniformity test.
4. Execute and verify:
   - `pnpm turbo build` (passes 100%)
   - `pnpm turbo typecheck` (passes 100% strict)
   - `pnpm turbo test` (all test suites pass 100%)
   - `node scripts/empirical-stress-suite.mjs` (must pass 100% with 0 challenges!)
   - Pure simulation isolation grep: zero imports of React, Next, or DOM APIs.

Deliverables:
In your working directory (/home/synx/railway-manager/.agents/teamwork/worker_phase1_2):
- progress.md (with liveness heartbeat)
- handoff.md with Observation, Logic Chain, Caveats, Conclusion, Verification Method.

Send a message to Parent (orchestrator_1) when complete.
