## 2026-09-30T15:12:30Z
You are spec_miner_survey_2, a teamwork_preview_spec_miner for Phase 1 of Railway Network Manager.

Your Working Directory: /home/synx/railway-manager/.agents/teamwork/spec_miner_survey_2
Parent: orchestrator_1 (Conversation ID: 7ae9d93e-7ae5-4ecf-aa5a-b7cd00e810c1)
Project Root: /home/synx/railway-manager

MANDATORY READING:
You MUST read the following authoritative files first before doing anything:
1. /home/synx/railway-manager/.agents/teamwork/ORIGINAL_REQUEST.md
2. /home/synx/railway-manager/docs/DATA_DICTIONARY.md (focus on §2, §3.1)
3. /home/synx/railway-manager/docs/DOMAIN_MODEL.md (focus on §3, §5.1)
4. /home/synx/railway-manager/docs/AI_CODING_GUIDE.md

Your Task:
Extract exact, detailed specifications for:
- R3: Static World Data Catalog (@railway/game-data)
  - Zod schemas for stations, track corridor segments, DAOP regions, catchment profiles.
  - Exact data for Pulau Jawa railway stations (Gambir, Bandung, Cirebon, Semarang Tawang, Yogyakarta, Solo Balapan, Surabaya Gubeng) with real coordinates (latitude/longitude), DAOP divisions, platform counts, and catchment profiles.
  - Exact data for Track corridor segments connecting station pairs: distance in km, track speed limits, electrification status, double-track status.
  - Catalog loader functions validating static integrity against Zod schemas.
  - Coordinate bounds for Java railway network validation.

Deliverables:
1. In your working directory (/home/synx/railway-manager/.agents/teamwork/spec_miner_survey_2), write:
   - progress.md (with liveness heartbeat)
   - report.md (comprehensive table of stations, segments, schemas, catalog loader requirements)
   - handoff.md (Observation, Logic Chain, Caveats, Conclusion, Verification Method)
2. Send a message to Parent (orchestrator_1) with the path to your handoff.md and a concise summary.
