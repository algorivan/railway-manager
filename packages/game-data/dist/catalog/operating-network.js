import { JAVA_STATION_CATALOG } from "./stations.js";
import { JAVA_TRACK_CORRIDOR_SEGMENTS } from "./tracks.js";
import { CORE_STATION_PROVINCE } from "./gameplay-v7.js";
import { OSM_NETWORK_DATA } from "./osm-network-data.js";
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
            notes: "OSM coordinates/topology. Station class, platform length, demand and operational rules require verification; new-station capacity/demand are provisional game defaults.",
        },
    };
});
const importedIds = new Set(importedStations.map((s) => s.id));
export const CORE_OPERATING_STATIONS = [
    ...JAVA_STATION_CATALOG.filter((s) => !importedIds.has(s.id)).map((s) => ({
        ...s,
        kind: "station",
        connected: true,
        province: CORE_STATION_PROVINCE[s.id],
    })),
    ...importedStations,
];
export const CORE_SELECTABLE_STATIONS = CORE_OPERATING_STATIONS.filter((s) => s.kind === "station");
export const CORE_OPERATING_TRACKS = [
    ...JAVA_TRACK_CORRIDOR_SEGMENTS.map((s) => ({
        ...s,
        accessKeys: [s.id],
        schematic: !OSM_NETWORK_DATA.legacyRoutes[s.id],
    })),
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
export const CORE_ROUTING_TRACKS = CORE_OPERATING_TRACKS.filter((t) => !OSM_NETWORK_DATA.legacyRoutes[t.id]);
export const CORE_NETWORK_SOURCE = {
    importedAt: OSM_NETWORK_DATA.importedAt,
    importedStationCount: importedStations.filter((s) => s.kind === "station")
        .length,
    connectedStationCount: CORE_SELECTABLE_STATIONS.filter((s) => s.connected)
        .length,
    source: OSM_NETWORK_DATA.source,
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
    const children = OSM_NETWORK_DATA.legacyRoutes[id];
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