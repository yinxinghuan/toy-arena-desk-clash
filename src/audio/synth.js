// Original composition and synthesized sound design. No third-party audio.
export class Synth {
  constructor(muted) {
    this.muted = muted;
    this.active = false;
    this.voices = new Set();
    this.beat = 0;
  }
  async unlock() {
    try {
      this.ctx ??= new AudioContext();
      await this.ctx.resume();
    } catch {
      /* Audio is optional. */
    }
  }
  tone(freq, length = 0.15, type = "triangle", volume = 0.045, slide = freq) {
    if (!this.ctx || this.muted || !this.active || this.voices.size >= 12)
      return;
    const o = this.ctx.createOscillator(),
      g = this.ctx.createGain(),
      t = this.ctx.currentTime;
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + length);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + length);
    o.connect(g);
    g.connect(this.ctx.destination);
    this.voices.add(o);
    o.onended = () => {
      this.voices.delete(o);
      o.disconnect();
      g.disconnect();
    };
    o.start(t);
    o.stop(t + length + 0.02);
  }
  setActive(active) {
    this.active = active;
    clearInterval(this.loop);
    this.loop = null;
    if (!active) {
      for (const o of this.voices) {
        try {
          o.stop();
        } catch {}
      }
      return;
    }
    this.loop = setInterval(() => {
      const notes = [
        330, 392, 440, 392, 294, 330, 262, 294, 330, 440, 494, 440, 392, 330,
        294, 262,
      ];
      this.tone(notes[this.beat % 16], 0.23, "triangle", 0.025);
      if (this.beat % 2 === 0)
        this.tone(
          [110, 131, 147, 131][Math.floor(this.beat / 8) % 4],
          0.32,
          "sine",
          0.035,
        );
      this.beat = (this.beat + 1) % 64;
    }, 312.5);
  }
  setMuted(value) {
    this.muted = value;
    if (value)
      for (const o of this.voices) {
        try {
          o.stop();
        } catch {}
      }
  }
  effect(kind) {
    if (kind === "hit") this.tone(180, 0.1, "sine", 0.08, 70);
    if (kind === "dash") this.tone(120, 0.12, "sawtooth", 0.025, 360);
    if (kind === "reward") this.tone(660, 0.18, "triangle", 0.06, 990);
    if (kind === "win")
      [262, 330, 392, 524].forEach((n, i) =>
        setTimeout(() => this.tone(n, 0.25), i * 120),
      );
    if (kind === "lose") this.tone(220, 0.35, "triangle", 0.06, 110);
  }
}
