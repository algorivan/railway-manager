# Railway Manager

A browser-first, single-operator railway management prototype. The current app follows the uploaded core proposal's **internal v7 revision**, with the supplied vehicle illustration kit.

## Development

Use Node 24 (Node 20.19+ or 22.12+ also meets Vite's runtime requirements) and the repository-pinned pnpm 11.10.0.

```bash
cd /workspace/railway-manager
export COREPACK_HOME=/workspace/.cache/corepack
corepack pnpm install --frozen-lockfile --store-dir /workspace/.cache/pnpm/store
corepack pnpm build --concurrency=4
corepack pnpm --filter @railway/web dev
```

Build the domain packages before starting the web app; their exports resolve to `dist`. For a local checkout outside the cloud workspace, use writable cache paths appropriate to that machine.

```bash
corepack pnpm typecheck --concurrency=4
corepack pnpm test --concurrency=2
```

The app saves to browser storage. Use **Kantor → Ekspor save / Impor save** to move checkpoints between devices. Realism advances at 1× and Casual at 1.5×, including offline catch-up. No server or credentials are required. There are no real payments.

## First service

1. Choose a depot city and its contract cost, then a compatible first hub. Mission onboarding guides the remaining steps.
2. In Pasar, purchase the new CC201, four Economy Standard coaches and a generator separately. Accept each starter order; the starter vendor stock is already at the hub. Further orders have production lead times.
3. In Armada, drag the six units from inventory into the formation on the same page, then save the trainset. Identical available inventory products share a card with a multiplier; the formation shows every unit separately. Capacity is 424 EC seats.
4. Activate the crew contract. Buy fuel in Kantor, then fill the trainset's tanks in Armada. The reserve preset is provisional; review the actual diagram's consumption.
5. In Jadwal, create a reusable relation, choose the trainset, set the A→B and B→A departure clocks, or fill as many PP as fit. Choose “Setiap hari” (daily game time), edit selected timetable trips, then press “Simpan & aktifkan jadwal”. The daily recap lists each commercial station as Tujuan | Tiba | Berangkat. Saved timetables can be edited directly. Departure is automatic after readiness checks. Held departures require confirmation after recovery.
6. Review contribution, segment-weighted occupancy, fuel, maintenance and expansion choices after operations.

The shipped Java map has seven original hubs plus 178 OSM stations (185 selectable stations in total) with OpenStreetMap positions/codes across 17 game corridors, including Blitar, Malang, Probolinggo, Jember, Banyuwangi Kota and Ketapang. New relations can select these stations as endpoints or optional commercial stops. Station demand uses provisional catchment, development, work/education, tourism, interchange and rail-preference factors; station details explain these estimates. Official IPM is optional and remains neutral until sourced. Connections and allocated section distances remain explicitly schematic until full railway geometry is imported; national coverage is still incomplete. New train motion includes acceleration, braking and section caps; new browser games start with depot/hub setup and one unified mission onboarding with one-time XP/cash rewards. Main navigation floats vertically at the bottom right, with loading feedback for startup, menus, tiles and save imports. Relations use automatic endpoint-code names and bidirectional assignments; one scheduling form provides editable fixed-time PP, custom multi-relation timetables, saved-schedule editing and daily arrival/departure sheets. See [mapping and onboarding details](docs/OPERATING_MAP_AND_ONBOARDING.md). Basemap tiles require `tile.openstreetmap.org`; overlays and gameplay remain available without them.

See [implementation scope and balance](docs/CORE_V7_IMPLEMENTATION.md) for capabilities and limitations. The previous demo components remain in the repository as reference; `apps/web/src/main.tsx` now starts the v7 app.

Management opens beside the right-hand dock, leaving the left half of the desktop map visible; the left sidebar monitors travel only. The planning-first economy keeps the current clock, reduces capital/delivery costs, enlarges tanks and supports opt-in vendor refueling at large hubs. Kantor → Kontrak kargo offers one-time industry investments and paid deliveries. The rolling-stock shop uses category grids and a draft cart; Depo inventory is a selectable grid. Only detail containers scroll. Jadwal opens on Relasi, supports map station picking with passenger/active-contract cargo metrics and locked-route purchase guidance, and estimates daily fuel before saving. Travel forecasts use the [29 user-supplied speed sections](docs/SECTION_SPEED_LIMITS.md), rail distance, acceleration, braking and dwell. Mission onboarding uses concise visual steps. Quiet station ambience and a Westminster chime every 18 seconds start after interaction and share the Suara toggle. User-defined station classes and shortest-rail-distance hub proximity adjust demand. See [economy, contracts and station classes](docs/PLANNING_ECONOMY_AND_CONTRACTS.md) for current balance and future leaderboard rules.
