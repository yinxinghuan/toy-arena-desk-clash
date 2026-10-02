import { LEVELS } from "../../content/levels.js";
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export function starsFor(g) {
  if (!g.won) return 0;
  return (
    1 +
    Number(
      g.level.kind === "survive"
        ? g.hits === 0
        : g.time <= (g.level.kind === "race" ? 35 : 40),
    ) +
    Number(g.level.kind === "survive" ? g.collected === 6 : g.hits === 0)
  );
}
export class Game {
  constructor(index = 0, onEvent = () => {}) {
    this.index = index;
    this.level = LEVELS[index];
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
    p.vx = (dx / d) * 520;
    p.vy = (dy / d) * 520;
    p.angle = Math.atan2(dy, dx);
    p.dash = 0.22;
    p.cooldown = 1.1;
    this.emit("dash");
  }
  damage() {
    if (this.p.immune > 0 || this.p.jump > 0 || this.tutorial) return;
    this.hits++;
    this.p.immune = 1.3;
    this.emit("hit");
    if (this.hits >= 3) this.finish(false, "Your toy took three hits.");
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
      p.vx += (dx / d) * 680 * dt;
      p.vy += (dy / d) * 680 * dt;
      const drag = Math.exp(-4.8 * dt);
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
    for (const [x, y, w, h] of this.level.walls) {
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
      const gate = this.level.gates[this.gate];
      if (gate && Math.hypot(p.x - gate[0], p.y - gate[1]) < 40) {
        this.gate++;
        this.gateHintRemaining = 0;
        this.emit("reward");
      } else if (
        this.level.gates.some(
          ([x, y], i) => i > this.gate && Math.hypot(p.x - x, p.y - y) < 40,
        )
      ) {
        this.gateHintRemaining = 1.5;
      }
      if (this.gate === 5) this.finish(true, "All five gates crossed.");
    }
    if (kind === "capture") {
      for (const b of this.blocks)
        if (b.alive && Math.hypot(p.x - b.x, p.y - b.y) < 34) {
          if (p.dash > 0 || Math.hypot(p.vx, p.vy) > 160) {
            b.alive = false;
            this.broken++;
            this.emit("reward", b.x, b.y);
          } else {
            const a = Math.atan2(p.y - b.y, p.x - b.x);
            p.x = b.x + Math.cos(a) * 35;
            p.y = b.y + Math.sin(a) * 35;
            p.vx *= -0.4;
            p.vy *= -0.4;
          }
        }
      if (this.broken === 8 && Math.hypot(p.x - 520, p.y - 300) < 55)
        this.held += dt;
      if (this.held >= 4) this.finish(true, "The desk belongs to you.");
    }
    if (kind === "survive") {
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
        kind === "survive" && this.collected >= 4,
        kind === "survive"
          ? this.collected >= 4
            ? "You outlasted the marbles."
            : "Time survived, but fewer than four nuts collected."
          : "Time ran out. Try a tighter route.",
      );
  }
  progress() {
    return this.level.kind === "race"
      ? `Gates ${this.gate}/5${this.gate < 5 ? ` · Next: Gate ${this.gate + 1}` : ""}`
      : this.level.kind === "capture"
        ? `Toys ${this.broken}/8 · Pad ${this.held.toFixed(1)}/4s`
        : `Nuts ${this.collected} · Goal 4`;
  }
}
