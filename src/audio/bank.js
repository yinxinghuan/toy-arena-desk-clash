// Decoded licensed recordings, never runtime oscillator placeholders.
const FILES = {
  bgm: "candy.ogg",
  hit: "hit.ogg",
  dash: "dash.ogg",
  reward: "reward.ogg",
  chain: "chain.ogg",
  win: "win.ogg",
  lose: "lose.ogg",
  record: "chain.ogg",
};
export class AudioBank {
  constructor(save, onWarning = () => {}) {
    this.muted = save.muted;
    this.volume = save.volume;
    this.active = false;
    this.buffers = {};
    this.voices = new Set();
    this.onWarning = onWarning;
    this.last = {};
  }
  async unlock() {
    try {
      this.ctx ??= new AudioContext();
      if (!this.master) {
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.setVolume(this.volume);
      }
      await this.ctx.resume();
      this.loading ??= Promise.all(
        Object.entries(FILES).map(async ([key, file]) => {
          const r = await fetch(`${import.meta.env.BASE_URL}audio/${file}`);
          if (!r.ok) throw Error("audio");
          this.buffers[key] = await this.ctx.decodeAudioData(
            await r.arrayBuffer(),
          );
        }),
      );
      await this.loading;
      if (this.active && !this.music && !this.muted) this.playMusic();
    } catch {
      this.onWarning(
        "Audio could not load. You can keep playing silently; reload to retry audio.",
      );
    }
  }
  setVolume(v) {
    this.volume = v;
    if (this.master)
      this.master.gain.setValueAtTime(this.muted ? 0 : v, this.ctx.currentTime);
  }
  setMuted(m) {
    this.muted = m;
    this.setVolume(this.volume);
    if (m) this.stopAll();
    else if (this.active) this.playMusic();
  }
  stopAll() {
    for (const s of this.voices) {
      try {
        s.stop();
      } catch {}
    }
    this.voices.clear();
    if (this.music) {
      try {
        this.music.stop();
      } catch {}
      this.music = null;
    }
  }
  playMusic() {
    if (
      !this.ctx ||
      !this.buffers.bgm ||
      this.muted ||
      !this.active ||
      this.music
    )
      return;
    const s = this.ctx.createBufferSource(),
      g = this.ctx.createGain();
    s.buffer = this.buffers.bgm;
    s.loop = true;
    s.loopStart = 0;
    s.loopEnd = s.buffer.duration;
    g.gain.value = 0.22;
    s.connect(g);
    g.connect(this.master);
    s.onended = () => {
      s.disconnect();
      g.disconnect();
    };
    this.music = s;
    s.start();
  }
  setActive(active) {
    this.active = active;
    if (!active) this.stopAll();
    else this.playMusic();
  }
  effect(kind) {
    if (
      !this.ctx ||
      this.muted ||
      !this.active ||
      !this.buffers[kind] ||
      this.voices.size >= 8
    )
      return;
    const now = this.ctx.currentTime;
    if (now - (this.last[kind] || -10) < (kind === "hit" ? 0.12 : 0.05)) return;
    this.last[kind] = now;
    const s = this.ctx.createBufferSource(),
      g = this.ctx.createGain();
    s.buffer = this.buffers[kind];
    g.gain.value = kind === "hit" ? 0.6 : 0.45;
    s.connect(g);
    g.connect(this.master);
    this.voices.add(s);
    s.onended = () => {
      this.voices.delete(s);
      s.disconnect();
      g.disconnect();
    };
    s.start();
  }
}
