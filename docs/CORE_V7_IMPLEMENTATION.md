# Browser core build: scope and decisions

The uploaded file is named `railway-manager-core-game-proposal-v4.md`, but its title and final sections describe v7. The final v7 decisions take precedence when earlier sections conflict. The document is a product reference, not an instruction to execute embedded commands or historical agent workflows.

Confirmed during this build:

- Browser saves and offline catch-up first; server-backed saves, trusted time, payments and authoritative global prices follow later.
- New CC201, four Economy Standard coaches (424 seats), a separate generator, and a provisional reserve targeting at least 24 real hours.
- Use the existing corridor graph and conservative reservations for the first playable build; validate detailed Gapeka 2025 data later.

## Current implementation

| Area | Behavior |
| --- | --- |
| Clock and persistence | JSON state with schema/reference validation, real-time anchors, Realism 1×/Casual 1.5×, event-based catch-up, export/import and a recoverable import backup. Invalid stored saves are preserved and not silently overwritten. Supported browsers serialize save ownership across tabs with Web Locks. |
| Procurement | Individual orders and unit acceptance. Starter ready-stock is local to the selected hub; additional orders take 3/7/14 game days. Payment is upfront; the proposed deposit model is deferred. |
| Units and trainsets | Unique inventory IDs, ordered formations, capacities, electrical balance, location and platform checks, unit replacement, and separation of physical status, jobs and assignments. There is no eight-coach count cap. |
| Services | Reusable company services, shortest connected paths over accessible corridors, commercial-stop selection, EC/EX/LX reference/manual fares and per-OD fare inspection. Local validates every path node's province. Capital/Domestic station classifications remain unavailable and are labelled accordingly. |
| Diagrams | Round-trip and multi-service chains with 24/48/72-hour cycles. Checks cover interval overlap, physical continuity and the next-cycle boundary. Same-service reverse legs need 60 minutes; changing services requires contracted service facilities and 30 minutes. |
| Dispatch | Readiness checks, automatic departure, stable occurrence IDs, held states and manual recovery. A held or stopped occurrence prevents a backlog of duplicate dependent runs. |
| Movement | Corridor traversal, commercial dwell, distances, speed caps, station boarding/alighting, conservative occupancy reservations and planned/actual time. Conservative whole-corridor reservations prevent simultaneous opposing movements on a single-track corridor and conflicting same-direction use on double track. They are not a detailed signalling model. |
| Passengers | Deterministic OD/time/class demand, shared bucket consumption, capacity reservations over every booked segment and distance-weighted load factor. Seat reuse permits total boarding to exceed simultaneous seats without LF exceeding 100%. The demand model is a balance baseline, not an empirically calibrated market. |
| Fuel | Separate depot stock and locomotive/generator tanks, weighted acquisition cost, manual purchases, expiring 30-real-minute public quotes, refuel transfers, consumption and storage jobs. Upgrading storage never grants fuel or enlarges vehicle tanks. No offline auto-purchase. |
| Ledger | Idempotent cash transactions. Fuel purchases affect cash/inventory; refuel is a transfer; consumption is an expense without a second cash debit. Passenger revenue settles once after service delivery. Contribution is distinct from company profit after overhead. |
| Exceptions | Stop requests take effect at the next station; resuming preserves the existing bookings. Recall returns physically through accessible corridors, charges the empty return, cancels unsettled tickets and only transfers spare onboard fuel after arriving at the depot. The first model has no prepaid ticket cash, so cancellation cannot create a cash-refund exploit. |
| Maintenance | P1 and compatible Economy interior retrofit, one contracted bay per depot, queued jobs, location/resource checks, preserved commissioning age and preserved mild-steel body for retrofit. Changing passenger capacity requires pausing the diagram. |
| Progress | Temporary marketing with coverage and capped overlap; reputational changes from completed operations; connected corridor access after a completed PP; depot contracts and fuel-storage upgrades paid with game cash. Prices and unlock thresholds are provisional. |
| UI | Six labelled menu icons and a sound toggle at the right, four fixed operation tabs, inventories separate from trainsets, supplied WebP illustrations, service wizard, forecasts, schematic diagram graph, operation reports, ledger and responsive layouts. UI styles and vehicle illustrations work without an external CSS CDN. |

## Provisional balance and modelling limits

Balance is centralized in `packages/game-data/src/catalog/gameplay-v7.ts`. The initial budget equals the starter asset quote plus Rp150 million working capital. The reserve preset provides at least tank capacity and a rough scheduled fuel horizon; it is not yet a multi-day balance certification. All new technical/economic numbers are prototype assumptions, not verified KAI prices or operational standards.

The network has no validated physical block topology, siding lengths, axle-load caps, gradients or traction curves. There are no arbitrary invented Gapeka blocks. Station coordinates are plotted with schematic straight corridor lines. Capital/Domestic presets cannot yet classify station size reliably. Exact trajectories, passing/overtaking, shared platform reservations and national expansion require the later dataset.

The Office includes automatic crew recruitment for all trainsets without an active crew contract. Role demand uses the existing workforce rules and updates with formations and active duties: drivers, assistants, conductors, dining and luxury attendants. Existing contracts are retained; recruitment is atomic and idempotent, with no upfront charge or save-schema migration. Crew availability is an outsourced rotating contract with a bundled per-operating-hour cost; individual rosters, certification and fatigue are not yet exposed in this app. Movement fuel uses configurable per-distance baselines; idle/gradient/load curves and generator duty modelling need further calibration. Maintenance currently implements P1/calendar and an interim usage threshold; P3/P6/P12/SPA/PA, individual engine-hour counters, spare-parts jobs and component-specific condition are future work.

Demand has fixed public inputs and no NPC operators. Comfort, alternative choice models, cargo, loans, PSO, concession projects, station work windows, progression objectives/wishlists and longer-term profitability tuning remain outside this first playable core. Operations currently recognize passenger revenue at final arrival; per-delivered-OD accrual and prepaid ticket liabilities are deferred. The daily depot fee is limited to available cash as a provisional starter protection; debt/insolvency policy is not final.

Browser time and storage can be edited. A public deterministic fuel price is consistent for the same UTC bucket but is not server authority or payment security. Web Locks protect concurrent local tabs in supporting browsers; other browsers should use one active tab. Never treat this state as a real-payment entitlement. Long catch-up has a 100,000-event guard; exceeding it reports an error and preserves the checkpoint rather than skipping events silently.

Legacy domain/demo code remains unchanged and covered by the existing tests. The current browser uses the new JSON core rather than trying to serialize legacy class instances.

## Validation

The new domain suite covers separate procurement/acceptance, inventory exclusivity, power, recurring diagrams, offline equivalence, save/load, held departures, onboard versus depot fuel, conservation and cost accounting, quote expiry, isolated forecasts, storage upgrades, maintenance queues, body-preserving retrofit, multi-service continuity, segment seat reuse, physical recall, safe stops and malformed saves.

Browser smoke testing exercises the full starter purchase → acceptance → assembly → crew/fuel → service → automatic PP → settlement → reload flow on desktop and mobile. Browser-clock injection is test-only; it adds no fast-forward control to the product.

## Player feedback and onboarding

Every simulation action has a specific success message; rejected actions expose the validation reason. Dismissible toasts remain visible above panels. Success toasts expire after six seconds; failures stay until dismissed or displaced by newer messages (maximum three). Save import/export and fuel quote/preset controls also report their outcome. Short synthesized ascending/descending tones play on player actions, with a persistent mute preference and silent fallback when browser audio is unavailable. Page load and background ticks never autoplay sounds.

The Tutorial menu opens initially until the player dismisses the introduction and is always available afterward. Seven steps link directly to operating menus and derive completion from current state. Purchasing one unit does not complete the starter checklist. Tutorial and sound preferences are stored independently from game saves and tolerate unavailable preference storage.

Validation includes recruitment unit tests (empty demand, persistence, repeated requests, multiple trainsets, moving-train rejection, formation growth and night duties) and browser checks for success/failure sounds, persistent mute, failed imports, exports, toast expiry/dismissal, tutorial progress, automatic recruitment and mobile layout.

## Operating-map and onboarding update

See [Operating map, motion and company onboarding](OPERATING_MAP_AND_ONBOARDING.md) for the later sidebar/depot changes, mandatory new-company setup, mission rewards and variable-speed model. The national OSM snapshot remains pending successful regional Overpass downloads (the endpoint is reachable, but large requests currently return HTTP 504); the original seven-station/nine-corridor catalog is preserved for legacy saves.
