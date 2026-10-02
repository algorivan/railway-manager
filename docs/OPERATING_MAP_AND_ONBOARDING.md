# Operating map, motion and company onboarding

The supplied pasted HTML contains a rendered Leaflet map, tiles and SVG paths. Its SVG coordinates are screen pixels, not a geographic dataset; the source JavaScript and coordinate arrays are absent. The game already used Leaflet but connected seven stations with straight lines. This change separates actual source geometry from schematic fallback and never presents station-only interpolation as a surveyed railway alignment.

## Data pipeline

`packages/game-data/src/catalog/operating-network.ts` combines the unchanged legacy catalog with an OSM snapshot. The original seven station IDs and nine corridor IDs remain available for saved services and active runs. New routing uses imported physical edges when a legacy corridor has a connected OSM path; otherwise it uses the curated intermediate-station schematic edges described below. Existing corridor rights extend to that corridor's detailed edges; occupancy remains conservative for overlapping legacy/detail services. Branches and line ends are topology nodes, not selectable passenger stations. Starter rights continue through junctions to adjacent passenger stations to avoid trapping a new hub before expansion is available.

`python3 scripts/import-osm-network.py /tmp/indonesia-rail.json --download` queries Indonesia's OSM area in seven regional requests for railway lines and named station/halt nodes/ways. Gateway timeouts split a region into smaller requests (up to two subdivision levels). Each successful part is cached next to the raw input path in a `.parts` directory. The combined raw cache is replaced only when every region succeeds; denied access is never retried. Run it after building game-data. It writes the generated TypeScript catalog only after the response has parsed and validated; raw JSON remains outside Git. It is an explicit maintenance step, never a live browser or Vercel-build dependency. Offline use accepts a previously downloaded Overpass JSON file without `--download`.

The importer:

- Excludes known incompatible gauges, non-rail modes and tagged yard/siding/industrial lines.
- Snaps station coordinates to nearby compatible railway geometry within 500 metres; unconnected stations remain listed but disabled for service endpoints.
- Preserves OSM points between stops/branches. Adding small stations alone does not reproduce rail curvature.
- Keeps source way IDs, OSM IDs and snapshot time. Skeleton-node duplication cannot erase station names.
- Retains legacy station identities when a nearby OSM station is available, records mapped legacy corridor paths, and prevents access inheritance onto unrelated branches.
- Uses explicit numeric `maxspeed` and `incline` tags where available. Missing limits use the labelled 60 km/h game default; missing gradients remain unknown. A tagged grade is a conservative section approximation, not a complete terrain survey.

OpenStreetMap is a community geographic source, not official Gapeka or KAI station-class data. Relation-only stations without usable geometry, stations not tagged in OSM, incompatible networks and unresolved topology require further curation. New platform length (180 m), catchment demand (1,000/day), speed fallback and conservative occupancy are provisional game rules. Station class is not invented from marker size or platform counts. Full national coverage cannot be claimed from the importer or a small fixture test alone.

**Current data status:** the national snapshot is not imported. `osm-network-data.ts` remains explicitly empty and maps label the intermediate-station network as schematic. After the user changed access, `overpass-api.de/api/interpreter` returned real station data and a small GET geometry query near Bandung (1,209 elements). The importer processed that real sample outside the repository into five connected stations and 51 segments, with zero mapped legacy corridors. National and regional queries, including subdivisions and area lookup diagnostics, returned HTTP 504; the server status page returned HTTP 406. Runtime policy metadata still reports revision 5, so actual endpoint responses are the useful access evidence. Regional cache/import is ready to resume when the upstream queries complete. The Bandung railway-geometry sample remains verification only and is not shipped as nationwide data. Later successful station-only queries supplied the curated intermediate-station catalog described below.

OSM-derived data is attributed to OpenStreetMap contributors under ODbL 1.0. Keep this attribution with redistributed snapshots and comply with ODbL requirements. See <https://www.openstreetmap.org/copyright>.

## Train movement

`train-motion.ts` builds an acceleration/cruise/braking profile for each physical section. Entry/exit speeds are constrained across sections; commercial stops reach zero, pass-through nodes retain speed, and an upcoming lower limit constrains the preceding section's exit. Short sections use a triangular profile without ever reaching the maximum. Traction acceleration scales with formation mass; explicit grade adjusts acceleration/braking. The provisional starter reference is 268 tonnes, 0.35 m/s² acceleration and 0.55 m/s² braking.

The same profile sets forecast/event duration, reported speed and distance fraction along map geometry. Default commercial dwell remains three game minutes. Return legs reverse the source grade. Signals/block waits and resuming after a stop restart the remaining motion profile from rest. New profiles are optional in the v7 save schema: old active runs without a profile finish with their original timing; new forecasts use the new model. Fuel still uses the existing per-distance model; grade-dependent fuel, traction power curves, surveyed curve radii, temporary speed restrictions and signalling braking curves are future work.

## Player flow

The operations panel sits flush with the left edge. Peta, Jadwal, Armada, Pasar, Kantor and Tutorial are floating icons in a vertical bottom-right dock, alongside Depo and sound; the dock stays available when the panel is collapsed. Collapse leaves an edge arrow; opening restores the current panel. A navigation history button and a persistent “Kembali ke tutorial” button support guided excursions. Depo opens Armada’s inventory/depot view. Armada contains separate Trainset/dinas and Inventori/depo views; inventory is not repeated on unrelated screens. The depot view shows stock, fuel storage capacity, unit condition, odometer, P1 due times and active maintenance jobs. Vehicle parking capacity is not modelled or misrepresented as fuel capacity.

New browser games must choose a depot city, see its provisional contract cost, select a compatible first hub and confirm company creation before procurement. The first depot is represented at that hub station. Initial city prices are Rp10–20 million; OSM city tags can expand the available choices after import. Areas lacking city tags are explicitly labelled as station areas. Legacy saves keep their existing depot/hub and can opt into missions without restarting.

The nine missions are the onboarding itself: each includes instructions and a link to the relevant menu, with a return-to-tutorial button in the operations panel. There is no second tutorial checklist. Company setup is mission 1. Startup, lazy-loaded menus/map, basemap tiles, checkpoint imports and save-lock acquisition expose loading/status feedback; synchronous actions retain immediate success/failure notifications.

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

## Interactive timetable

The multi-relation editor shows one time lane per duty with journey blocks and hatched preparation time. Players can drag a block or click its time lane to snap departures to 15-minute slots, use left/right arrow keys, or choose a precise minute using the time picker. Journey duration is calculated from the same route/motion/dwell forecast; dragging never shortens the trip. Day and visible hour-range selectors support 24/48/72-hour cycles and midnight spillover. The next-duty button chooses a direction from the arrival station and calculates departure after the required preparation time.

`previewCoreDiagram` is shared by live timetable feedback and schedule activation. It checks overlaps, turnaround, station continuity, contracted service facilities and the next-cycle join without mutating the company. Time overlaps turn blocks red; location and facility problems show explicit messages and prevent saving. Route occupancy is still checked at actual dispatch; a green pattern is not a guarantee of a free railway block. Saved duties retain trainset identity, direction and departure time across reload/offline catch-up.

Browser checks exercised keyboard and pointer movement, exact time changes, visible hour limits, conflicts, mobile overflow, preview non-mutation and saved-pattern reload. Import checks also cover interrupted downloads preserving the prior cache and subdivision after a gateway timeout.

## Intermediate stations on the Java game map

`intermediate-stations.ts` contains 115 unique real OSM station node positions and codes retrieved on 2026-10-02. Regional station queries for Priangan, northern Central Java and northern East Java succeeded; smaller exact-name queries supplied western Java, Yogyakarta/Surakarta and selected southern East Java stations. Failed/limited queries were not filled with invented coordinates. Each station retains its OSM node ID, date and ODbL attribution; `railway:ref` takes precedence over generic `ref`. The importer also recognizes this code tag. Official medium/small station classes have not been verified; these are presented as intermediate stations with unknown class.

The user-supplied `rail-map-of-java.pdf` identifies itself as the FDTJ Java railway map dated 2022-05-06. Its blue existing-railway lines were reviewed for station order and missing stops; inactive, planned and high-speed branches were excluded. It is a historical reference, not evidence of current 2026 operations or station classes. Fifty additional stations have matching OSM node coordinates/codes. The review corrects Gundih → Sumberlawang → Salem and adds the northern Surabaya approach through Benowo, Kandangan, Tandes, Pasarturi and Kota to Gubeng. It also fills western, Priangan, northern/southern Central Java and eastern corridor gaps, including Cimahi, Kiaracondong, Cicalengka, Nagreg, Nganjuk, Kertosono and Mojokerto. PDF artwork is not redistributed.

| Parent game corridor | Intermediate stops |
| --- | ---: |
| Gambir–Bandung | 6 |
| Gambir–Cirebon | 5 |
| Cirebon–Semarang | 18 |
| Semarang–Surabaya | 30 |
| Cirebon–Yogyakarta | 16 |
| Bandung–Yogyakarta | 27 |
| Yogyakarta–Solo | 6 |
| Solo–Surabaya | 10 |
| Semarang–Solo | 7 |

Shared stations appear in multiple corridors but have one selectable identity. All 185 stations (seven original hubs plus 115 initial intermediate points and 63 eastern extension stations) are available to the relation picker. New paths traverse the intermediate stations; each can be an origin, destination, commercial stop or pass-through. Commercial stops use three game minutes of dwell and the shared acceleration/braking model. Class, platform and demand remain unverified; new platform capacity (180 m) and the station-specific demand estimates described below are provisional game rules. Province and corridor order are curated configuration, not additional OSM metadata. Brambanan is assigned to Central Java, while Maguwo, Lempuyangan and Wates are in DI Yogyakarta.

Each fallback corridor is split into schematic edges using station coordinates. Section distances allocate the original game corridor distance in proportion to the chords; they are game estimates, not measured railway kilometres. Shared corridors can have different distance estimates; routing selects the shortest accessible game path. Child edges inherit access and conservative occupancy from their parent corridor. Real imported corridor paths take precedence when available. The map and station provenance explicitly identify the schematic links. This does not establish surveyed railway alignment, physical block layout or complete Indonesian coverage.

New schematic segment IDs use parent corridor plus endpoint IDs. `legacy-intermediate-segments.ts` preserves the 83 numbered segment definitions from the first intermediate-station release, including their original distances; these aliases are excluded from new routing and map rendering. Future expansions must preserve any retired segment definitions before splitting them, so saved services and active runs remain resolvable. A regression check restores a numbered Bandung–Gambir service and validates its original forecast.

Legacy corridor IDs remain in the catalog and existing saved services/runs keep their original station lists and timing; new services use the expanded routing. Tests cover every corridor's connectivity/access and positive distances, station/code uniqueness, selectable small-station endpoints, commercial-stop dwell versus passing, location/turnaround validation and old saved trains finishing their existing run.


## Eastern Java extension

`east-java.ts` adds 63 unique OSM station nodes, obtained on 2026-10-02, and eight mainline game corridors. It reuses existing Kertosono and Wonokromo identities. Banyuwangi Kota (`BWI`) and Ketapang (`KTG`, formerly Banyuwangi Baru) are separate selectable endpoints. The historical inactive Banyuwangi branch is not included. Station order is curated against the supplied 2022 FDTJ map and OSM positions. Some smaller stops (for example Blimbing, Sengon, Wonokerto, Waru, Gedangan and Buduran) await sourced coordinates; the section passes through their corridor without claiming a complete stop list. Larger geographic queries returned 406/504; successful station-only and indexed code/name queries supplied the shipped data. No coordinates were invented.

| Game corridor | Provisional distance | Conservative game cap |
| --- | ---: | ---: |
| Kertosono–Blitar, via Kediri and Tulungagung | 120 km | 60 km/h |
| Blitar–Malang, via Wlingi and Kepanjen | 80 km | 50 km/h |
| Malang–Bangil, via Singosari and Lawang | 65 km | 50 km/h |
| Wonokromo–Bangil, via Sidoarjo and Porong | 45 km | 60 km/h |
| Bangil–Probolinggo, via Pasuruan | 70 km | 60 km/h |
| Probolinggo–Jember, via Klakah and Rambipuji | 100 km | 60 km/h |
| Jember–Banyuwangi Kota, via Kalisat, Mrawan and Rogojampi | 105 km | 50 km/h |
| Banyuwangi Kota–Ketapang, via Argopuro | 15 km | 60 km/h |

These are rounded balance distances and speed ceilings, not measured railway kilometres, official limits or contour-derived grades. Station chords allocate each parent distance; unknown gradient remains unknown. New corridors conservatively reserve single-track occupancy. Acceleration, braking, lower section caps and three-minute commercial dwell still use the shared movement model. The map menu exposes full-corridor access purchases (Rp25 million) through the existing connected-network and completed-PP expansion rules, plus individual sections. Its old 100-section display cutoff has been removed so eastern sections remain reachable. Existing nine corridors and all retired segment aliases remain unchanged.

## Station catchment demand and development indices

`station-demand.ts` replaces the uniform intermediate-station 1,000/day balance with configurable local, district, regional and urban catchments, plus station-specific overrides. Factors are **game estimates**, not census population, observed passenger numbers, official station classes or measured city development scores. Malang receives greater education/tourism weight; Jember education and regional interchange; Probolinggo tourism; Banyuwangi tourism; Ketapang tourism and ferry interchange; Kertosono, Bangil and Kalisat rail interchange. Existing seven hub demand profiles retain their old calibrated volume and purpose shares.

For each estimated catchment, the daily potential is:

`round(P × (0.75 + 0.25U) × (0.8 + 0.2E + 0.1S) × (1 + 0.25T + 0.2I) × R × C × H)`

- `P`: estimated daily travel potential of the catchment, **not population**. A future census input needs conversion to trip propensity and station access first.
- `U`, `E`, `S`, `T`, `I`: development, employment, education, tourism and interchange scores, bounded 0–1.
- `R`: rail preference/competition (0.25–1.5); `C`: station capture (0–1), discounting potential shared with other stations and modes.
- `H`: optional IPM/HDI factor. Missing data is 1. Sourced IPM uses `clamp(1 + (IPM − 70)/300, 0.9, 1.1)` and requires a 0–100 value, year, administrative area and HTTPS source URL. No official IPM values have been loaded or guessed.

IPM measures health, education and living standards; it is a modest modifier and does not directly imply passenger volumes or luxury purchasing power. A later BPS calibration should align census population, IPM, employment and incomes by compatible catchment/administrative area and year, then fit trip propensity/capture against actual boardings. Tourism and ferry interchange need their own statistics. Spatial catchment overlap and shared city-level population pools are not yet modelled; `C` is an explicit approximate discount.

Work, education, development and tourism also generate normalized commuter/business/tourist shares. The booking engine averages the two endpoints' purpose-weighted time factors: commuting peaks at 06:00–10:00 and 16:00–20:00, tourism is stronger at 10:00–16:00, and overnight demand is lower. Existing route market share, fare elasticity, reputation, campaigns, used-demand buckets and per-section seat limits still apply after this potential. Class shares remain the game's existing EC/EX/LX distribution; IPM is not used as an income proxy. Stored bookings on active runs are retained; new forecasts/departures use the revised profiles.

The relation picker's expandable station details show estimated daily potential, each factor and the missing-IPM neutral state. Potential is labelled before operator share/pricing/time/capacity and is never presented as guaranteed ticket sales. Tests cover valid purpose shares, factor effects, neutral/bounded IPM with provenance validation, purpose-specific peaks, all six eastern destinations, station order, access denial, reversible forecasts and saved relations.


## Unified player scheduling and daily operating sheets

All creation, editing, pausing and review of departure schedules now lives in Jadwal. Armada links explicitly open that menu; it does not provide a second assignment form. Relation creation remains at the top of Jadwal, followed by one planner: choose trainset/relation, select fixed-time automatic PP, a custom multi-relation timetable or one-way departure, review the stops and save. Fare configuration is tucked into a separate expandable section. The former separate PP and advanced-pattern forms and duplicate diagram graph have been removed.

Players choose “Setiap hari”, “Setiap 2 hari” or “Setiap 3 hari”. These mean repeat the same timetable after 1/2/3 **game days**; they replace unexplained cycle terminology. Fixed PP starts from the trainset's current endpoint, computes a return departure after forecast arrival plus 60 minutes of preparation, and creates two editable timetable blocks. Changing the initial fixed time rebuilds the pair; after manual edits, regeneration is explicit. Players can add more relations in the same editor. A pattern that cannot fit before the next repeat remains invalid; it is not shortened or silently stretched.

Saved schedules can be loaded into that same editor. Optional `replace` on the existing schedule/diagram actions validates the replacement before deactivating old plans for that trainset. Invalid changes preserve the previous state. Replacement is blocked during running, held or stopped occurrences until the journey is resolved. One-way schedules retain their existing once-only behavior. Overnight repeating diagrams now choose their initial phase from the next departure at the trainset's actual location, so a 23:00 outbound and next-morning return are a legal daily loop even though the return has an earlier clock time. Readiness, physical continuity, turnaround, service-facility rules and next-repeat boundaries remain enforced.

`coreFixedRoundTrip`, `coreDraftScheduleRuns`, `coreRunStationTimes` and `coreDailySchedule` are pure domain helpers shared by forecasts and the player sheets. Station rows use movement-profile leg durations and the existing three-minute commercial dwell. Origin has no arrival; terminal has no departure. Passing stations/junctions do not appear as stops. Reverse journeys reverse the station sequence. Draft sheets show the first actual planned departure day, including next-day return times.

The saved daily recap covers all active trainsets for the chosen game day, including trips departing the previous day which arrive today. Each journey displays trainset, endpoints, game day and a **Tujuan | Tiba | Berangkat** table. It is a planned operating sheet, not actual punctuality history or official GAPEKA. Actual readiness/block delays can change operation. Optional `firstAt` records each new plan's initial occurrence so the recap does not invent a return before its first outbound; the v7 save reader preserves it. Legacy saves without `firstAt` remain readable and use their nominal repeat times. Paused/inactive recurring plans are omitted. Once-only departures are shown only on their scheduled day and remain in the sheet after dispatch; a once-only plan paused before dispatch is omitted.

Validation covers overnight daily PP, exact station/dwell/terminal rows, reverse/pass-through behavior, pure daily recaps, once-only dates, save compatibility and atomic replacement. Browser checks cover generated PP, conflict blocking, keyboard timetable changes, loading saved edits, daily stop columns and mobile layout. Keyboard movement preserves a full 15-minute shift even when the forecast-generated departure is not aligned to a quarter hour.
