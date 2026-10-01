# Original User Request

## 2026-09-30T15:10:25Z

Build Phase 1 (World & Regulatory Model) of the Railway Network Manager simulation game in the existing repository according to the specifications in docs/. Scaffold the pnpm monorepo, implement foundational domain packages (@railway/shared, @railway/game-data, @railway/network), and verify all domain invariants with deterministic Vitest test suites.

Working directory: /home/synx/railway-manager  
Integrity mode: development  

---

## Reference Material
- High-level PRD: docs/PRODUCT_PRD.md (§13, §14, §30, §31, §37, §44)
- Domain Contracts: docs/DOMAIN_MODEL.md (§3, §5.1)
- Speed & Kinematic Rules: docs/SIMULATION_RULES.md (§3)
- Tariffs & Opening Fees: docs/ECONOMY_RULES.md (§4.1, §5.3)
- Data Schemas: docs/DATA_DICTIONARY.md (§2, §3.1)
- Coding Rules: docs/AI_CODING_GUIDE.md

---

## Requirements

### R1. Monorepo Scaffolding & Shared Tooling
Initialize the pnpm monorepo structure in /home/synx/railway-manager with pnpm-workspace.yaml, root package.json, turbo.json, and shared TypeScript configuration (tsconfig.base.json). Configure Turborepo for caching build, typecheck, and test pipelines.

### R2. Core Shared Primitives & Seeded PRNG (@railway/shared)
Implement @railway/shared exporting:
- Branded types: Money (integer Rupiah), Km, Kmh, Tons, Minutes, GameTimestamp.
- Data provenance schema: DataProvenance (source, sourceDate, verified, notes).
- Deterministic seeded PRNG (Mulberry32) implementation satisfying docs/SIMULATION_RULES.md §2.3.
- Standard Result/Error types and branded ID generator helpers.

### R3. Static World Data Catalog (@railway/game-data)
Implement @railway/game-data exporting static configuration and catalogs with Zod schema validation:
- Pulau Jawa railway stations (Gambir, Bandung, Cirebon, Semarang Tawang, Yogyakarta, Solo Balapan, Surabaya Gubeng) with real coordinates, DAOP divisions, platform counts, and catchment profiles.
- Track corridor segments connecting station pairs with distance in km, track speed limits, and electrification/double-track status.
- Catalog loader functions validating static integrity against schemas.

### R4. Network & Regulatory Domain Module (@railway/network or @railway/domain)
Implement the World & Regulatory domain logic:
- Station and Route entities and domain operations.
- Regulatory Route Opening Cost Calculator implementing the exact formula from docs/ECONOMY_RULES.md §5.3:
  Cost = BaseRegulatoryFee + (StationCount * PrepCostPerStation) + (D_km * CorridorLicensingPerKm)
- Track Access Charge (TAC) Calculator implementing docs/ECONOMY_RULES.md §4.1.
- Effective Speed Calculator implementing the modular constraint formula from docs/SIMULATION_RULES.md §3.1:
  V_eff = min(V_train_max, V_consist_limit, V_track_limit, V_restriction)
- Initial Depot entity with physical capacity constraints (fleet_capacity, maintenance_slots).

### R5. Objective Verification & Test Suites
Implement comprehensive, deterministic unit test suites using Vitest in all packages. Verify:
- PRNG determinism across repeated executions with identical seeds.
- Exact arithmetic for route opening fees and TAC charges against the reference test vectors in docs/ECONOMY_RULES.md.
- Speed constraint boundary evaluations across mixed limits.
- Station catalog schema validation and coordinate bounds for Java.

---

## Acceptance Criteria

### Monorepo & Tooling
- [ ] pnpm install succeeds without dependency conflicts.
- [ ] pnpm turbo build completes successfully across all workspace packages.
- [ ] pnpm turbo typecheck passes with zero TypeScript errors under strict mode.

### Domain Integrity & Physics
- [ ] Speed constraint calculator accurately resolves the minimum constraint across all test vectors.
- [ ] Route opening fee matches reference calculation for Gambir – Bandung (165,000,000 IDR) down to the exact Rupiah.
- [ ] Seeded PRNG produces bit-for-bit identical pseudo-random sequences given seed 12345.
- [ ] Simulation code in all domain packages contains zero imports of React, Next.js, or DOM APIs.

### Test Coverage
- [ ] pnpm turbo test executes all Vitest suites and 100% of tests pass.
- [ ] All public domain functions and Zod schemas have test coverage.
