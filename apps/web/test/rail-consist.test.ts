import { describe, expect, it } from "vitest";
import { railConsistLayout, travelledRail } from "../src/core/rail-consist";
describe("map consist geometry", () => {
  it("places the locomotive at the motion head and gives every unit its own scaled length", () => {
    const layout = railConsistLayout(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      [16, 20, 20, 20, 20, 20],
      1,
    );
    expect(layout).toHaveLength(6);
    expect(layout[0]).toMatchObject({ x: 100, y: 0, width: 16, angle: 0 });
    expect(layout[1]).toMatchObject({ x: 80, y: 0, width: 20 });
    expect(layout[5]!.x).toBeLessThan(layout[4]!.x);
  });
  it("wraps the tail around a curve rather than drawing one straight sprite", () => {
    const layout = railConsistLayout(
      [
        { x: 0, y: 0 },
        { x: 80, y: 0 },
        { x: 80, y: 30 },
      ],
      [20, 20, 20],
      1,
    );
    expect(layout[0]).toMatchObject({ x: 80, y: 30, angle: 90 });
    expect(layout[1]).toMatchObject({ x: 80, y: 8, angle: 90 });
    expect(layout[2]).toMatchObject({ x: 66, y: 0, angle: 0 });
  });
  it("extends behind the starting station and uses reverse-travel direction", () => {
    const layout = railConsistLayout([{ x: 100, y: 0 }], [20, 20], 1, {
      x: -1,
      y: 0,
    });
    expect(layout[0]).toMatchObject({ x: 100, y: 0, angle: 180 });
    expect(layout[1]).toMatchObject({ x: 122, y: 0, angle: 180 });
    expect(railConsistLayout([], [], 1)).toEqual([]);
  });
  it("trims a geospatial polyline to the current distance fraction", () => {
    expect(
      travelledRail(
        [
          [0, 0],
          [0, 1],
          [0, 2],
        ],
        0.75,
      ),
    ).toEqual([
      [0, 0],
      [0, 1],
      [0, 1.5],
    ]);
    expect(
      travelledRail(
        [
          [0, 0],
          [0, 1],
        ],
        0,
      ),
    ).toEqual([
      [0, 0],
      [0, 0],
    ]);
    expect(
      travelledRail(
        [
          [0, 0],
          [0, 1],
        ],
        1,
      ),
    ).toEqual([
      [0, 0],
      [0, 1],
    ]);
  });
});
