/** User-supplied game operating caps, 2026-10-03; not verified official track limits. */
export const CORE_SECTION_SPEED_RULES = [
  ["GMR", "CKP", 90],
  ["CKP", "PWK", 60],
  ["PWK", "CMI", 30],
  ["CMI", "CCL", 110],
  ["CCL", "CAW", 45],
  ["CAW", "MA", 90],
  ["MA", "KYA", 110],
  ["KYA", "WT", 90],
  ["WT", "YK", 60],
  ["YK", "SLO", 110],
  ["SLO", "MN", 110],
  ["MN", "KTS", 90],
  ["KTS", "BL", 90],
  ["BL", "KPN", 60],
  ["KPN", "SB", 90],
  ["WO", "KTS", 110],
  ["BG", "PB", 110],
  ["PB", "LEC", 90],
  ["LEC", "MLS", 45],
  ["MLS", "KK", 60],
  ["KK", "KTK", 90],
  ["KTK", "LDO", 45],
  ["LDO", "KBR", 60],
  ["KBR", "RGP", 110],
  ["RGP", "KTG", 90],
  ["SB", "SMT", 110],
  ["SMT", "CKP", 110],
  ["SMT", "GD", 110],
  ["GD", "SLO", 90],
] as const;
type Edge = {
  id: string;
  originStationId: string;
  destinationStationId: string;
  distanceKm: number;
};
export const speedPairKey = (a: string, b: string) => [a, b].sort().join("|");
/** Distance chooses the connected corridor path; never apply a geographical straight-line shortcut. */
export function sectionSpeedPath<T extends Edge>(
  from: string,
  to: string,
  tracks: readonly T[],
): T[] {
  const distance = new Map([[from, 0]]),
    visited = new Set<string>(),
    previous = new Map<string, { station: string; edge: T }>();
  while (true) {
    const next = [...distance]
      .filter(([id]) => !visited.has(id))
      .sort((a, b) => a[1] - b[1])[0];
    if (!next)
      throw new Error(`Speed section is disconnected: ${from} – ${to}`);
    const [station, km] = next;
    if (station === to) break;
    visited.add(station);
    for (const edge of tracks) {
      const dest =
        edge.originStationId === station
          ? edge.destinationStationId
          : edge.destinationStationId === station
            ? edge.originStationId
            : undefined;
      if (dest && km + edge.distanceKm < (distance.get(dest) ?? Infinity)) {
        distance.set(dest, km + edge.distanceKm);
        previous.set(dest, { station, edge });
      }
    }
  }
  const result: T[] = [];
  let current = to;
  while (current !== from) {
    const step = previous.get(current)!;
    result.unshift(step.edge);
    current = step.station;
  }
  return result;
}
export function deriveSectionSpeedLimits(
  stations: readonly { id: string; code: string }[],
  tracks: readonly Edge[],
) {
  const byPair = new Map<string, number>();
  const coverage = CORE_SECTION_SPEED_RULES.map(
    ([fromCode, toCode, speedKmh]) => {
      const from = stations.find((s) => s.code === fromCode),
        to = stations.find((s) => s.code === toCode);
      if (!from || !to)
        throw new Error(`Missing speed boundary: ${fromCode} – ${toCode}`);
      const path = sectionSpeedPath(from.id, to.id, tracks);
      for (const edge of path) {
        const key = speedPairKey(
          edge.originStationId,
          edge.destinationStationId,
        );
        byPair.set(key, Math.min(byPair.get(key) ?? Infinity, speedKmh));
      }
      return {
        fromCode,
        toCode,
        speedKmh,
        distanceKm: path.reduce((sum, edge) => sum + edge.distanceKm, 0),
        segmentIds: path.map((edge) => edge.id),
      };
    },
  );
  return { byPair, coverage };
}
