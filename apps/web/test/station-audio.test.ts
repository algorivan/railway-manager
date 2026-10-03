import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StationAudio } from "../src/core/station-audio";
const contexts: FakeContext[] = [];
class Node {
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
  gain = {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  frequency = { value: 0 };
  buffer: unknown;
  loop = false;
  type = "";
  onended: (() => void) | null = null;
}
class FakeContext {
  state = "suspended";
  sampleRate = 100;
  currentTime = 0;
  destination = {};
  gains: Node[] = [];
  sources: Node[] = [];
  oscillators: Node[] = [];
  constructor() {
    contexts.push(this);
  }
  resume = vi.fn(async () => {
    this.state = "running";
  });
  suspend = vi.fn(async () => {
    this.state = "suspended";
  });
  close = vi.fn(async () => {
    this.state = "closed";
  });
  createGain() {
    const node = new Node();
    this.gains.push(node);
    return node;
  }
  createBufferSource() {
    const node = new Node();
    this.sources.push(node);
    return node;
  }
  createOscillator() {
    const node = new Node();
    this.oscillators.push(node);
    return node;
  }
  createBiquadFilter() {
    return new Node();
  }
  createBuffer(_channels: number, frames: number) {
    const data = new Float32Array(frames);
    return { getChannelData: () => data };
  }
}
beforeEach(() => {
  contexts.length = 0;
  vi.useFakeTimers();
  vi.stubGlobal("AudioContext", FakeContext);
  vi.stubGlobal("document", { hidden: false });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("station sound lifecycle", () => {
  it("waits for a gesture and respects the saved mute preference", async () => {
    const sound = new StationAudio(false);
    expect(contexts).toHaveLength(0);
    await sound.unlock();
    expect(contexts).toHaveLength(0);
    sound.setEnabled(true);
    expect(contexts).toHaveLength(0);
    await sound.unlock();
    expect(contexts[0]!.sources).toHaveLength(1);
    sound.dispose();
  });
  it("uses one ambience loop and one chime timer across repeated gestures", async () => {
    const sound = new StationAudio(true);
    await Promise.all([sound.unlock(), sound.unlock(), sound.unlock()]);
    expect(contexts).toHaveLength(1);
    expect(contexts[0]!.sources).toHaveLength(1);
    vi.advanceTimersByTime(17_999);
    expect(contexts[0]!.oscillators).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(contexts[0]!.oscillators).toHaveLength(12);
    sound.dispose();
  });
  it("mutes immediately and clears chimes and feedback until enabled again", async () => {
    const sound = new StationAudio(true);
    await sound.unlock();
    const context = contexts[0]!;
    sound.feedback(false);
    expect(context.oscillators).toHaveLength(6);
    sound.setEnabled(false);
    expect(context.gains[0]!.gain.setValueAtTime).toHaveBeenLastCalledWith(
      0,
      0,
    );
    sound.feedback(true);
    vi.advanceTimersByTime(60_000);
    expect(context.oscillators).toHaveLength(6);
    sound.setEnabled(true);
    await Promise.resolve();
    vi.advanceTimersByTime(18_000);
    expect(context.sources).toHaveLength(1);
    expect(context.oscillators).toHaveLength(18);
    sound.dispose();
  });
  it("pauses hidden pages and releases resources on unmount", async () => {
    const sound = new StationAudio(true);
    await sound.unlock();
    const context = contexts[0]!;
    (document as unknown as { hidden: boolean }).hidden = true;
    sound.visibility();
    vi.advanceTimersByTime(36_000);
    expect(context.oscillators).toHaveLength(0);
    (document as unknown as { hidden: boolean }).hidden = false;
    sound.visibility();
    await Promise.resolve();
    vi.advanceTimersByTime(18_000);
    expect(context.oscillators).toHaveLength(12);
    sound.dispose();
    expect(context.close).toHaveBeenCalledOnce();
    expect(context.sources[0]!.stop).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(36_000);
    expect(context.oscillators).toHaveLength(12);
  });
  it("does not restart after disposal while browser resume is pending", async () => {
    let resume: () => void = () => {};
    const sound = new StationAudio(true);
    // Override the instance before triggering the second, suspended resume.
    await sound.unlock();
    const context = contexts[0]!;
    sound.setEnabled(false);
    context.resume = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resume = resolve;
        }),
    );
    sound.setEnabled(true);
    sound.dispose();
    resume();
    await Promise.resolve();
    expect(context.sources).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
