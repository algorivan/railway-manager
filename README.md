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

1. Choose a hub before the first purchase. The default is Bandung.
2. In Pasar, purchase the new CC201, four Economy Standard coaches and a generator separately. Accept each starter order; the starter vendor stock is already at the hub. Further orders have production lead times.
3. In Armada, create a trainset with all six units. Capacity is 424 EC seats.
4. Activate the crew contract. Buy fuel in Kantor, then fill the trainset's tanks in Armada. The reserve preset is provisional; review the actual diagram's consumption.
5. In Jadwal, create a reusable service, choose the trainset and service, preview one round trip, and activate a legal 24/48/72-hour diagram. Departure is automatic after readiness checks. Held departures require confirmation after recovery.
6. Review contribution, segment-weighted occupancy, fuel, maintenance and expansion choices after operations.

The shipped Java map has seven original hubs plus 178 OSM stations (185 selectable stations in total) with OpenStreetMap positions/codes across 17 game corridors, including Blitar, Malang, Probolinggo, Jember, Banyuwangi Kota and Ketapang. New relations can select these stations as endpoints or optional commercial stops. Station demand uses provisional catchment, development, work/education, tourism, interchange and rail-preference factors; station details explain these estimates. Official IPM is optional and remains neutral until sourced. Connections and allocated section distances remain explicitly schematic until full railway geometry is imported; national coverage is still incomplete. New train motion includes acceleration, braking and section caps; new browser games start with depot/hub setup and one unified mission onboarding with one-time XP/cash rewards. Main navigation floats vertically at the bottom right, with loading feedback for startup, menus, tiles and save imports. Relations use automatic endpoint-code names and bidirectional assignments; the interactive timetable shows journey/turnaround blocks and validates saved multi-service patterns. See [mapping and onboarding details](docs/OPERATING_MAP_AND_ONBOARDING.md). Basemap tiles require `tile.openstreetmap.org`; overlays and gameplay remain available without them.

See [implementation scope and balance](docs/CORE_V7_IMPLEMENTATION.md) for capabilities and limitations. The previous demo components remain in the repository as reference; `apps/web/src/main.tsx` now starts the v7 app.
