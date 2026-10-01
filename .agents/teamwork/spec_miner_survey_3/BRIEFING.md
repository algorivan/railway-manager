# BRIEFING — 2026-09-30T15:13:00Z

## Mission
Extract and document exact specifications for R4 (Network & Regulatory Domain Module) and R5 (Verification Test Vectors), including Station, Route, Depot entities, Regulatory Route Opening Cost, Track Access Charge (TAC), and Effective Speed Calculator.

## 🔒 My Identity
- Archetype: teamwork_preview_spec_miner
- Roles: Specification Miner
- Working directory: /home/synx/railway-manager/.agents/teamwork/spec_miner_survey_3
- Original parent: 7ae9d93e-7ae5-4ecf-aa5a-b7cd00e810c1
- Milestone: Phase 1 Specification Mining

## 🔒 Key Constraints
- Do NOT implement anything — read-only specification mining.
- Authoritative documentation is primary source; probe thoroughly.
- Follow 5-component handoff report protocol.
- Must document Station and Route entities and domain operations.
- Must extract Regulatory Route Opening Cost Calculator formula, constants, parameters, and Gambir-Bandung test vector (must equal 165,000,000 IDR).
- Must extract Track Access Charge (TAC) Calculator formula, constants, variables, boundary conditions.
- Must extract Effective Speed Calculator formula, units, boundary conditions, error handling.
- Must extract Depot entity physical capacity constraints (fleet_capacity, maintenance_slots).

## Current Parent
- Conversation ID: 7ae9d93e-7ae5-4ecf-aa5a-b7cd00e810c1
- Updated: 2026-09-30T15:13:00Z

## Task Summary
- **What to build**: Specification report (report.md) & handoff report (handoff.md) for R4 & R5.
- **Success criteria**: Complete mathematical formulas, exact constant values, boundary conditions, domain entity models, reference test vectors verified.
- **Interface contracts**: docs/DOMAIN_MODEL.md, docs/ECONOMY_RULES.md, docs/SIMULATION_RULES.md, docs/AI_CODING_GUIDE.md
- **Code layout**: packages/domain or packages/network

## Key Decisions Made
- Starting systematic review of the 5 mandatory files.

## Artifact Index
- DISPATCH.md — Initial dispatch instructions
- BRIEFING.md — Situational awareness and identity
- progress.md — Liveness heartbeat and task tracker
- report.md — Complete specification mining output
- handoff.md — 5-component handoff report
