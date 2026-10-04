import { describe, expect, it } from "vitest";
import {
  dropFormationUnits,
  groupFormationUnits,
} from "../src/core/formation-draft";
const units = [
  { id: "loco", productId: "cc201" },
  ...[1, 2, 3, 4].map((i) => ({ id: `coach${i}`, productId: "ec-standard" })),
  { id: "power", productId: "generator" },
];
describe("formation drag and drop", () => {
  it("groups available stock cards while retaining each unit identity", () => {
    expect(groupFormationUnits(units)).toEqual([
      { productId: "cc201", unitIds: ["loco"] },
      {
        productId: "ec-standard",
        unitIds: ["coach1", "coach2", "coach3", "coach4"],
      },
      { productId: "generator", unitIds: ["power"] },
    ]);
  });
  it("transfers one available copy at the chosen position without grouping the consist", () => {
    let draft = ["loco", "coach1", "power"];
    draft = dropFormationUnits(
      draft,
      units,
      { source: "inventory", productId: "ec-standard" },
      { area: "formation", before: "power" },
    );
    expect(draft).toEqual(["loco", "coach1", "coach2", "power"]);
    draft = dropFormationUnits(
      draft,
      units,
      { source: "inventory", productId: "ec-standard" },
      { area: "formation" },
    );
    expect(draft).toEqual(["loco", "coach1", "coach2", "power", "coach3"]);
    draft = dropFormationUnits(
      draft,
      units,
      { source: "inventory", productId: "ec-standard" },
      { area: "formation" },
    );
    expect(new Set(draft).size).toBe(6);
    expect(
      dropFormationUnits(
        draft,
        units,
        { source: "inventory", productId: "ec-standard" },
        { area: "formation" },
      ),
    ).toEqual(draft);
  });
  it("reorders a specific coach independently of identical neighbours", () => {
    const draft = units.map((u) => u.id);
    const moved = dropFormationUnits(
      draft,
      units,
      { source: "formation", productId: "ec-standard", unitId: "coach3" },
      { area: "formation", before: "coach1" },
    );
    expect(moved).toEqual([
      "loco",
      "coach3",
      "coach1",
      "coach2",
      "coach4",
      "power",
    ]);
    expect(
      dropFormationUnits(
        moved,
        units,
        { source: "formation", productId: "ec-standard", unitId: "coach3" },
        { area: "formation" },
      ),
    ).toEqual(["loco", "coach1", "coach2", "coach4", "power", "coach3"]);
    expect(
      dropFormationUnits(
        draft,
        units,
        { source: "formation", productId: "ec-standard", unitId: "coach1" },
        { area: "formation", before: "coach1" },
      ),
    ).toEqual(draft);
  });
  it("returns only the selected unit and leaves identical coaches in formation", () => {
    const draft = units.map((u) => u.id);
    expect(
      dropFormationUnits(
        draft,
        units,
        { source: "formation", productId: "ec-standard", unitId: "coach2" },
        { area: "inventory" },
      ),
    ).toEqual(["loco", "coach1", "coach3", "coach4", "power"]);
    expect(
      dropFormationUnits(
        draft,
        units,
        { source: "inventory", productId: "ec-standard" },
        { area: "inventory" },
      ),
    ).toEqual(draft);
    expect(draft).toEqual(units.map((u) => u.id));
  });
  it("ignores unavailable products, wrong unit identities and units already assigned elsewhere", () => {
    expect(
      dropFormationUnits(
        ["loco"],
        units,
        { source: "inventory", productId: "missing" },
        { area: "formation" },
      ),
    ).toEqual(["loco"]);
    expect(
      dropFormationUnits(
        ["loco", "coach1"],
        units,
        { source: "formation", productId: "cc201", unitId: "coach1" },
        { area: "inventory" },
      ),
    ).toEqual(["loco", "coach1"]);
    expect(
      dropFormationUnits(
        ["loco"],
        units,
        { source: "formation", productId: "ec-standard", unitId: "coach1" },
        { area: "formation" },
      ),
    ).toEqual(["loco"]);
  });
});
