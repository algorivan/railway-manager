import { describe, expect, it } from "vitest";
import { CORE_STORY_CAMPAIGN, CORE_STORY_BEATS, storyText } from "../src/catalog/story-campaign.js";
import { validateStoryGraph } from "../src/catalog/story-validation.js";

describe("authored campaign graph", () => {
  it("has no missing targets, dead ends, invalid memories or untranslated story lines", () => {
    expect(validateStoryGraph()).toEqual([]);
  });

  it("walks every choice route to an ending, with no skipped or trapped chapter", () => {
    const chapters = CORE_STORY_CAMPAIGN.chapters;
    const paths: string[][] = [];
    function walk(id: string, path: string[]) {
      if (id === "END") { paths.push(path); return; }
      const chapter = chapters.find((c) => c.id === id);
      expect(chapter, `missing target ${id}`).toBeDefined();
      expect(path.some((step) => step.startsWith(`${id}/`)), `cycle at ${id}`).toBe(false);
      for (const choice of chapter!.choices) walk(choice.next!, [...path, `${id}/${choice.id}`]);
    }
    walk(chapters[0]!.id, []);
    expect(paths).toHaveLength(32);
    expect(paths.every((path) => path.length === 5)).toBe(true);
    expect(new Set(paths.map((path) => path.join("|"))).size).toBe(32);
  });

  it("detects a broken exit or a reference to a choice that cannot precede a scene", () => {
    const missing = structuredClone(CORE_STORY_CAMPAIGN.chapters);
    missing[0]!.choices[0]!.next = "missing";
    expect(validateStoryGraph(missing).some((p) => p.includes("Missing target"))).toBe(true);
    const memory = structuredClone(CORE_STORY_CAMPAIGN.chapters);
    memory[1]!.callbacks![0]!.when.choiceId = "not-declared";
    expect(validateStoryGraph(memory).some((p) => p.includes("Unknown narrative memory"))).toBe(true);
  });

  it("teaches first, includes recovery, and places a briefing rest before the climax", () => {
    expect(CORE_STORY_BEATS[0].type).toBe("teach");
    const climax = CORE_STORY_BEATS.findIndex((beat) => beat.type === "climax");
    expect(CORE_STORY_BEATS[climax - 1]?.type).toBe("rest");
    expect(CORE_STORY_BEATS.some((beat) => beat.id === "depot-decision" && beat.type === "rest")).toBe(true);
  });

  it("uses stable line IDs with an Indonesian fallback and visible missing-key diagnostics", () => {
    expect(storyText(CORE_STORY_CAMPAIGN.title)).toBe("Jalur Kepercayaan");
    expect(storyText(CORE_STORY_CAMPAIGN.title, "en")).toBe("Jalur Kepercayaan");
    expect(storyText("story.missing")).toBe("<MISSING:story.missing>");
  });
});
