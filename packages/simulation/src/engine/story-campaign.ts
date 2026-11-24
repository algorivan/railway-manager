import { z } from "zod";
import { CORE_STORY_CAMPAIGN, CORE_PRODUCTS, storyText, type StoryChapter, type StoryMetric } from "@railway/game-data";
import type { CoreState, CoreRun } from "./core-v7.js";

const chapters: readonly StoryChapter[] = CORE_STORY_CAMPAIGN.chapters;
export interface StoryProgress {
  version: 1;
  chapterIndex: number;
  startedAt: number;
  chapterStartedAt: number;
  choiceId?: string;
  baselineRunIds: string[];
  history: {
    chapterId: string;
    choiceId: string;
    completedAt: number;
    values: number[];
  }[];
}
const minute = z.number().finite().nonnegative();
export const storyProgressSchema = z.object({
  version: z.literal(1),
  chapterIndex: z.number().int().min(0).max(chapters.length),
  startedAt: minute,
  chapterStartedAt: minute,
  choiceId: z.string().optional(),
  baselineRunIds: z.array(z.string()),
  history: z.array(z.object({
    chapterId: z.string(), choiceId: z.string(), completedAt: minute,
    values: z.array(z.number().finite().nonnegative()),
  })).max(chapters.length),
});

export function startStoryCampaign(s: CoreState) {
  if (s.story) throw new Error("Campaign cerita sudah dimulai.");
  s.story = { version: 1, chapterIndex: 0, startedAt: s.minute,
    chapterStartedAt: s.minute, baselineRunIds: [], history: [] };
}

export function chooseStoryApproach(s: CoreState, choiceId: string) {
  const progress = s.story;
  if (!progress) throw new Error("Mulai campaign cerita terlebih dahulu.");
  const chapter = chapters[progress.chapterIndex];
  if (!chapter) throw new Error("Musim campaign sudah selesai.");
  if (progress.choiceId) throw new Error("Pendekatan bab ini sudah dipilih.");
  if (!chapter.choices.some((c) => c.id === choiceId)) throw new Error("Pilihan skenario tidak tersedia.");
  progress.choiceId = choiceId;
  progress.chapterStartedAt = s.minute;
  // Existing/ongoing runs cannot be used to complete a newly accepted scenario.
  progress.baselineRunIds = s.runs.map((r) => r.id);
}

export function continueStoryCampaign(s: CoreState) {
  const p = s.story;
  if (!p || p.chapterIndex >= chapters.length || p.history.length !== p.chapterIndex + 1)
    throw new Error("Selesaikan tujuan bab sebelum melanjutkan cerita.");
  const next = chapters[p.chapterIndex]!.choices.find((c) => c.id === p.choiceId)?.next;
  if (next !== (chapters[p.chapterIndex + 1]?.id ?? "END")) throw new Error("Alur campaign tidak valid.");
  p.chapterIndex = next === "END" ? chapters.length : chapters.findIndex((c) => c.id === next);
  delete p.choiceId;
  p.chapterStartedAt = s.minute;
  p.baselineRunIds = [];
}

/** Recovery path: revise the plan without resetting the run baseline or farming rewards. */
export function replanStoryApproach(s: CoreState, choiceId: string) {
  const p = s.story;
  if (!p?.choiceId || p.history.length > p.chapterIndex) throw new Error("Pendekatan hanya dapat ditinjau saat bab masih aktif.");
  const chapter = chapters[p.chapterIndex];
  if (!chapter?.choices.some((c) => c.id === choiceId)) throw new Error("Pilihan skenario tidak tersedia.");
  p.choiceId = choiceId;
}

export function coreStoryCallbacks(s: CoreState) {
  return (chapters[s.story?.chapterIndex ?? -1]?.callbacks ?? []).filter((callback) =>
    s.story?.history.some((h) => h.chapterId === callback.when.chapterId && h.choiceId === callback.when.choiceId));
}

function scenarioRuns(s: CoreState): CoreRun[] {
  const p = s.story!;
  const baseline = new Set(p.baselineRunIds);
  return s.runs.filter((r) => !baseline.has(r.id) && r.start >= p.chapterStartedAt &&
    r.end <= s.minute && r.status === "completed" && !r.recalling &&
    !r.cargoContractId && r.passengerKm > 0);
}

function roundTrips(runs: CoreRun[]) {
  const ordered = [...runs].sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
  const used = new Set<string>();
  let count = 0;
  for (let i = 0; i < ordered.length; i++) {
    const first = ordered[i]!;
    if (used.has(first.id)) continue;
    const back = ordered.slice(i + 1).find((r) => !used.has(r.id) &&
      r.trainsetId === first.trainsetId && r.serviceId === first.serviceId &&
      r.origin === first.destination && r.destination === first.origin && r.start >= first.end);
    if (back) { used.add(first.id); used.add(back.id); count++; }
  }
  return count;
}

export function storyMetrics(s: CoreState): Record<StoryMetric, number> {
  const runs = s.story ? scenarioRuns(s) : [];
  const assigned = new Set(s.trainsets.flatMap((t) => t.units));
  const locoIds = new Set(CORE_PRODUCTS.filter((p) => p.kind === "loco").map((p) => p.id));
  return {
    trips: runs.length,
    roundTrips: roundTrips(runs),
    relations: new Set(runs.map((r) => r.serviceId)).size,
    punctualTrips: runs.filter((r) => r.delay <= 10).length,
    stations: new Set(runs.flatMap((r) => [r.origin, ...r.legs.filter((l) => l.commercialStop !== false).map((l) => l.to)])).size,
    profitableTrips: runs.filter((r) => r.revenue > r.cost).length,
    depotFuel: Math.floor(s.depots.reduce((n, d) => n + d.stock, 0)),
    spareLocos: s.units.filter((u) => locoIds.has(u.productId) && !u.job && u.condition >= 70 && !assigned.has(u.id)).length,
    trainsets: s.trainsets.length,
  };
}

export function coreStoryStatus(s: CoreState) {
  if (!s.story) return null;
  const chapter = chapters[s.story.chapterIndex];
  const choice = chapter?.choices.find((c) => c.id === s.story!.choiceId);
  const completion = s.story.history.find((h) => h.chapterId === chapter?.id);
  const metrics = choice && !completion ? storyMetrics(s) : null;
  return {
    chapter, choice, completion, finished: !chapter,
    goals: choice?.goals.map((goal, i) => ({ ...goal,
      current: completion?.values[i] ?? metrics?.[goal.metric] ?? 0 })) ?? [],
  };
}

export function coreStoryXp(s: CoreState) {
  return (s.story?.history ?? []).reduce((xp, h) =>
    xp + (chapters.find((c) => c.id === h.chapterId)?.choices.find((c) => c.id === h.choiceId)?.xp ?? 0), 0);
}

/** Called only on owned clones, after events/commands. Grants are not operating revenue. */
export function settleStoryCampaign(s: CoreState, pay: (id: string, label: string, cash: number) => void) {
  if (!s.story?.choiceId || s.story.history.length > s.story.chapterIndex) return;
  const status = coreStoryStatus(s);
  if (!s.story || !status?.chapter || !status.choice || status.completion ||
    !status.goals.every((g) => g.current >= g.target)) return;
  pay(`story:${status.chapter.id}:reward`, `Amanat campaign • ${storyText(status.chapter.title)}`, status.choice.cash);
  s.story.history.push({ chapterId: status.chapter.id, choiceId: status.choice.id,
    completedAt: s.minute, values: status.goals.map((g) => g.current) });
}

/** Keep sequence, choices, evidence snapshots, and one-time ledger grants aligned on import. */
export function validateStoryProgress(s: CoreState) {
  const p = s.story;
  const bad = () => { throw new Error("Progres campaign cerita save tidak konsisten."); };
  const grants = s.ledger.filter((e) => e.id.startsWith("story:"));
  if (!p) { if (grants.length) bad(); return; }
  if (s.companyStarted === false || p.startedAt > p.chapterStartedAt || p.chapterStartedAt > s.minute ||
    new Set(p.baselineRunIds).size !== p.baselineRunIds.length ||
    p.baselineRunIds.some((id) => !s.runs.some((r) => r.id === id)) ||
    p.history.length < p.chapterIndex || p.history.length > Math.min(chapters.length, p.chapterIndex + 1)) bad();
  const chapter = chapters[p.chapterIndex];
  if ((p.choiceId && !chapter?.choices.some((c) => c.id === p.choiceId)) ||
    (p.history.length > p.chapterIndex && p.choiceId !== p.history.at(-1)?.choiceId) ||
    (p.history[p.chapterIndex] && p.history[p.chapterIndex]!.completedAt < p.chapterStartedAt) ||
    (!p.choiceId && p.baselineRunIds.length)) bad();
  let last = p.startedAt;
  p.history.forEach((h, i) => {
    const c = chapters[i];
    const choice = c?.choices.find((o) => o.id === h.choiceId);
    if (!c || !choice || h.chapterId !== c.id || h.completedAt < last || h.completedAt > s.minute ||
      h.values.length !== choice.goals.length || choice.goals.some((g, n) => (h.values[n] ?? -1) < g.target)) bad();
    const entries = grants.filter((e) => e.id === `story:${h.chapterId}:reward`);
    if (entries.length !== 1 || entries[0]!.cash !== choice!.cash || entries[0]!.expense !== 0 ||
      entries[0]!.revenue !== 0 || entries[0]!.minute !== h.completedAt) bad();
    last = h.completedAt;
  });
  if (grants.length !== p.history.length || p.chapterStartedAt < (p.history[p.chapterIndex - 1]?.completedAt ?? p.startedAt)) bad();
}
