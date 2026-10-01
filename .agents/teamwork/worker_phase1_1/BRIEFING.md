# BRIEFING — 2026-09-30T15:30:00Z

## Mission
Implement Phase 1 (World & Regulatory Model) of the Railway Network Manager simulation game: Monorepo Scaffolding, Core Shared Primitives (@railway/shared), Static World Data Catalog (@railway/game-data), and Network & Regulatory Domain Module (@railway/network) with 100% tests and typecheck passing.

## 🔒 My Identity
- Archetype: worker_phase1_1
- Roles: implementer, qa, specialist
- Working directory: /home/synx/railway-manager/.agents/teamwork/worker_phase1_1
- Original parent: 7ae9d93e-7ae5-4ecf-aa5a-b7cd00e810c1 (orchestrator_1)
- Milestone: Phase 1 (World & Regulatory Model)

## 🔒 Key Constraints
- DO NOT CHEAT: Genuine implementation, real state and logic, no hardcoded test shortcuts.
- ZERO imports of React, Next, Expo, or DOM APIs in simulation/domain packages. Pure TypeScript / Node.
- Mulberry32 PRNG must strictly match seed 12345 vectors: uint32[0] = 4207900869, float[0] = 0.9797282677609473.
- Money is safe integer IDR (zero decimals).
- Gambir - Bandung corridor distance = 160.0 km.
- Yogyakarta - Solo Balapan isElectrified = true (all others false).
- Route opening cost Gambir - Bandung (5 stations, 160 km) = 165,000,000 IDR.
- TAC Gambir - Bandung (160 km, 350 tons) = 6,800,000 IDR.
- Effective Speed: min(V_train_max, V_consist_limit, V_track_limit, V_restriction).
- Only write metadata to .agents/teamwork/worker_phase1_1; write source/tests to packages/* and monorepo root.

## Current Parent
- Conversation ID: 7ae9d93e-7ae5-4ecf-aa5a-b7cd00e810c1
- Updated: 2026-09-30T15:30:00Z

## Task Summary
- **What to build**: Monorepo scaffolding (pnpm + turbo + tsconfig + vitest), @railway/shared primitives, @railway/game-data authoritative catalog & loader, @railway/network regulatory calculators and domain entities.
- **Success criteria**: pnpm install cleanly, turbo build/typecheck/test 100% passing, strict isolation verified.
- **Interface contracts**: /home/synx/railway-manager/.agents/teamwork/orchestrator_1/PROJECT.md
- **Code layout**: /home/synx/railway-manager/.agents/teamwork/orchestrator_1/PROJECT.md § Code Layout

## Key Decisions Made
- Used `moduleResolution: bundler` with `target: ES2022` and separate `tsconfig.test.json` to allow clean rootDir `src` build outputs without test pollution and strict monorepo-wide typechecking.
- Approved `esbuild` build script via `.npmrc` (`only-built-dependencies=esbuild`) for pnpm 11 compatibility.
- Implemented Mulberry32 algorithm matching bit-for-bit with authoritative test vectors.
- Configured TrackCorridorSegmentSchema with bidirectional query and O(1) indices in `WorldDataCatalogLoader`.
- Validated route opening fee (165,000,000 IDR) and TAC (6,800,000 IDR) with exact integer arithmetic.

## Artifact Index
- DISPATCH.md — Assignment instructions
- progress.md — Liveness heartbeat and step tracking
- handoff.md — 5-component completion report

## Change Tracker
- **Files modified**:
  - `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `vitest.workspace.ts`, `vitest.config.ts`, `.npmrc`
  - `packages/shared/**/*` (primitives, Mulberry32 PRNG, time, result, provenance, branded ids, 6 unit test suites)
  - `packages/game-data/**/*` (Zod schemas, 7 Java stations, 9 track segments, catalog loader, 4 unit test suites)
  - `packages/network/**/*` (route opening cost, TAC, effective speed, station/route/depot entities, 5 unit test suites)
- **Build status**: 100% PASS (turbo build & typecheck)
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS (15 test suites, 84 tests passing)
- **Lint status**: 0 violations (strict TypeScript compiler checks passing with zero errors)
- **Tests added/modified**: 15 test files, 84 comprehensive unit tests

## Loaded Skills
- None specified in dispatch prompt
