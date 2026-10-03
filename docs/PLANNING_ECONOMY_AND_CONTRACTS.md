# Planning economy v2 and station classes

This revision keeps the existing clock (Realism 1× / Casual 1.5×). Progress comes from operating choices and industry funding, rather than time skips. Values below are gameplay balance, not claims about real procurement prices, tank sizes or financial returns.

## Management flow

The flush-left, collapsible sidebar only monitors positions, speeds, arrivals and trip progress. The bottom-right vertical dock opens centered management dialogs for Peta, Jadwal, Armada, Pasar, Kantor, Depo and the unified mission onboarding. Tabs, product/unit selectors and paged lists replace long stacked management pages. The HUD uses a custom Indonesia Railway Manager rail mark, XP progress, ten reputation stars with a percentage and the game clock.

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
