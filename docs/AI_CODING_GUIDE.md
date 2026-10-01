# Railway Network Manager — AI Vibe-Coding Operational Guide
**Document Version:** 1.0.0  
**Status:** Approved Reference / AI Engineering Protocol  
**Source PRD:** [PRODUCT_PRD.md](file:///home/synx/railway-manager/docs/PRODUCT_PRD.md) (§37, §38, §39, §40, §41, §51, §52, §53)  
**Parent Contract:** [DOMAIN_MODEL.md](file:///home/synx/railway-manager/docs/DOMAIN_MODEL.md)  
**Target Audience:** AI Engineering Models (Antigravity) and Lead Human Developers  

---

## 1. Executive Summary & Core Mindset

This guide is the **practical operational manual** for writing production code in the *Railway Network Manager* monorepo.

When coding in this repository, the AI model is not an unconstrained creative writer. The AI acts as an **expert, disciplined systems engineer** adhering to:
1. **Simulation-Centric Architecture:** All game logic originates in pure domain packages. The UI is simply a visualization of state.
2. **Determinism as a Religion:** Given the same initial state, player inputs, and random seed, the simulation must produce identical results down to the individual passenger and Rupiah.
3. **Strict Blast Radius Control:** Every code modification must be surgical and bounded.

---

## 2. The Six Invariant Coding Laws (Detailed Guide)

### Law 1: Never Build Monoliths in a Single Prompt (PRD §37.1)
* ❌ **Bad Prompt:** *"Build the railway game including fleet, map, simulation, and buying trains."*
* ✅ **Good Prompt:** *"Implement the `RollingStockUnit` condition decay calculation inside `packages/fleet` according to the formula in `docs/SIMULATION_RULES.md` §6.1. Do not modify API or UI."*
* **Rule for AI:** If a task spans multiple bounded contexts, break it down and request execution permission for one package at a time.

---

### Law 2: Inspect Documentation Before Generation (PRD §37.2)
Before generating or modifying any code, the AI must explicitly read the authoritative specifications in `docs/`:

```
┌────────────────────────────────────────────────────────┐
│                      docs/                             │
├────────────────────────────────────────────────────────┤
│ • PRODUCT_PRD.md      : High-level requirements        │
│ • DOMAIN_MODEL.md     : Entities & architectural types │
│ • SIMULATION_RULES.md : Mathematical equations         │
│ • ECONOMY_RULES.md    : Tariffs, CAPEX, OPEX           │
│ • DATA_DICTIONARY.md  : Schema & catalog structures    │
│ • API_SPEC.md         : REST & WebSocket contracts     │
│ • MISSION_DESIGN.md   : Stages & objectives            │
│ • UI_SPEC.md          : Presentation & UX              │
└────────────────────────────────────────────────────────┘
```

---

### Law 3: Smallest Possible Scope & Zero Gratuitous Refactoring (PRD §37.3)
* Never rename existing functions, change directory layouts, or "clean up" unrelated files during a task.
* Preserve all existing comments, docstrings, and type definitions unless explicitly instructed.

---

### Law 4: Never Invent Game Rules (PRD §37.4)
If you encounter a missing formula, undefined constraint, or business ambiguity:
```
       ┌───────────────────────────┐
       │   STOP IMMEDIATELY        │
       └─────────────┬─────────────┘
                     │
                     ▼
       ┌───────────────────────────┐
       │ Identify the exact gap    │
       └─────────────┬─────────────┘
                     │
                     ▼
       ┌───────────────────────────┐
       │ Propose 2-3 design options│
       └─────────────┬─────────────┘
                     │
                     ▼
       ┌───────────────────────────┐
       │ Wait for human approval   │
       └───────────────────────────┘
```
**Never silently make up a formula or business mechanic.**

---

### Law 5: Tests Before Large Refactors (PRD §37.5)
Every simulation rule, state transition, and invariant must have accompanying Vitest unit tests verifying edge cases:
* Test zero and boundary conditions (e.g., $0\text{ km/h}$, $100\%$ load factor, empty consist).
* Test PRNG determinism with fixed seeds.
* Test double-entry ledger balance conservation.

---

### Law 6: Keep Game Balance in Data (PRD §37.6)
* ❌ **Prohibited:**
  ```typescript
  const ticketFare = 75000;
  const maxSpeed = 120;
  ```
* ✅ **Mandatory:**
  ```typescript
  const ticketFare = config.fares.economy.basePrice;
  const maxSpeed = spec.maximumSpeedKmh;
  ```
All numbers subject to balance tuning belong in `@railway/game-data`.

---

## 3. Standard AI Prompting Protocol (PRD §38)

When preparing or executing tasks, adhere to the standard 9-point contract structure:

```text
CONTEXT:
We are developing the fleet management system in Railway Network Manager.

TASK:
Implement the train consist composition validator.

SOURCE OF TRUTH:
docs/DOMAIN_MODEL.md (§5.2.2)
docs/SIMULATION_RULES.md (§3.1)

SCOPE:
packages/fleet/src/composition-validator.ts
packages/fleet/tests/composition-validator.spec.ts

CONSTRAINTS:
- Pure TypeScript, 0 external runtime dependencies.
- Enforce: at least 1 Locomotive required.
- Enforce: AC carriages require a Generator Car or HEP loco.
- Total length must not exceed maximum platform constraint.

EXPECTED FILES:
- packages/fleet/src/composition-validator.ts (create)
- packages/fleet/tests/composition-validator.spec.ts (create)

ACCEPTANCE CRITERIA:
- Valid compositions return { valid: true }.
- Invalid compositions return detailed error codes.
- 100% test coverage for invariant violations.

TEST REQUIREMENTS:
Vitest test suite covering: missing loco, missing power car, platform overflow.

NON-GOALS:
- No UI components.
- No database persistence.
```

---

## 4. Architectural Guardrails & Forbidden Imports

To maintain clean architecture (PRD §33):

| Package | May Import From | STRICTLY FORBIDDEN to Import From |
| :--- | :--- | :--- |
| `packages/simulation` | `@railway/game-data`, `@railway/shared` | `react`, `next`, `expo`, `drizzle-orm`, `@nestjs/*`, `fetch`, `window` |
| `packages/fleet` | `@railway/shared`, `@railway/game-data` | `apps/*`, database drivers |
| `packages/economy` | `@railway/shared`, `@railway/game-data` | `apps/*`, presentation components |
| `apps/web` | `packages/*`, `@railway/shared` | Native Node.js modules (`fs`, `net`) |
| `apps/api` | `packages/*`, `drizzle-orm`, NestJS | `apps/web`, `apps/mobile`, React |

---

## 5. Standard Monorepo Tooling & Commands

```bash
# Install all dependencies across monorepo
pnpm install

# Run all deterministic test suites
pnpm turbo test

# Run TypeScript typechecks across all packages
pnpm turbo typecheck

# Start local development environment (Web + API)
pnpm dev

# Generate Drizzle database migrations from schema
pnpm --filter @railway/api db:generate

# Apply database migrations to local PostgreSQL
pnpm --filter @railway/api db:migrate
```

---

## 6. Pre-Commit / Pre-Completion Verification Checklist

Before marking any coding task complete, verify:
- [ ] Code compiles cleanly with `pnpm turbo typecheck`.
- [ ] All unit tests pass with `pnpm turbo test`.
- [ ] No `Math.random()` used in `packages/simulation` (seeded PRNG only).
- [ ] No React imports inside domain packages.
- [ ] No hardcoded tariffs, speeds, or currencies.
- [ ] Real-world Indonesian data has verified provenance stamped.
