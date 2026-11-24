# Jalur Kepercayaan — scenario campaign

The mobile management game now has an authored first season: five chapters,
two approaches per chapter, recurring staff characters, operation-derived goals,
conditional callbacks to earlier decisions, and a persistent decision journal.
Choices branch within a chapter and rejoin the next briefing. There are 32
structural choice routes through five chapters, not 32 separate chapters.

## Player experience

The player operates a small company from their chosen hub. Ratih is the planner,
Damar the depot lead, and Sari the station coordinator. They present proposals
and react to recorded decisions. They are fictional supporting characters, not
other railway operators or traffic on the network.

The loop is **situation → choose an approach → plan actual operations → observe
results → read the consequence → continue the story**. Campaign targets do not
replace the existing dispatch, fuel, crew, location, turnaround, or access rules.

| Chapter | Intended experience | Approaches |
| --- | --- | --- |
| Peluit pertama | Learn a legal first service with operational preparation | One completed passenger run with depot reserves, or two completed runs |
| Tiket untuk pulang | Develop location and scheduling knowledge | One physical return pair, or completed services on two relations |
| Catatan kepala depo | A planning breather and an investment choice | Depot fuel buffer, or a healthy unassigned spare locomotive; both require a new run |
| Suara dari peron | Apply what was learned to service priorities | Three commercial stations served, or three punctual runs |
| Rapat menjelang pagi | Reflect, then combine systems | Three positive-contribution runs, or two trainsets serving two relations |

Each briefing can be read without a countdown. The final briefing supplies a
rest before the season's combined objective. Intensity values in the content
are intended pacing metadata, not measured difficulty or a dynamic difficulty
system. No hidden demand boosts, forced breakdowns, or surprise penalties were
introduced to make the fiction true.

## Choice and recovery

- The initial choice starts the run-evidence window. Historical runs and runs
  already in progress are excluded.
- An active approach can be revised. Revision keeps the original time anchor
  and excluded-run baseline; it does not restart the chapter or create a reward.
- Completed decisions are final, read by subsequent character callbacks, and
  included in the journal. Rewards cannot be changed after settlement.
- Resources and trip goals must be met together. A completed goal snapshot is
  frozen for the journal even if stock changes afterward.
- Completing a chapter does not silently consume the next chapter during an
  offline session. The player reads the consequence and explicitly continues.
- There is no new real-time login deadline. The established Realism/Casual pace
  and offline progression remain in effect.

## Integration map

| Contract | Implementation |
| --- | --- |
| Engine | Existing TypeScript simulation and React 19/Vite 8 app; no engine migration |
| Authored content | `packages/game-data/src/catalog/story-campaign.ts` |
| Narrative graph validation | `packages/game-data/src/catalog/story-validation.ts` |
| Commands | `startStory`, `storyChoice`, `storyReplan`, `continueStory` through `applyCoreAction` |
| Objectives and memory | `storyMetrics`, `coreStoryStatus`, `coreStoryCallbacks` in `story-campaign.ts` |
| Ownership | Commands and catch-up mutate only the simulation's cloned state |
| Time | Game minutes; settlement at event boundaries, including offline catch-up |
| UI | `StoryCampaign.tsx`; Campaign and operational guidance share the existing management dialog |
| Persistence | Optional versioned `CoreState.story`, validated by `restoreCore`; old saves opt in |
| Localization | Stable authored line IDs and Indonesian string table; explicit fallback for other locales |

New companies start at the first briefing after depot/hub setup. Existing
companies can start the campaign with current assets. Operational onboarding
remains accessible, and the first active scenario links to its next preparation
task so a new player is not sent to schedule a nonexistent trainset.

## Accounting and evidence

Only newly started passenger runs with actual passenger-km, normal completion,
and no cargo-contract/recall flag count. Return pairs must share the trainset
and relation and have compatible endpoints and temporal order. Non-commercial
pass-through stations are excluded. Punctual means at most 10 game minutes of
recorded delay for this scenario. Positive contribution means run revenue exceeds
recorded run cost, not company profit after overhead.

Chapter funding is a one-time fictional grant, recorded as `story:<chapter>:reward`
with zero operating revenue and expense. Story XP is derived from completed
choices and added to the level display separately from onboarding XP. Import
validation checks chapter order, choices, snapshots and matching ledger grants.
Client-side saves remain local single-player data, not a trusted competitive record.

All targets, grants and pacing are provisional balance values. The 8,000-liter
goal is an authored scenario target, not a claim about a universal reserve horizon.

## Applied game-development skills

The user requested guidance from
[awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills).
The router identified the existing custom engine and the relevant cross-engine
disciplines. The skill bodies and selected references were read directly;
no engine framework, skill package, or unrelated plugin was installed.

- [dialogue-systems](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/dialogue-systems/SKILL.md):
  data-driven nodes and exits, stable line IDs, one saved variable store,
  guarded transitions, callbacks to recorded choices, and graph validation.
- [level-design](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/level-design/SKILL.md):
  teach/develop/twist/test pacing, a reflection beat before the finale,
  explicit progression gates, and a recovery route through replanning.
  Spatial jump/blockout examples were not imported into this management game.
- [game-ui-ux](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/game-ui-ux/SKILL.md):
  responsive containers, readable story text, touch targets, focus on changed
  story scenes, and reuse of the existing modal focus boundary.

## Validation and playtest boundary

Automated checks cover all 32 structural graph routes, missing exits and invalid
narrative memory references, line lookup, command idempotency, approach revision,
goal evidence, all five chapter transitions, reward accounting, legacy saves,
corrupt imports, and online/offline event-time equivalence. A real simulated
passenger trip exercises the full engine-to-campaign settlement path.

These checks do not establish that all 32 paths have been playtested for fun,
economic feasibility from every player state, or mobile visual quality. A useful
first playtest asks: can the player explain their choice, find the next operation,
understand a blocked goal, recover by revising the approach, and identify a later
line that remembered an earlier decision? Measure active planning time separately
from real-time travel. Do not change the approved clock merely to shorten a test.
