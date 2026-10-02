import { describe, expect, it } from "vitest";
import {
  buildTrainMotion,
  motionMinutes,
  sampleTrainMotion,
} from "../src/engine/train-motion.js";

describe("train acceleration and braking", () => {
  it("accelerates from rest, cruises below the cap, and stops at the destination", () => {
    const m = buildTrainMotion([{ km: 10, speed: 100 }], 268)[0]!;
    expect(sampleTrainMotion(m, 0).speedKmh).toBe(0);
    expect(sampleTrainMotion(m, 10).speedKmh).toBeGreaterThan(0);
    expect(sampleTrainMotion(m, 10).speedKmh).toBeLessThan(100);
    expect(
      sampleTrainMotion(m, m.accelerationSeconds + 10).speedKmh,
    ).toBeCloseTo(100);
    const stopped = sampleTrainMotion(m, motionMinutes(m) * 60);
    expect(stopped.fraction).toBeCloseTo(1);
    expect(stopped.speedKmh).toBeCloseTo(0);
    expect(motionMinutes(m)).toBeGreaterThan(6);
  });
  it("does not reach the cap on a short interstation section", () => {
    const m = buildTrainMotion([{ km: 0.1, speed: 120 }], 268)[0]!;
    expect(m.peakKmh).toBeLessThan(120);
    expect(m.cruiseSeconds).toBeCloseTo(0);
    expect(sampleTrainMotion(m, motionMinutes(m) * 60).fraction).toBeCloseTo(1);
  });
  it("passes non-commercial nodes but brakes before a lower speed limit", () => {
    const result = buildTrainMotion(
      [
        { km: 10, speed: 120, commercialStop: false },
        { km: 1, speed: 40 },
      ],
      268,
    );
    expect(result[0]!.exitKmh).toBeGreaterThan(0);
    expect(result[0]!.exitKmh).toBeLessThanOrEqual(40);
    expect(result[1]!.entryKmh).toBeCloseTo(result[0]!.exitKmh);
    expect(result[1]!.exitKmh).toBe(0);
    const stopped = buildTrainMotion(
      [
        { km: 10, speed: 100 },
        { km: 10, speed: 100 },
      ],
      268,
    );
    expect(stopped[0]!.exitKmh).toBe(0);
    expect(stopped[1]!.entryKmh).toBe(0);
  });
  it("uses known uphill grades and mass without inventing absent terrain", () => {
    const flat = buildTrainMotion([{ km: 2, speed: 100 }], 268)[0]!;
    const uphill = buildTrainMotion(
      [{ km: 2, speed: 100, gradientPermille: 15 }],
      268,
    )[0]!;
    const heavy = buildTrainMotion([{ km: 2, speed: 100 }], 500)[0]!;
    expect(flat.gradientPermille).toBeNull();
    expect(uphill.accelerationMps2).toBeLessThan(flat.accelerationMps2);
    expect(heavy.accelerationMps2).toBeLessThan(flat.accelerationMps2);
    expect(motionMinutes(uphill)).toBeGreaterThan(motionMinutes(flat));
  });
});
