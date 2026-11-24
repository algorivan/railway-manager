import { CORE_STORY_CAMPAIGN, CORE_STORY_STRINGS, type StoryChapter } from "./story-campaign.js";

/** Checks the small, typed narrative graph; no expressions or eval are accepted. */
export function validateStoryGraph(chapters: readonly StoryChapter[] = CORE_STORY_CAMPAIGN.chapters): string[] {
  const problems: string[] = [];
  const ids = new Set(chapters.map((c) => c.id));
  if (ids.size !== chapters.length) problems.push("Chapter IDs must be unique.");
  if (!chapters.length) return ["The campaign needs a starting chapter."];
  const checkLine = (key: string) => { if (!CORE_STORY_STRINGS.id?.[key]) problems.push(`Missing line: ${key}`); };
  for (const [index, chapter] of chapters.entries()) {
    [chapter.title, chapter.subtitle, chapter.character, chapter.role, chapter.briefing, chapter.dialogue].forEach(checkLine);
    if (!chapter.choices.length) problems.push(`No exit: ${chapter.id}`);
    if (new Set(chapter.choices.map((c) => c.id)).size !== chapter.choices.length) problems.push(`Duplicate choice: ${chapter.id}`);
    for (const choice of chapter.choices) {
      [choice.title, choice.description, choice.outcome, ...choice.goals.map((g) => g.label)].forEach(checkLine);
      if (!choice.next || (choice.next !== "END" && !ids.has(choice.next))) problems.push(`Missing target: ${chapter.id}/${choice.id}`);
      // This season deliberately branches within chapters and rejoins the next briefing.
      if (choice.next !== (chapters[index + 1]?.id ?? "END")) problems.push(`Out-of-order target: ${chapter.id}/${choice.id}`);
      if (!choice.goals.length || choice.goals.some((g) => !Number.isFinite(g.target) || g.target <= 0)) problems.push(`Invalid goal: ${chapter.id}/${choice.id}`);
      if (![choice.cash, choice.xp].every((n) => Number.isSafeInteger(n) && n >= 0)) problems.push(`Invalid reward: ${chapter.id}/${choice.id}`);
    }
    for (const callback of chapter.callbacks ?? []) {
      checkLine(callback.speaker); checkLine(callback.line);
      const earlier = chapters.findIndex((c) => c.id === callback.when.chapterId);
      if (earlier < 0 || earlier >= index || !chapters[earlier]?.choices.some((c) => c.id === callback.when.choiceId))
        problems.push(`Unknown narrative memory: ${chapter.id}`);
    }
  }
  const reached = new Set<string>(), pending = [chapters[0]!.id];
  while (pending.length) {
    const id = pending.pop()!;
    if (id === "END" || reached.has(id)) continue;
    const node = chapters.find((c) => c.id === id);
    if (!node) continue;
    reached.add(id);
    pending.push(...node.choices.flatMap((c) => c.next ? [c.next] : []));
  }
  for (const id of ids) if (!reached.has(id)) problems.push(`Unreachable chapter: ${id}`);
  return problems;
}
