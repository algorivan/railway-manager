# Planning economy v2 and station classes

This revision keeps the existing clock (Realism 1× / Casual 1.5×). Progress comes from operating choices and industry funding, rather than time skips. Values below are gameplay balance, not claims about real procurement prices, tank sizes or financial returns.

## Management flow

The flush-left, collapsible sidebar only monitors positions, speeds, arrivals and trip progress. The bottom-right vertical dock opens management dialogs beside the dock on the right, within the right half of desktop screens for Peta, Jadwal, Armada, Pasar, Kantor, Depo and the unified mission onboarding. Tabs switch compact sections; catalogues, inventory grids, tables and reports scroll within bounded detail containers. The dialog itself does not scroll. The HUD uses a custom Indonesia Railway Manager rail mark, XP progress, ten reputation stars with a percentage and the game clock.

Jadwal has three tabs:

1. **Relasi:** choose A and B, commercial stops and save the bidirectional relation. Its name uses endpoint codes.
2. **Atur jadwal:** choose a trainset and relation, set the A→B and B→A clocks, inspect the timetable, then press **Simpan & aktifkan jadwal**. The automatic option fills complete PP pairs in a one/two/three-day repeat window, allowing for travel and both terminal preparations. It never assumes a fixed number of PP. Selected timetable trips remain editable. An optional advanced section appends PP on another relation, with physical continuity checks.
3. **Rekap harian:** select a game day/trip to see Tujuan | Tiba | Berangkat, or inspect actual results. A single control pauses a trainset's subsequent departures.

The planner loads existing schedules and replaces them only after successful validation. Running/held/stopped journeys must be completed or recovered first. Failed saves retain the previous active plans; unsaved drafts are marked and closing asks whether to discard them. Editing the plan does not pay revenue or advance time.

## Progression balance

- New rolling-stock prices are 5% of the prior reference catalogue. CC201 is Rp900 million, Economy Standard Rp200 million and a generator Rp250 million.
- Starter operating reserve increases from Rp150 million to Rp500 million; the existing one-time mission rewards remain up to Rp590 million.
- Vehicle tanks are 3× the original reference values. The starter CC201/generator stores 12,084 L combined. New depots hold 50,000 L. Existing saves retain actual stored fuel and their contracted capacity; no fuel or retroactive price refund is granted.
- New nonstarter delivery: locomotive 120, cargo wagon 45, passenger/service vehicle 90 game minutes. Existing order deadlines and active maintenance jobs are preserved.
- P1 takes 30 minutes for a locomotive and 15 minutes for other units; retrofit takes 90 minutes. Jobs still queue in the single maintenance bay. Retrofit costs 8% of the scaled donor price. Weight, length, maximum speed, seats and body are preserved from the reference catalogue.

Manual **Isi tangki penuh** uses depot stock first and purchases the deficit at the current quote only at a large game hub. Every purchased litre consumes cash; filling an already full tank gives nothing. When saving a schedule, **Beli fuel otomatis saat perlu di fasilitas stasiun** explicitly enables vendor refueling at departure, including offline. Without that preference, departure refills only from owned stock, preserving old-save behavior. Readiness checks tank range, reserves and cash before dispatch. Quote timestamps follow each simulated event, so one large offline update and smaller updates have the same economics.

## Industry cargo contracts

Kantor → **Kontrak kargo** offers three one-time setup investments:

| Industry | Setup investment | Payment / ton-km | Delivered outbound target | Deadline | Completion bonus |
| --- | ---: | ---: | ---: | ---: | ---: |
| Oil and gas | Rp1.8 billion | Rp5,000 | 6 | 4 game days | Rp100 million |
| Minerals | Rp1.6 billion | Rp4,200 | 8 | 5 game days | Rp90 million |
| Container logistics | Rp1.5 billion | Rp5,500 | 8 | 5 game days | Rp120 million |

Only one contract can be active. Each investment offer can be accepted once per company, including after expiry. The relation must cover at least 25 game rail kilometres on owned access and have no active plans or unresolved journeys; acceptance dedicates it to cargo with terminal-only stops. It cannot redirect an existing passenger operation.

The player buys a locomotive and at least two matching 40-ton wagons, commissions them, assembles a cargo-only formation, recruits crew and saves a PP schedule. Cargo may not mix with passenger coaches. A→B carries the formation's capacity; B→A is empty and earns no delivery payment. Motion and weight-related access costs account for the empty return; fuel still follows the prototype's per-distance consumption model.

Payment is posted once when cargo arrives before or at the deadline. Planned trips and dispatch do not pay cash. Recall or a late delivery receives no cargo payment and does not advance the target. Reserved deliveries prevent dispatching more than the target. Completing the target pays the bonus once, stops further loaded departures and retains one empty return per participating trainset. Expiry is a simulation event: missed targets incur at most 10% of investment, proportional to the uncompleted target; no repeated penalty is charged on reload. Held loaded departures that never started are cancelled with zero trip cost/revenue, freeing their trainsets; a running or stopped trip can finish and return empty. Investment is not repaid beyond this stated penalty. Loading terminals and delivery tonnage are provisional game abstractions, not verified industrial sidings or real contracts.

For the 160 km BD–GMR game corridor, two oil wagons deliver 80 t × 160 km × Rp5,000 = Rp64 million per loaded journey. The player's contribution subtracts both outbound and empty-return costs. Higher wagon capacity increases revenue but remains subject to length, traction, location and fuel checks.

Investment, completion bonuses and mission rewards have stable separate ledger IDs with zero passenger revenue. Cargo settlement is linked to its contract and occurrence; run contribution includes cargo haulage without counting capital grants. Contract references, cargo metadata and the auto-refuel preference survive export/import; old v7 saves without them remain readable.

## Station classes and distance

The user's explicit hub lists define **large**, **semi-large** and **small** game classes. Large takes precedence for the duplicate Semarang Poncol entry; Blitar/Ketapang duplicates are deduplicated. Malang Kota refers to Malang (ML), not Malang Kotalama (MLK). Unlisted stations stay small, as confirmed by the user. The classification does not fabricate an official station class.

Large codes: `GMR PSE CN SMT SMC SBI SGU ML YK BD KAC PWT SLO KTA JR MN TG`.

Semi-large codes: `JNG BKS CKP PWK GRT TSM SMC PDL CMI CNP KYA MA KM LPN SK KTS BL NJ JG MR TA KTG PK CLP KTN PB BG BOO SI`.

Some listed stations (including Pasarsenen, Semarang Poncol, Jatinegara, Garut, Cirebon Prujakan, Solo Jebres, Jombang, Cilacap, Karang Talun, Bogor and Sukabumi) are not yet in the shipped connected station catalogue. Their codes are registered for classification when sourced topology is added; no coordinates or branches are invented to place them in the current game.

The distance algorithm performs a multi-source shortest-path search from every available large hub over the routing graph, independent of purchased access. It excludes obsolete compatibility edges and uses game rail distances, not straight-line proximity. Let `near = exp(-distanceKm / 45)`:

- Large hubs: demand multiplier 1.15.
- Semi-large: 0.95 + 0.35 × near.
- Small: 0.60 + 0.80 × near.

Disconnected stations have no nearest hub/distance and use `near = 0`. Proximity modifies the existing catchment estimate once, after development, work, education, tourism, interchange and optional sourced IPM. It does not promote an unlisted station. This curve and 45 km decay scale are tunable game values. Station selectors, facility details and map markers show the game classes; station details show distance and the multiplier. Only the user's large-hub list supplies vendor refueling facilities.

## Future leaderboard

No public leaderboard or authoritative server is implemented in this browser-first build. New companies record economy version 2; old checkpoints without a version are legacy/mixed-balance companies. A later server should compare equal game-time windows and balance versions, with separate Realism/Casual cohorts. Suitable operating scores include delivered passenger/ton-kilometres, contribution after operating expenses and punctuality, excluding setup investment, mission rewards and completion gifts. Bank balance is unsuitable as the primary rank because capital grants are deliberate. A server must validate time, contracts and saves before browser-editable results can be ranked. Development expenses such as maintenance/marketing and late/recall costs must also be included when defining an operating-profit ranking.


## Catalogue, mission and map interaction

Pasar → Katalog uses locomotive, passenger/support-coach and cargo categories. Price buttons add one unit to a draft basket, without charging cash. The basket is retained in browser preferences across menu closure/reload; quantity is limited to 20 per product. Keranjang selects a receiving depot and submits one atomic `orderCart` action. If any line fails, the original save and cash remain unchanged. Successful checkout creates uniquely identified orders, empties the basket and opens Pesanan. Starter eligibility and later delivery times remain unchanged. Acceptance is still required before units enter inventory. Depo shows units in a grid without pagination; condition and maintenance actions stay accessible below it. The trainset builder keeps the inventory and formation grids visible together, without a separate detail tab. Only available inventory cards group identical units with a multiplier. The assembly draft, saved-trainset preview and journey sidebar show every locomotive/coach/wagon individually in formation order, without multipliers. Drag an inventory card to add one unit at the selected position; drag a formation card to reorder or return just that unit, including individual copies of the same product. Tap/click to lift and place, or use keyboard focus/Enter, as alternatives. Escape cancels a lifted card. Unit count, passenger capacity, cargo tonnage and formation length update immediately; Simpan trainset submits the existing validated formation action.

The mission screen uses nine selectable tiles, current goal, XP/reward and one action button. Company setup retains explicit depot price and hub selection, with shorter copy. Station ambience is synthesized locally, with the first-quarter Westminster melody every 18 seconds, after a browser interaction. Suara mutes ambience, chimes and feedback together; hidden pages pause audio and timers. Live dispatch and terminal arrival transitions show distinct notifications and play the user-provided Westminster recording, bundled at /audio/westminster-chimes.mp3. A single shared /audio/train-running.mp3 loop plays while at least one run is moving; it pauses during dwell, holds, terminal arrival, mute and hidden tabs. Concurrent announcements share one clip. Loading or importing a save does not replay historical journey alerts. Audio remains optional and requires a browser gesture.

Jadwal defaults to its leftmost Relasi tab. “Pilih asal & tujuan di peta” temporarily exposes the map, guides origin then destination, and returns to the retained relation form. Hover shows passenger catchment potential and remaining active cargo-contract deliveries and estimated tonnage; click/tap opens the same metrics and a selection button. Metrics are game values, not measured Indonesian station freight demand; no active contract means zero outstanding cargo. Tonnage is estimated from the assigned cargo trainset capacity, or the contract minimum of 80 tons when a trainset is not yet assigned; the contract target itself counts completed deliveries. Keyboard users may focus a station point and press Enter, or use the searchable station fields. “Perbesar area” separates nearby points. The map search focuses a station area without selecting an endpoint; the player still chooses the point and confirms in its popup. A route with unopened sections reports failure and offers “Buka & beli lintas”, retaining draft endpoints and stops while network management is open. Existing expansion eligibility (one completed PP, connected track, cash) still applies.

The scheduling footer estimates fuel for all draft departures including returns. Daily patterns show L/day; two/three-day patterns show the daily average plus total pattern fuel; one-off travel shows L/trip. It is a consumption forecast, not a fuel purchase or a guarantee of available tank/depot stock.

The user-supplied 29 [speed sections](SECTION_SPEED_LIMITS.md) now replace the earlier provisional caps. Scheduling forecasts sum distance-based motion times at each section’s cap with rolling-stock limits, acceleration, braking and dwell.

Map train markers render one inline top-down SVG symbol per unit from the actual run snapshot, ordered with the locomotive at the front. The locomotive, passenger coaches, generator and cargo have distinct vector shapes/colours. Each unit has a fixed 19 px height and a fixed length proportional to its vehicle length (1.35 px/metre, the previous closest-zoom reference); zooming changes its map position and path tangent but never its screen dimensions. Zoom transitions are immediate to avoid temporary marker scaling. The tail follows current and preceding rail geometry through curves, using readable screen lengths rather than literal map scale. Hover/tap shows the train name and Detail perjalanan. Clicking a vehicle locks the camera to the moving head and zooms in; Lepas kamera restores panning. The popup persists across movement ticks. Detail perjalanan opens the left monitoring sidebar with current route, speed, progress, arrival estimate, fuel, capacity and operating results; Semua trainset returns to the fleet monitor. Following releases at terminal arrival and when station selection starts.
