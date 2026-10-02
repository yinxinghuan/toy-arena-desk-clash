import { LEVELS, SANDBOX } from "../../content/levels.js";
import { statsFor } from "../../content/builds.js";
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export function starConditions(g) {
  return [
    g.won,
    g.won &&
      (g.level.kind === "survive"
        ? g.hits === 0
        : g.time <= (g.level.par || 40)),
    g.won &&
      (g.level.skill === "ramps"
        ? g.jumps >= 2
        : g.level.skill === "chain"
          ? g.bestChain >= 3
          : g.level.skill === "nuts"
            ? g.collected >= 6
            : g.level.skill === "marbles"
              ? g.smashed >= 3
              : g.hits === 0),
  ];
}
export const starsFor = (g) =>
  g.level.kind === "sandbox" ? 0 : starConditions(g).filter(Boolean).length;
export class Game {
  constructor(index = 0, onEvent = () => {}, build = {}) {
    this.index = index;
    this.level = index === -1 ? SANDBOX : LEVELS[index];
    this.stats = statsFor(build);
    this.onEvent = onEvent;
    this.p = {
      x: this.level.start[0],
      y: this.level.start[1],
      vx: 0,
      vy: 0,
      angle: 0,
      jump: 0,
      dash: 0,
      cooldown: 0,
      immune: 0,
    };
    this.time = 0;
    this.hits = 0;
    this.gate = 0;
    this.gateHintRemaining = 0;
    this.broken = 0;
    this.held = 0;
    this.round = 0;
    this.jumps = 0;
    this.smashed = 0;
    this.chain = 0;
    this.bestChain = 0;
    this.lastBreak = -100;
    this.abilityCooldown = 0;
    this.notice = this.level.subtitle;
    this.noticeTime = 7;
    this.crates = (this.level.crates || []).map(([x, y]) => ({
      x,
      y,
      vx: 0,
      vy: 0,
      delivered: false,
    }));
    this.collected = 0;
    this.blocks = this.level.blocks.map(([x, y]) => ({ x, y, alive: true }));
    this.nuts = (this.level.nuts || []).map(([x, y]) => ({
      x,
      y,
      alive: true,
    }));
    this.marbles = Array.from({ length: 12 }, () => ({ active: false }));
    this.spawn = 2;
    this.ended = false;
    this.won = false;
    this.reason = "";
    this.tutorial = false;
    this.practiceGate = false;
    this.practiceBlock = false;
    this.particles = Array.from({ length: 96 }, () => ({ life: 0 }));
    this.rampTimer = 0;
  }
  emit(kind, x = this.p.x, y = this.p.y) {
    this.onEvent(kind);
    for (let i = 0; i < (kind === "dash" ? 3 : 10); i++) {
      const q = this.particles.find((p) => p.life <= 0);
      if (!q) break;
      Object.assign(q, {
        x,
        y,
        vx: Math.cos(i * 2.4) * 70,
        vy: Math.sin(i * 2.4) * 70,
        life: 0.4,
        kind,
      });
    }
  }
  dash(x, y) {
    const p = this.p;
    if (this.ended || p.cooldown > 0) return;
    let dx = x - p.x,
      dy = y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    p.vx = (dx / d) * this.stats.speed;
    p.vy = (dy / d) * this.stats.speed;
    p.angle = Math.atan2(dy, dx);
    p.dash = 0.22;
    p.cooldown = this.stats.cooldown;
    this.emit("dash");
  }
  ability() {
    if (this.ended || this.abilityCooldown > 0) return;
    if (this.stats.spring) {
      this.p.jump = 0.7;
      this.abilityCooldown = 3;
      this.emit("dash");
    } else if (this.p.cooldown <= 0) {
      this.dash(
        this.p.x + Math.cos(this.p.angle) * 100,
        this.p.y + Math.sin(this.p.angle) * 100,
      );
      this.p.vx *= 1.2;
      this.p.vy *= 1.2;
      this.abilityCooldown = 3;
    }
  }
  get pad() {
    return (this.level.pads || [[520, 300]])[this.round] || [520, 300];
  }
  get movingWall() {
    return this.level.moving
      ? [420, 190 + Math.sin(this.time * 0.9) * 75, 25, 140]
      : null;
  }
  damage() {
    if (
      this.p.immune > 0 ||
      this.p.jump > 0 ||
      this.tutorial ||
      this.level.kind === "sandbox"
    )
      return;
    this.hits++;
    this.p.immune = 1.3;
    this.emit("hit");
    if (this.hits >= this.stats.hull)
      this.finish(false, `Your toy took ${this.stats.hull} hits.`);
  }
  finish(won, reason) {
    if (this.ended) return;
    this.ended = true;
    this.won = won;
    this.reason = reason;
    this.emit(won ? "win" : "lose");
  }
  update(dt, input) {
    if (this.ended) return;
    this.gateHintRemaining = Math.max(0, this.gateHintRemaining - dt);
    this.noticeTime = Math.max(0, this.noticeTime - dt);
    this.abilityCooldown = Math.max(0, this.abilityCooldown - dt);
    const p = this.p;
    for (const q of this.particles) {
      if (q.life > 0) {
        q.life -= dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
      }
    }
    if (!this.tutorial) this.time += dt;
    for (const k of ["jump", "dash", "cooldown", "immune"])
      p[k] = Math.max(0, p[k] - dt);
    this.rampTimer = Math.max(0, this.rampTimer - dt);
    if (p.dash <= 0) {
      let dx = input.x || 0,
        dy = input.y || 0;
      const d = Math.hypot(dx, dy) || 1;
      p.vx += (dx / d) * this.stats.accel * dt;
      p.vy += (dy / d) * this.stats.accel * dt;
      const icy = (this.level.ice || []).some(
        ([x, y, w, h]) => p.x > x && p.x < x + w && p.y > y && p.y < y + h,
      );
      const drag = Math.exp(-this.stats.drag * (icy ? 0.4 : 1) * dt);
      p.vx *= drag;
      p.vy *= drag;
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > 250) {
        p.vx *= 250 / speed;
        p.vy *= 250 / speed;
      }
      if (speed > 15) p.angle = Math.atan2(p.vy, p.vx);
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    for (const [axis, lo, hi] of [
      ["x", 65, 895],
      ["y", 110, 475],
    ])
      if (p[axis] < lo || p[axis] > hi) {
        p[axis] = clamp(p[axis], lo, hi);
        p[axis === "x" ? "vx" : "vy"] *= -0.45;
        this.emit("hit");
      }
    for (const [x, y, w, h] of [
      ...this.level.walls,
      ...(this.movingWall ? [this.movingWall] : []),
    ]) {
      if (p.jump > 0) continue;
      const dx = p.x - clamp(p.x, x, x + w),
        dy = p.y - clamp(p.y, y, y + h),
        d = Math.hypot(dx, dy);
      if (d < 17) {
        let nx = dx / (d || 1),
          ny = dy / (d || 1);
        if (!d) {
          nx = 0;
          ny = p.y < y + h / 2 ? -1 : 1;
        }
        p.x += nx * (17 - d);
        p.y += ny * (17 - d);
        const dot = p.vx * nx + p.vy * ny;
        if (dot < 0) {
          p.vx -= 1.5 * dot * nx;
          p.vy -= 1.5 * dot * ny;
          this.emit("hit");
        }
      }
    }
    for (const [x, y] of this.level.ramps)
      if (
        Math.hypot(p.x - x, p.y - y) < 28 &&
        this.rampTimer === 0 &&
        Math.hypot(p.vx, p.vy) > 55
      ) {
        p.jump = 0.7;
        this.rampTimer = 1.1;
        this.jumps++;
        this.emit("reward");
      }
    if (this.tutorial) {
      if (Math.hypot(p.x - 280, p.y - 390) < 40 && !this.practiceGate) {
        this.practiceGate = true;
        this.emit("reward");
      }
      if (
        Math.hypot(p.x - 420, p.y - 390) < 36 &&
        p.dash > 0 &&
        !this.practiceBlock
      ) {
        this.practiceBlock = true;
        this.emit("reward");
      }
      return;
    }
    const kind = this.level.kind;
    if (kind === "race") {
      const localGate = this.gate % this.level.gates.length;
      const gate = this.level.gates[localGate];
      if (gate && Math.hypot(p.x - gate[0], p.y - gate[1]) < 40) {
        this.gate++;
        this.gateHintRemaining = 0;
        this.emit("reward");
      } else if (
        this.level.gates.some(
          ([x, y], i) =>
            i > localGate &&
            i !==
              (localGate + this.level.gates.length - 1) %
                this.level.gates.length &&
            Math.hypot(p.x - x, p.y - y) < 40,
        )
      ) {
        this.gateHintRemaining = 1.5;
      }
      if (this.gate === this.level.gates.length * this.level.laps)
        this.finish(true, `All ${this.level.laps} laps crossed.`);
    }
    if (kind === "capture" || kind === "sandbox") {
      for (const b of this.blocks)
        if (b.alive && Math.hypot(p.x - b.x, p.y - b.y) < 34) {
          if (p.dash > 0 || Math.hypot(p.vx, p.vy) > 160) {
            b.alive = false;
            this.broken++;
            this.chain = this.time - this.lastBreak <= 5 ? this.chain + 1 : 1;
            this.lastBreak = this.time;
            this.bestChain = Math.max(this.bestChain, this.chain);
            if (this.chain >= 3) {
              this.notice = `CHAIN ${this.chain} · paper toys cleared!`;
              this.noticeTime = 1.8;
              this.emit("chain", b.x, b.y);
            }
            this.emit("reward", b.x, b.y);
          } else {
            const a = Math.atan2(p.y - b.y, p.x - b.x);
            p.x = b.x + Math.cos(a) * 35;
            p.y = b.y + Math.sin(a) * 35;
            p.vx *= -0.4;
            p.vy *= -0.4;
          }
        }
      if (
        this.blocks.every((b) => !b.alive) &&
        Math.hypot(p.x - this.pad[0], p.y - this.pad[1]) < 55
      )
        this.held += dt;
      if (kind === "capture" && this.held >= this.level.hold) {
        this.round++;
        if (this.round >= this.level.rounds)
          this.finish(true, "Both rounds captured. The desk belongs to you.");
        else {
          this.held = 0;
          this.blocks = this.level.blocks.map(([x, y]) => ({
            x: 960 - x,
            y: 590 - y,
            alive: true,
          }));
          this.notice = "ROUND 2 · new toys, new capture pad";
          this.noticeTime = 5;
          this.emit("chain");
        }
      }
    }
    if (kind === "push" || kind === "sandbox") {
      for (const b of this.crates) {
        if (b.delivered) continue;
        const dx = b.x - p.x,
          dy = b.y - p.y,
          d = Math.hypot(dx, dy) || 1;
        if (d < 40) {
          const overlap = 40 - d;
          b.x += (dx / d) * overlap * 0.65;
          b.y += (dy / d) * overlap * 0.65;
          p.x -= (dx / d) * overlap * 0.35;
          p.y -= (dy / d) * overlap * 0.35;
          b.vx += p.vx * this.stats.mass * dt * 8;
          b.vy += p.vy * this.stats.mass * dt * 8;
        }
        b.x = clamp(b.x + b.vx * dt, 85, 875);
        b.y = clamp(b.y + b.vy * dt, 130, 455);
        b.vx *= Math.exp(-4 * dt);
        b.vy *= Math.exp(-4 * dt);
        for (const [x, y, w, h] of [
          ...this.level.walls,
          ...(this.movingWall ? [this.movingWall] : []),
        ]) {
          const dx = b.x - clamp(b.x, x, x + w),
            dy = b.y - clamp(b.y, y, y + h),
            d = Math.hypot(dx, dy);
          if (d < 23) {
            b.x += (dx / (d || 1) || 1) * (23 - d);
            b.y += (dy / (d || 1)) * (23 - d);
            b.vx = b.vy = 0;
          }
        }
        if (
          Math.hypot(b.x - this.level.target[0], b.y - this.level.target[1]) <
          65
        ) {
          b.delivered = true;
          this.emit("reward", b.x, b.y);
        }
      }
      if (kind === "push" && this.crates.every((b) => b.delivered))
        this.finish(true, "Both cargo boxes packed into the bay.");
    }
    if (kind === "survive" || this.level.hazards) {
      this.spawn -= dt;
      if (this.spawn <= 0) {
        this.spawn += 1.5;
        const m = this.marbles.find((m) => !m.active);
        if (m) {
          const n = Math.floor(this.time / 1.5);
          m.x = n % 2 ? 75 : 885;
          m.y = 125 + ((n * 73) % 330);
          const a = Math.atan2(p.y - m.y, p.x - m.x);
          m.vx = Math.cos(a) * 120;
          m.vy = Math.sin(a) * 120;
          m.warning = 0.5;
          m.active = true;
        }
      }
      for (const m of this.marbles)
        if (m.active) {
          if (m.warning > 0) {
            m.warning -= dt;
            continue;
          }
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          if (m.x < 40 || m.x > 920 || m.y < 90 || m.y > 500) m.active = false;
          else if (Math.hypot(p.x - m.x, p.y - m.y) < 30) {
            if (p.dash > 0) {
              m.active = false;
              this.smashed++;
              this.emit("reward", m.x, m.y);
            } else this.damage();
          }
        }
      for (const n of this.nuts)
        if (n.alive && Math.hypot(p.x - n.x, p.y - n.y) < 29) {
          n.alive = false;
          this.collected++;
          this.emit("reward", n.x, n.y);
        }
    }
    if (this.time >= this.level.limit && !this.ended)
      this.finish(
        kind === "survive" && this.collected >= this.level.required,
        kind === "survive"
          ? this.collected >= this.level.required
            ? "You outlasted the marbles."
            : `Time survived, but fewer than ${this.level.required} nuts collected.`
          : "Time ran out. Try a tighter route.",
      );
  }
  progress() {
    return this.level.kind === "race"
      ? `Lap ${Math.min(this.level.laps, Math.floor(this.gate / this.level.gates.length) + 1)}/${this.level.laps} · Next Gate ${(this.gate % this.level.gates.length) + 1}`
      : this.level.kind === "capture"
        ? `Round ${Math.min(this.round + 1, this.level.rounds)}/${this.level.rounds} · Toys ${this.blocks.filter((b) => !b.alive).length}/${this.blocks.length} · Hold ${this.held.toFixed(1)}/${this.level.hold}s`
        : this.level.kind === "push"
          ? `Cargo ${this.crates.filter((b) => b.delivered).length}/2`
          : this.level.kind === "sandbox"
            ? "E: ability · P: parts · no score"
            : `Nuts ${this.collected}/${this.level.required}`;
  }
}
