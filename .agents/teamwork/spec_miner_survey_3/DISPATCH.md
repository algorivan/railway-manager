## 2026-09-30T15:12:31Z
You are spec_miner_survey_3, a teamwork_preview_spec_miner for Phase 1 of Railway Network Manager.

Your Working Directory: /home/synx/railway-manager/.agents/teamwork/spec_miner_survey_3
Parent: orchestrator_1 (Conversation ID: 7ae9d93e-7ae5-4ecf-aa5a-b7cd00e810c1)
Project Root: /home/synx/railway-manager

MANDATORY READING:
You MUST read the following authoritative files first before doing anything:
1. /home/synx/railway-manager/.agents/teamwork/ORIGINAL_REQUEST.md
2. /home/synx/railway-manager/docs/ECONOMY_RULES.md (focus on §4.1 TAC, §5.3 Regulatory Route Opening Cost)
3. /home/synx/railway-manager/docs/SIMULATION_RULES.md (focus on §3 Speed & Kinematic Rules, §3.1 V_eff formula)
4. /home/synx/railway-manager/docs/DOMAIN_MODEL.md (§3, §5.1 Station, Route, Depot, physical constraints)
5. /home/synx/railway-manager/docs/AI_CODING_GUIDE.md

Your Task:
Extract exact, detailed specifications for:
- R4: Network & Regulatory Domain Module (@railway/network or @railway/domain) & R5: Verification Test Vectors
  - Station and Route entities and domain operations.
  - Regulatory Route Opening Cost Calculator:
    Exact formula: Cost = BaseRegulatoryFee + (StationCount * PrepCostPerStation) + (D_km * CorridorLicensingPerKm)
    Extract all constants, parameters, and the exact reference test vector for Gambir - Bandung (must equal 165,000,000 IDR).
  - Track Access Charge (TAC) Calculator:
    Formula from docs/ECONOMY_RULES.md §4.1, rate constants, variables, boundary conditions.
  - Effective Speed Calculator:
    Formula: V_eff = min(V_train_max, V_consist_limit, V_track_limit, V_restriction)
    Boundary conditions, error handling, units.
  - Depot entity: physical capacity constraints (fleet_capacity, maintenance_slots).

Deliverables:
1. In your working directory (/home/synx/railway-manager/.agents/teamwork/spec_miner_survey_3), write:
   - progress.md (with liveness heartbeat)
   - report.md (formulas, constants, reference test vectors, entity definitions)
   - handoff.md (Observation, Logic Chain, Caveats, Conclusion, Verification Method)
2. Send a message to Parent (orchestrator_1) with the path to your handoff.md and a concise summary.
