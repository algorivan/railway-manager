import { JAVA_STATION_CATALOG } from "./stations.js";
import { JAVA_TRACK_CORRIDOR_SEGMENTS } from "./tracks.js";
import { CORE_STATION_PROVINCE } from "./gameplay-v7.js";
import { INTERMEDIATE_STATIONS, SCHEMATIC_CORRIDOR_STOPS } from "./intermediate-stations.js";
import { EAST_JAVA_STATIONS, EAST_JAVA_CORRIDORS, EAST_JAVA_CORRIDOR_STOPS } from "./east-java.js";
import { LEGACY_INTERMEDIATE_SEGMENTS } from "./legacy-intermediate-segments.js";
import { stationDemandFor } from "./station-demand.js";
import { OSM_NETWORK_DATA } from "./osm-network-data.js";
export const CORE_GAME_CORRIDORS = [...JAVA_TRACK_CORRIDOR_SEGMENTS, ...EAST_JAVA_CORRIDORS];
const corridorStops = { ...SCHEMATIC_CORRIDOR_STOPS, ...EAST_JAVA_CORRIDOR_STOPS };
const activeIntermediateIds = new Set(Object.entries(corridorStops)
    .filter(([corridor]) => !OSM_NETWORK_DATA.legacyRoutes[corridor])
    .flatMap(([id, stops]) => {
    const parent = CORE_GAME_CORRIDORS.find((track) => track.id === id);
    return [parent.originStationId, ...stops, parent.destinationStationId];
}));
const curatedStations = [...INTERMEDIATE_STATIONS, ...EAST_JAVA_STATIONS].map((station) => ({
    ...station, kind: "station", connected: activeIntermediateIds.has(station.id), region: "JAVA_INTERMEDIATE",
    platformCount: 1, maxTrainLengthMeters: 180,
    facilities: { hasCargoTerminal: false, hasDepotConnection: false, hasExecutiveLounge: false },
    demandProfile: { baseDailyDemand: 1000, commuterShare: 0.5, businessShare: 0.25, touristShare: 0.25 },
    provenance: { source: `OpenStreetMap ${station.osmId} (ODbL 1.0)`, sourceDate: "2026-10-02", verified: false,
        notes: "Actual OSM station position/code. Corridor membership/province curated for game; class and platform unverified; demand is a station-specific provisional catchment estimate. Rail connections remain schematic." },
}));
const originalStations = new Map(JAVA_STATION_CATALOG.map((s) => [s.id, s]));
const importedStations = OSM_NETWORK_DATA.stations.map((s) => {
    const original = originalStations.get(s.id);
    return {
        ...(original ?? {
            platformCount: 1,
            maxTrainLengthMeters: s.kind === "junction" ? 600 : 180,
            facilities: {
                hasCargoTerminal: false,
                hasDepotConnection: false,
                hasExecutiveLounge: false,
            },
            demandProfile: {
                baseDailyDemand: s.kind === "junction" ? 0 : 1000,
                commuterShare: 0.5,
                businessShare: 0.25,
                touristShare: 0.25,
            },
            region: "OSM_INDONESIA",
        }),
        ...s,
        connected: !!original || s.connected,
        province: s.province ?? CORE_STATION_PROVINCE[s.id],
        provenance: {
            source: `OpenStreetMap ${s.osmId}`,
            sourceDate: OSM_NETWORK_DATA.importedAt?.slice(0, 10) ?? "1970-01-01",
            verified: false,
            notes: "OSM coordinates/topology. Station class, platform length, demand and operational rules require verification; new-station capacity and catchment demand are provisional game parameters.",
        },
    };
});
const importedIds = new Set(importedStations.map((s) => s.id));
const stationCatalog = [
    ...JAVA_STATION_CATALOG.filter((s) => !importedIds.has(s.id)).map((s) => ({
        ...s,
        kind: "station",
        connected: true,
        province: CORE_STATION_PROVINCE[s.id],
    })),
    ...curatedStations.filter((station) => !importedIds.has(station.id)),
    ...importedStations,
];
export const CORE_OPERATING_STATIONS = stationCatalog.map((station) => {
    if (station.kind === "junction")
        return station;
    const legacy = originalStations.get(station.id)?.demandProfile;
    const { profile, context } = stationDemandFor(station.code, station.name, legacy);
    return { ...station, demandProfile: profile, demandContext: context };
});
export const CORE_SELECTABLE_STATIONS = CORE_OPERATING_STATIONS.filter((s) => s.kind === "station");
/** Split game corridors at actual station points; never claim the chords are rail geometry. */
const schematicTracks = [];
const schematicRoutes = {};
for (const parent of CORE_GAME_CORRIDORS) {
    if (OSM_NETWORK_DATA.legacyRoutes[parent.id])
        continue;
    const stops = corridorStops[parent.id];
    if (!stops?.length)
        continue;
    const ids = [parent.originStationId, ...stops, parent.destinationStationId];
    const weights = ids.slice(1).map((to, index) => {
        const a = CORE_OPERATING_STATIONS.find((station) => station.id === ids[index]).coordinates;
        const b = CORE_OPERATING_STATIONS.find((station) => station.id === to).coordinates;
        return railDistance([a.lat, a.lng], [b.lat, b.lng]);
    });
    const total = weights.reduce((sum, km) => sum + km, 0);
    schematicRoutes[parent.id] = [];
    ids.slice(1).forEach((to, index) => {
        const id = `${parent.id}:stop:${ids[index]}:${to}`;
        schematicRoutes[parent.id].push(id);
        schematicTracks.push({ ...parent, id, name: `${CORE_OPERATING_STATIONS.find((station) => station.id === ids[index]).code} – ${CORE_OPERATING_STATIONS.find((station) => station.id === to).code}`,
            originStationId: ids[index], destinationStationId: to,
            distanceKm: parent.distanceKm * weights[index] / total,
            accessKeys: [parent.id], schematic: true,
            provenance: { source: "Game corridor interpolation using OSM station positions", sourceDate: "2026-10-02", verified: false,
                notes: "Schematic connection; distances are game estimates scaled to the parent corridor, not surveyed rail distances. Speed inherits the provisional game corridor limit." }, });
    });
}
const legacyIntermediateTracks = LEGACY_INTERMEDIATE_SEGMENTS.map((edge) => {
    const parent = JAVA_TRACK_CORRIDOR_SEGMENTS.find((track) => track.id === edge.parentId);
    return { ...parent, id: edge.id, originStationId: edge.from, destinationStationId: edge.to,
        distanceKm: edge.distanceKm, accessKeys: [edge.parentId], schematic: true,
        provenance: { source: "Preserved first intermediate-station game network", sourceDate: "2026-10-02", verified: false,
            notes: "Compatibility edge for saved routes; preserves the original schematic endpoints and game distance. Not used by new routing." },
    };
});
const legacyIntermediateIds = new Set(legacyIntermediateTracks.map((edge) => edge.id));
export const CORE_OPERATING_TRACKS = [
    ...CORE_GAME_CORRIDORS.map((s) => ({
        ...s,
        accessKeys: [s.id],
        schematic: !OSM_NETWORK_DATA.legacyRoutes[s.id],
    })),
    ...legacyIntermediateTracks,
    ...schematicTracks,
    ...OSM_NETWORK_DATA.segments.map((s) => ({
        id: s.id,
        name: `Lintas OSM ${s.from} – ${s.to}`,
        originStationId: s.from,
        destinationStationId: s.to,
        distanceKm: s.distanceKm,
        maxSpeedKmh: s.speedLimitKmh ?? 60,
        trackSpeedLimitKmh: s.speedLimitKmh ?? 60,
        isDoubleTrack: false,
        isElectrified: false,
        trackGaugeMm: 1067,
        geometry: s.geometry,
        gradientPermille: s.gradientPermille,
        accessKeys: s.accessKeys,
        schematic: false,
        provenance: {
            source: `OpenStreetMap ways ${s.osmWayIds.join(",")}`,
            sourceDate: OSM_NETWORK_DATA.importedAt?.slice(0, 10) ?? "1970-01-01",
            verified: false,
            notes: "OSM rail geometry; speed 60 km/h and conservative single-track reservation are provisional game rules, not verified signalling data.",
        },
    })),
];
export const CORE_ROUTING_TRACKS = CORE_OPERATING_TRACKS.filter((t) => !OSM_NETWORK_DATA.legacyRoutes[t.id] && !schematicRoutes[t.id] && !legacyIntermediateIds.has(t.id));
export const CORE_NETWORK_SOURCE = {
    importedAt: OSM_NETWORK_DATA.importedAt,
    importedStationCount: importedStations.filter((s) => s.kind === "station")
        .length,
    connectedStationCount: CORE_SELECTABLE_STATIONS.filter((s) => s.connected)
        .length,
    source: OSM_NETWORK_DATA.source,
    intermediateStationCount: curatedStations.length,
    gameCorridorCount: CORE_GAME_CORRIDORS.length,
};
export function operatingTrackAccessible(track, access) {
    return (access.includes(track.id) ||
        track.accessKeys.some((id) => access.includes(id)));
}
export function operatingTrackGeometry(id, from) {
    const track = CORE_OPERATING_TRACKS.find((t) => t.id === id);
    if (!track)
        return [];
    let points = track.geometry;
    const children = OSM_NETWORK_DATA.legacyRoutes[id] ?? schematicRoutes[id];
    if (!points && children) {
        let origin = track.originStationId;
        points = children.flatMap((child, i) => {
            const edge = CORE_OPERATING_TRACKS.find((t) => t.id === child);
            const shape = operatingTrackGeometry(child, origin);
            origin =
                edge.originStationId === origin
                    ? edge.destinationStationId
                    : edge.originStationId;
            return i ? shape.slice(1) : shape;
        });
    }
    if (!points)
        points = [track.originStationId, track.destinationStationId].map((id) => {
            const s = CORE_OPERATING_STATIONS.find((s) => s.id === id);
            return [s.coordinates.lat, s.coordinates.lng];
        });
    return from && from !== track.originStationId
        ? [...points].reverse()
        : [...points];
}
export function railDistance(a, b) {
    const radians = Math.PI / 180, lat = (b[0] - a[0]) * radians, lng = (b[1] - a[1]) * radians;
    const h = Math.sin(lat / 2) ** 2 +
        Math.cos(a[0] * radians) *
            Math.cos(b[0] * radians) *
            Math.sin(lng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
/** Follow a rail polyline by travelled distance, rather than endpoint interpolation. */
export function pointAlongRail(points, fraction) {
    if (!points.length)
        throw new Error("Rail geometry is empty.");
    if (points.length === 1)
        return [...points[0]];
    const lengths = points.slice(1).map((p, i) => railDistance(points[i], p));
    let remaining = Math.max(0, Math.min(1, fraction)) *
        lengths.reduce((sum, value) => sum + value, 0);
    for (let i = 0; i < lengths.length; i++) {
        const length = lengths[i];
        if (remaining <= length && length > 0) {
            const a = points[i], b = points[i + 1], ratio = remaining / length;
            return [a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio];
        }
        remaining -= length;
    }
    return [...points.at(-1)];
}
//# sourceMappingURL=operating-network.js.map