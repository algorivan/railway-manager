# Operating map, motion and company onboarding

The supplied pasted HTML contains a rendered Leaflet map, tiles and SVG paths. Its SVG coordinates are screen pixels, not a geographic dataset; the source JavaScript and coordinate arrays are absent. The game already used Leaflet but connected seven stations with straight lines. This change separates actual source geometry from schematic fallback and never presents station-only interpolation as a surveyed railway alignment.

## Data pipeline

`packages/game-data/src/catalog/operating-network.ts` combines the unchanged legacy catalog with an OSM snapshot. The original seven station IDs and nine corridor IDs remain available for saved services and active runs. New routing uses imported physical edges when a legacy corridor has a connected OSM path. Existing corridor rights extend to that corridor's detailed edges; occupancy remains conservative for overlapping legacy/detail services. Branches and line ends are topology nodes, not selectable passenger stations. Starter rights continue through junctions to adjacent passenger stations to avoid trapping a new hub before expansion is available.

`python3 scripts/import-osm-network.py /tmp/indonesia-rail.json --download` queries Indonesia's OSM area for railway lines and named station/halt nodes/ways. Run it after building game-data. It writes the generated TypeScript catalog only after the response has parsed and validated; raw JSON remains outside Git. It is an explicit maintenance step, never a live browser or Vercel-build dependency. Offline use accepts a previously downloaded Overpass JSON file without `--download`.

The importer:

- Excludes known incompatible gauges, non-rail modes and tagged yard/siding/industrial lines.
- Snaps station coordinates to nearby compatible railway geometry within 500 metres; unconnected stations remain listed but disabled for service endpoints.
- Preserves OSM points between stops/branches. Adding small stations alone does not reproduce rail curvature.
- Keeps source way IDs, OSM IDs and snapshot time. Skeleton-node duplication cannot erase station names.
- Retains legacy station identities when a nearby OSM station is available, records mapped legacy corridor paths, and prevents access inheritance onto unrelated branches.
- Uses explicit numeric `maxspeed` and `incline` tags where available. Missing limits use the labelled 60 km/h game default; missing gradients remain unknown. A tagged grade is a conservative section approximation, not a complete terrain survey.

OpenStreetMap is a community geographic source, not official Gapeka or KAI station-class data. Relation-only stations without usable geometry, stations not tagged in OSM, incompatible networks and unresolved topology require further curation. New platform length (180 m), catchment demand (1,000/day), speed fallback and conservative occupancy are provisional game rules. Station class is not invented from marker size or platform counts. Full national coverage cannot be claimed from the importer or a small fixture test alone.

**Current data status:** the national snapshot is not imported. `osm-network-data.ts` is explicitly empty and maps label the seven-station fallback as schematic. Access to `overpass-api.de` was denied by the cloud network allowlist; a domain addition was saved as a draft but is not active. Once it is applied, download/import, review mapped paths and disconnected stations, build, test and publish the generated snapshot. No national data was fabricated to bypass this blocker.

OSM-derived data is attributed to OpenStreetMap contributors under ODbL 1.0. Keep this attribution with redistributed snapshots and comply with ODbL requirements. See <https://www.openstreetmap.org/copyright>.

## Train movement

`train-motion.ts` builds an acceleration/cruise/braking profile for each physical section. Entry/exit speeds are constrained across sections; commercial stops reach zero, pass-through nodes retain speed, and an upcoming lower limit constrains the preceding section's exit. Short sections use a triangular profile without ever reaching the maximum. Traction acceleration scales with formation mass; explicit grade adjusts acceleration/braking. The provisional starter reference is 268 tonnes, 0.35 m/s² acceleration and 0.55 m/s² braking.

The same profile sets forecast/event duration, reported speed and distance fraction along map geometry. Default commercial dwell remains three game minutes. Return legs reverse the source grade. Signals/block waits and resuming after a stop restart the remaining motion profile from rest. New profiles are optional in the v7 save schema: old active runs without a profile finish with their original timing; new forecasts use the new model. Fuel still uses the existing per-distance model; grade-dependent fuel, traction power curves, surveyed curve radii, temporary speed restrictions and signalling braking curves are future work.

## Player flow

The sidebar sits flush with the left edge and contains navigation. Collapse leaves an edge arrow; opening restores the current panel. A navigation history button and a persistent “Kembali ke tutorial” button support guided excursions. The bottom-right shortcut is Depo. Armada contains separate Trainset/dinas and Inventori/depo views; inventory is not repeated on unrelated screens. The depot view shows stock, fuel storage capacity, unit condition, odometer, P1 due times and active maintenance jobs. Vehicle parking capacity is not modelled or misrepresented as fuel capacity.

New browser games must choose a depot city, see its provisional contract cost, select a compatible first hub and confirm company creation before procurement. The first depot is represented at that hub station. Initial city prices are Rp10–20 million; OSM city tags can expand the available choices after import. Areas lacking city tags are explicitly labelled as station areas. Legacy saves keep their existing depot/hub and can opt into missions without restarting.

Nine one-time missions award 460 XP and Rp590 million in total, including Rp100 million/40 XP for company creation and Rp150 million/100 XP for the first completed passenger service. Level advances every 100 XP. Cash is posted as a mission gift with zero passenger revenue, preserving contribution accounting. Rewards are automatic for eligible milestones in opted-in saves; claims, ledger IDs and XP survive reload and catch-up. No XP is awarded for opening menus. Level does not override route, fuel or safety requirements.

## Checks

- `python3 -m unittest discover -s scripts/tests -v`: importer topology, curves, small stations, disconnected stations, legacy IDs/access, duplicate nodes and failed/incompatible inputs.
- `corepack pnpm test`: domain tests including geometry interpolation, intermediate-station selection, old saved routes, variable-speed profiles and one-time mission rewards.
- `corepack pnpm exec turbo run build --filter=@railway/web... --concurrency=4`: production build through workspace dependencies.
- Browser flow checks cover mandatory depot/hub choice, rewards, returning to tutorial, the starter procurement/assembly/crew/fuel/service flow, map controls, sidebar collapse and mobile depot UI. Fixture geometry checks establish importer behavior; they do not establish verified national coverage.

## Relasi dan pola operasi trainset

Relasi baru di UI dinamai otomatis dari kode endpoint, misalnya BD – GMR. Satu relasi dapat digunakan dua arah; arah dan waktu merupakan atribut penugasan. Nama layanan lama pada save tetap dipertahankan.

Penugasan sekali jalan tidak berulang. Setelah tiba, trainset tetap di stasiun tujuan dan pemain dapat memilih arah balik pada relasi yang sama atau relasi lain dari stasiun itu. Penugasan memeriksa lokasi, diagram aktif dan waktu siap; kesiapan sarana, kru, bahan bakar dan blok diperiksa lagi saat keberangkatan.

Pola operasi menyimpan beberapa dinas dengan relasi, arah dan jam keberangkatan dalam siklus 24/48/72 jam. Editor menampilkan stasiun asal/tujuan serta estimasi tiba. BD → GMR → BD → YK → BD memakai satu identitas trainset dan dua relasi. Validator menolak dinas bertumpuk, lokasi yang tidak tersambung, jeda tidak cukup, serta akhir yang tidak kembali ke awal siklus. Pergantian relasi memerlukan kontrak fasilitas servis dan jeda 30 menit; PP relasi sama memakai 60 menit. Jadwal, penugasan sekali jalan dan posisi disimpan dalam browser. Grafik waktu/jarak masih skema per relasi, bukan GAPEKA resmi.
