/** Provisional longitudinal train model; operational caps take precedence over terrain. */
export interface TrainMotion {
  entryKmh: number;
  peakKmh: number;
  exitKmh: number;
  accelerationMps2: number;
  brakingMps2: number;
  accelerationSeconds: number;
  cruiseSeconds: number;
  brakingSeconds: number;
  distanceKm: number;
  gradientPermille: number | null;
}
export interface MotionSection {
  km: number;
  speed: number;
  commercialStop?: boolean;
  gradientPermille?: number;
}
export function buildTrainMotion(
  sections: readonly MotionSection[],
  massTons: number,
  startKmh = 0,
): TrainMotion[] {
  const acceleration = sections.map((s) =>
    Math.max(
      0.04,
      Math.min(0.6, (0.35 * 268) / Math.max(1, massTons)) -
        (9.81 * (s.gradientPermille ?? 0)) / 1000,
    ),
  );
  const braking = sections.map((s) =>
    Math.max(0.1, 0.55 + (9.81 * (s.gradientPermille ?? 0)) / 1000),
  );
  const boundary = [
    startKmh / 3.6,
    ...sections.map((s, i) =>
      i === sections.length - 1 || s.commercialStop !== false
        ? 0
        : Math.min(s.speed, sections[i + 1]!.speed) / 3.6,
    ),
  ];
  for (let i = 0; i < sections.length; i++)
    boundary[i + 1] = Math.min(
      boundary[i + 1]!,
      Math.sqrt(
        boundary[i]! ** 2 + 2 * acceleration[i]! * sections[i]!.km * 1000,
      ),
    );
  for (let i = sections.length - 1; i >= 0; i--)
    boundary[i] = Math.min(
      boundary[i]!,
      Math.sqrt(
        boundary[i + 1]! ** 2 + 2 * braking[i]! * sections[i]!.km * 1000,
      ),
    );
  return sections.map((s, i) => {
    const entry = boundary[i]!,
      exit = boundary[i + 1]!,
      a = acceleration[i]!,
      b = braking[i]!,
      meters = s.km * 1000;
    const peak = Math.min(
      s.speed / 3.6,
      Math.sqrt(
        (2 * a * b * meters + b * entry ** 2 + a * exit ** 2) / (a + b),
      ),
    );
    const accelerationSeconds = Math.max(0, (peak - entry) / a),
      brakingSeconds = Math.max(0, (peak - exit) / b);
    const accelerationMeters = ((entry + peak) * accelerationSeconds) / 2,
      brakingMeters = ((exit + peak) * brakingSeconds) / 2;
    return {
      entryKmh: entry * 3.6,
      peakKmh: peak * 3.6,
      exitKmh: exit * 3.6,
      accelerationMps2: a,
      brakingMps2: b,
      accelerationSeconds,
      cruiseSeconds:
        Math.max(0, meters - accelerationMeters - brakingMeters) /
        Math.max(0.001, peak),
      brakingSeconds,
      distanceKm: s.km,
      gradientPermille: s.gradientPermille ?? null,
    };
  });
}
export function motionMinutes(m: TrainMotion) {
  return (m.accelerationSeconds + m.cruiseSeconds + m.brakingSeconds) / 60;
}
export function sampleTrainMotion(m: TrainMotion, elapsedSeconds: number) {
  let t = Math.max(0, elapsedSeconds),
    meters = 0,
    speed = m.entryKmh / 3.6;
  const accelerationTime = Math.min(t, m.accelerationSeconds);
  meters +=
    speed * accelerationTime + (m.accelerationMps2 * accelerationTime ** 2) / 2;
  speed += m.accelerationMps2 * accelerationTime;
  t -= accelerationTime;
  const cruiseTime = Math.min(t, m.cruiseSeconds);
  meters += speed * cruiseTime;
  t -= cruiseTime;
  const brakingTime = Math.min(t, m.brakingSeconds);
  meters += speed * brakingTime - (m.brakingMps2 * brakingTime ** 2) / 2;
  speed -= m.brakingMps2 * brakingTime;
  return {
    fraction: Math.max(0, Math.min(1, meters / (m.distanceKm * 1000))),
    speedKmh: Math.max(0, speed * 3.6),
    phase:
      elapsedSeconds < m.accelerationSeconds
        ? "Akselerasi"
        : elapsedSeconds < m.accelerationSeconds + m.cruiseSeconds
          ? "Jelajah"
          : "Pengereman",
  };
}
