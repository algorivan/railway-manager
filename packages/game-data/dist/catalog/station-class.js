/** User-defined gameplay classes. These are not official station classifications. */
export const CORE_LARGE_HUB_CODES = new Set("GMR PSE CN SMT SMC SBI SGU ML YK BD KAC PWT SLO KTA JR MN TG".split(" "));
export const CORE_SEMI_LARGE_CODES = new Set("JNG BKS CKP PWK GRT TSM SMC PDL CMI CNP KYA MA KM LPN SK KTS BL NJ JG MR TA KTG PK CLP KTN PB BG BOO SI".split(" "));
export function gameStationClass(code) {
    return CORE_LARGE_HUB_CODES.has(code)
        ? "large"
        : CORE_SEMI_LARGE_CODES.has(code)
            ? "semi-large"
            : "small";
}
export const gameStationClassLabel = (cls) => cls === "large" ? "Besar" : cls === "semi-large" ? "Menengah besar" : "Kecil";
/** Multi-source shortest rail distance; disconnected stations get no geographic shortcut. */
export function stationHubProximities(stations, tracks) {
    const distance = new Map(), source = new Map(), pending = new Set(stations.map((s) => s.id)), adj = new Map();
    for (const s of stations)
        if (s.kind === "station" && gameStationClass(s.code) === "large") {
            distance.set(s.id, 0);
            source.set(s.id, s.id);
        }
    for (const t of tracks) {
        if (!Number.isFinite(t.distanceKm) || t.distanceKm < 0)
            throw new Error("Rail distance must be nonnegative");
        for (const [from, to] of [
            [t.originStationId, t.destinationStationId],
            [t.destinationStationId, t.originStationId],
        ]) {
            const edges = adj.get(from) ?? [];
            edges.push({ to: to, km: t.distanceKm });
            adj.set(from, edges);
        }
    }
    while (pending.size) {
        let id, min = Infinity;
        for (const p of pending) {
            const d = distance.get(p) ?? Infinity;
            if (d < min) {
                id = p;
                min = d;
            }
        }
        if (!id)
            break;
        pending.delete(id);
        for (const e of adj.get(id) ?? []) {
            if (min + e.km < (distance.get(e.to) ?? Infinity)) {
                distance.set(e.to, min + e.km);
                source.set(e.to, source.get(id));
            }
        }
    }
    return new Map(stations.map((s) => {
        const d = distance.get(s.id), near = d === undefined ? 0 : Math.exp(-d / 45), cls = gameStationClass(s.code);
        return [
            s.id,
            {
                nearestHubId: source.get(s.id) ?? null,
                distanceKm: d ?? null,
                demandMultiplier: cls === "large"
                    ? 1.15
                    : cls === "semi-large"
                        ? 0.95 + 0.35 * near
                        : 0.6 + 0.8 * near,
            },
        ];
    }));
}
//# sourceMappingURL=station-class.js.map