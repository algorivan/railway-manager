## 2026-09-30T15:12:30Z
[Message] timestamp=2026-09-30T15:12:30Z sender=7ae9d93e-7ae5-4ecf-aa5a-b7cd00e810c1 priority=MESSAGE_PRIORITY_HIGH content=You are spec_miner_survey_1, a teamwork_preview_spec_miner for Phase 1 of Railway Network Manager.

Your Working Directory: /home/synx/railway-manager/.agents/teamwork/spec_miner_survey_1
Parent: orchestrator_1 (Conversation ID: 7ae9d93e-7ae5-4ecf-aa5a-b7cd00e810c1)
Project Root: /home/synx/railway-manager

MANDATORY READING:
You MUST read the following authoritative files first before doing anything:
1. /home/synx/railway-manager/.agents/teamwork/ORIGINAL_REQUEST.md
2. /home/synx/railway-manager/docs/AI_CODING_GUIDE.md
3. /home/synx/railway-manager/docs/PRODUCT_PRD.md (focus on §13, §14, §30, §31, §37, §44)
4. /home/synx/railway-manager/docs/SIMULATION_RULES.md (focus on §2.3 PRNG, bit-for-bit test vector, seed 12345, Mulberry32)
5. Explore existing repository root /home/synx/railway-manager (check package.json, tsconfig, etc. if existing)

Your Task:
Extract exact, detailed specifications for:
- R1: Monorepo Scaffolding & Shared Tooling (pnpm monorepo structure, pnpm-workspace.yaml, turbo.json, tsconfig.base.json, Vitest configuration, workspace package naming rules per AI_CODING_GUIDE.md)
- R2: Core Shared Primitives & Seeded PRNG (@railway/shared)
  - Branded types: Money (integer Rupiah), Km, Kmh, Tons, Minutes, GameTimestamp.
  - Data provenance schema: DataProvenance (source, sourceDate, verified, notes).
  - Deterministic seeded PRNG (Mulberry32) algorithm details, interface, seed 12345 sequence / test vectors.
  - Standard Result/Error types and branded ID generator helpers.
  - Pure simulation rules (Zero React/Next.js/DOM imports).

Deliverables:
1. In your working directory (/home/synx/railway-manager/.agents/teamwork/spec_miner_survey_1), write:
   - progress.md (with liveness heartbeat)
   - report.md (detailed specifications, type definitions, algorithm math, test vectors, requirements breakdown)
   - handoff.md (Observation, Logic Chain, Caveats, Conclusion, Verification Method)
2. Send a message to Parent (orchestrator_1) with the path to your handoff.md and a concise summary.
