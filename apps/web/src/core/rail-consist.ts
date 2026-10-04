import {
  railDistance,
  pointAlongRail,
  type RailPoint,
} from "@railway/game-data";
export type PixelPoint = { x: number; y: number };
/** Retain travelled vertices, so the train's tail follows curves and previous legs. */
export function travelledRail(
  points: readonly RailPoint[],
  fraction: number,
): RailPoint[] {
  if (points.length < 2) return [...points];
  const lengths = points.slice(1).map((p, i) => railDistance(points[i]!, p));
  let remaining =
    Math.max(0, Math.min(1, fraction)) * lengths.reduce((sum, n) => sum + n, 0);
  const result: RailPoint[] = [points[0]!];
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i]!) {
      result.push(
        pointAlongRail(
          [points[i]!, points[i + 1]!],
          lengths[i]! ? remaining / lengths[i]! : 0,
        ),
      );
      return result;
    }
    result.push(points[i + 1]!);
    remaining -= lengths[i]!;
  }
  return result;
}
/** Readable schematic lengths in screen pixels, not a second simulation of train motion. */
export function railConsistLayout(
  trail: readonly PixelPoint[],
  lengths: readonly number[],
  scale: number,
  forward: PixelPoint = { x: 1, y: 0 },
) {
  if (!trail.length) return [];
  const segments = trail
    .slice(1)
    .map((point, i) => ({
      from: trail[i]!,
      to: point,
      length: Math.hypot(point.x - trail[i]!.x, point.y - trail[i]!.y),
    }))
    .filter((s) => s.length > 0.001);
  const first = segments[0];
  const direction = first
    ? {
        x: (first.to.x - first.from.x) / first.length,
        y: (first.to.y - first.from.y) / first.length,
      }
    : (() => {
        const d = Math.hypot(forward.x, forward.y) || 1;
        return { x: forward.x / d, y: forward.y / d };
      })();
  const at = (distance: number) => {
    let remaining = distance;
    for (let i = segments.length - 1; i >= 0; i--) {
      const segment = segments[i]!;
      if (remaining <= segment.length) {
        const ratio = remaining / segment.length;
        return {
          x: segment.to.x + (segment.from.x - segment.to.x) * ratio,
          y: segment.to.y + (segment.from.y - segment.to.y) * ratio,
          angle:
            (Math.atan2(
              segment.to.y - segment.from.y,
              segment.to.x - segment.from.x,
            ) *
              180) /
            Math.PI,
        };
      }
      remaining -= segment.length;
    }
    const origin = trail[0]!;
    return {
      x: origin.x - direction.x * remaining,
      y: origin.y - direction.y * remaining,
      angle: (Math.atan2(direction.y, direction.x) * 180) / Math.PI,
    };
  };
  let behind = 0,
    previous = 0;
  return lengths.map((length, index) => {
    const width = Math.max(12, length * scale);
    if (index) behind += previous / 2 + width / 2 + 2;
    previous = width;
    return { ...at(behind), width };
  });
}
