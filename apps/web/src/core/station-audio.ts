/** Gentle synthesized platform ambience. One context/bus handles ambience and feedback. */
export class StationAudio {
  private context: AudioContext | null = null;
  private bus: GainNode | null = null;
  private loop: AudioBufferSourceNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private enabled = true;
  private disposed = false;
  private active = false;
  constructor(enabled: boolean) {
    this.enabled = enabled;
  }
  async unlock() {
    if (!this.enabled || this.disposed || document.hidden) return;
    try {
      const context = (this.context ??= new AudioContext());
      if (!this.bus) {
        this.bus = context.createGain();
        this.bus.connect(context.destination);
      }
      if (context.state === "suspended") await context.resume();
      if (
        !this.enabled ||
        this.disposed ||
        document.hidden ||
        context.state !== "running"
      )
        return;
      this.bus.gain.setValueAtTime(1, context.currentTime);
      if (this.active) return;
      this.active = true;
      if (!this.loop) {
        const buffer = context.createBuffer(
            1,
            context.sampleRate * 12,
            context.sampleRate,
          ),
          data = buffer.getChannelData(0);
        // Filtered air, distant rail rumble, and soft rhythmic platform movement.
        let air = 0;
        for (let i = 0; i < data.length; i++) {
          const t = i / context.sampleRate;
          air = air * 0.96 + (Math.random() * 2 - 1) * 0.04;
          const step = Math.pow(
            Math.max(0, Math.sin((t * Math.PI * 2) / 0.75)),
            24,
          );
          data[i] =
            air * (0.13 + 0.03 * Math.sin((t * Math.PI * 2) / 12)) +
            Math.sin(t * Math.PI * 2 * 64) * 0.006 +
            air * step * 0.06;
        }
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const filter = context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1100;
        source.connect(filter);
        filter.connect(this.bus);
        source.start();
        this.loop = source;
      }
      this.timer = setInterval(() => this.chime(), 18_000);
    } catch {
      /* Audio is optional; gameplay remains available. */
    }
  }
  private bell(
    frequency: number,
    at: number,
    volume: number,
    duration: number,
  ) {
    const context = this.context!,
      bus = this.bus!;
    [1, 2.76, 5.4].forEach((partial, index) => {
      const oscillator = context.createOscillator(),
        gain = context.createGain();
      oscillator.frequency.value = frequency * partial;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(volume / (1 + index * 5), at + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.00001, at + duration);
      oscillator.connect(gain);
      gain.connect(bus);
      oscillator.start(at);
      oscillator.stop(at + duration + 0.02);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  }
  private chime() {
    if (
      !this.active ||
      !this.enabled ||
      document.hidden ||
      this.context?.state !== "running"
    )
      return;
    // First quarter of the public-domain Westminster melody: G# F# E B.
    [415.3, 370, 329.63, 246.94].forEach((note, i) =>
      this.bell(note, this.context!.currentTime + i * 0.65, 0.022, 2.6),
    );
  }
  feedback(failed: boolean) {
    if (
      !this.active ||
      !this.enabled ||
      document.hidden ||
      this.context?.state !== "running"
    )
      return;
    (failed ? [330, 220] : [523, 784]).forEach((note, i) =>
      this.bell(note, this.context!.currentTime + i * 0.12, 0.06, 0.16),
    );
  }
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.pause();
    else if (this.context) void this.unlock();
  }
  visibility() {
    if (document.hidden) this.pause();
    else if (this.enabled && this.context) void this.unlock();
  }
  private pause() {
    this.active = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.context && this.bus) {
      this.bus.gain.setValueAtTime(0, this.context.currentTime);
      void this.context.suspend().catch(() => {});
    }
  }
  dispose() {
    this.disposed = true;
    this.pause();
    this.loop?.stop();
    this.loop?.disconnect();
    this.bus?.disconnect();
    void this.context?.close().catch(() => {});
  }
}
