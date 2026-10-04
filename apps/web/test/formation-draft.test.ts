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
  it("displays one card per product and retains each unit identity", () => {
    expect(groupFormationUnits(units)).toEqual([
      { productId: "cc201", unitIds: ["loco"] },
      {
        productId: "ec-standard",
        unitIds: ["coach1", "coach2", "coach3", "coach4"],
      },
      { productId: "generator", unitIds: ["power"] },
    ]);
  });
  it("transfers one available copy and consolidates repeated units", () => {
    let draft = ["loco", "coach1", "power"];
    for (let i = 2; i <= 4; i++)
      draft = dropFormationUnits(
        draft,
        units,
        { source: "inventory", productId: "ec-standard" },
        { area: "formation" },
      );
    expect(draft).toEqual([
      "loco",
      "coach1",
      "coach2",
      "coach3",
      "coach4",
      "power",
    ]);
    expect(
      dropFormationUnits(
        draft,
        units,
        { source: "inventory", productId: "ec-standard" },
        { area: "formation" },
      ),
    ).toEqual(draft);
    expect(new Set(draft).size).toBe(6);
  });
  it("moves the entire grouped block before another card or to the end", () => {
    const draft = units.map((u) => u.id);
    const moved = dropFormationUnits(
      draft,
      units,
      { source: "formation", productId: "generator" },
      { area: "formation", before: "ec-standard" },
    );
    expect(moved).toEqual([
      "loco",
      "power",
      "coach1",
      "coach2",
      "coach3",
      "coach4",
    ]);
    expect(
      dropFormationUnits(
        moved,
        units,
        { source: "formation", productId: "generator" },
        { area: "formation" },
      ),
    ).toEqual(draft);
    expect(
      dropFormationUnits(
        draft,
        units,
        { source: "formation", productId: "ec-standard" },
        { area: "formation", before: "ec-standard" },
      ),
    ).toEqual(draft);
  });
  it("returns a whole group without removing other products", () => {
    const draft = units.map((u) => u.id);
    expect(
      dropFormationUnits(
        draft,
        units,
        { source: "formation", productId: "ec-standard" },
        { area: "inventory" },
      ),
    ).toEqual(["loco", "power"]);
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
  it("ignores unavailable products and never introduces unknown unit ids", () => {
    expect(
      dropFormationUnits(
        ["loco"],
        units,
        { source: "inventory", productId: "missing" },
        { area: "formation" },
      ),
    ).toEqual(["loco"]);
  });
});
