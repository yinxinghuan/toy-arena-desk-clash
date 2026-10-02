const ink = "#203239",
  paper = "#fff3d6";
function rect(c, x, y, w, h, color) {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
}
function circle(c, x, y, r, color) {
  c.fillStyle = color;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}
function text(c, t, x, y, size = 18, color = ink) {
  c.fillStyle = color;
  c.font = `800 ${size}px system-ui`;
  c.textAlign = "center";
  c.fillText(t, x, y);
}
function block(c, x, y) {
  rect(c, x - 18, y - 16, 36, 32, "#a8c5a1");
  c.strokeStyle = ink;
  c.lineWidth = 2;
  c.strokeRect(x - 18, y - 16, 36, 32);
  c.beginPath();
  c.moveTo(x - 18, y - 16);
  c.lineTo(x, y);
  c.lineTo(x + 18, y - 16);
  c.stroke();
  rect(c, x - 3, y - 16, 6, 32, paper);
}
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.c = canvas.getContext("2d");
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.background = document.createElement("canvas");
    this.background.width = 960;
    this.background.height = 540;
    const c = this.background.getContext("2d");
    rect(c, 0, 0, 960, 540, "#d5b789");
    for (let i = 0; i < 55; i++) {
      c.strokeStyle = i % 3 ? "#c4a577" : "#e2c99e";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0, i * 11);
      c.bezierCurveTo(320, i * 11 + 12, 620, i * 11 - 8, 960, i * 11 + 3);
      c.stroke();
    }
    rect(c, 38, 90, 884, 410, "#bd9768");
    rect(c, 46, 98, 868, 394, "#efddb1");
    for (let i = 0; i < 44; i++) {
      rect(c, 48 + i * 20, 99, 10, 3, ink);
      rect(c, 48 + i * 20, 488, 10, 3, ink);
    }
    rect(c, 12, 250, 15, 170, "#e4af43");
    rect(c, 14, 248, 11, 25, "#b78558");
    rect(c, 15, 420, 8, 16, ink);
    c.strokeStyle = ink;
    c.lineWidth = 3;
    c.strokeRect(46, 98, 868, 394);
  }
  resize() {
    const box = this.canvas.getBoundingClientRect(),
      dpr = Math.min(devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.round(box.width * dpr);
    this.canvas.height = Math.round(box.height * dpr);
  }
  draw(g, aim) {
    const c = this.c;
    c.setTransform(
      this.canvas.width / 960,
      0,
      0,
      this.canvas.height / 540,
      0,
      0,
    );
    c.drawImage(this.background, 0, 0);
    if (!g) {
      text(c, "A little machine. A big desk.", 480, 430, 24);
      return;
    }
    const level = g.level;
    if (level.scene !== "Workshop") {
      rect(
        c,
        48,
        102,
        864,
        384,
        level.scene === "Drafting" ? "#d3e4e4" : "#e4d0a7",
      );
      text(c, level.scene.toUpperCase(), 800, 475, 14);
    }
    for (const [x, y, w, h] of level.ice || []) {
      rect(c, x, y, w, h, "#b2dce2");
      text(c, "ICE", x + w / 2, y + h / 2, 15);
      for (let i = 0; i < w; i += 30) {
        c.strokeStyle = "#348795";
        c.beginPath();
        c.moveTo(x + i, y + 8);
        c.lineTo(x + i + 15, y + 18);
        c.stroke();
      }
    }
    if (level.kind === "race") {
      c.strokeStyle = "#d1ba87";
      c.lineWidth = 45;
      c.setLineDash([15, 8]);
      c.beginPath();
      c.moveTo(...level.start);
      for (const gate of level.gates) c.lineTo(...gate);
      c.stroke();
      c.setLineDash([]);
      const next = g.gate % level.gates.length;
      level.gates.forEach(([x, y], i) => {
        circle(c, x, y, 39, i < next ? "#bed1b4" : paper);
        c.strokeStyle = i === next ? "#168c91" : "#9b865f";
        c.lineWidth = i === next ? 5 : 2;
        c.stroke();
        text(c, String(i + 1), x, y + 8, 24);
        rect(c, x - 41, y + 38, 82, 5, ink);
      });
    }
    if (level.kind === "capture") {
      const [px, py] = g.pad;
      circle(c, px, py, 58, "#ffc857");
      c.strokeStyle = ink;
      c.lineWidth = 3;
      c.stroke();
      text(
        c,
        g.blocks.some((b) => b.alive)
          ? `BREAK ${g.blocks.filter((b) => b.alive).length}`
          : "HOLD",
        px,
        py - 5,
        18,
      );
      text(c, `${g.held.toFixed(1)}s`, px, py + 21, 20);
    }
    if (level.kind === "survive" || level.hazards) {
      text(c, "KEEP MOVING", 480, 120, 14, "#8a744f");
      for (const n of g.nuts)
        if (n.alive) {
          c.save();
          c.translate(n.x, n.y);
          c.fillStyle = "#dfad35";
          c.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3;
            c.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
          }
          c.closePath();
          c.fill();
          circle(c, 0, 0, 5, ink);
          c.restore();
        }
      for (const m of g.marbles)
        if (m.active) {
          if (m.warning > 0) {
            c.strokeStyle = "#df6350";
            c.lineWidth = 3;
            c.beginPath();
            c.arc(m.x, m.y, 24, 0, Math.PI * 2);
            c.stroke();
            text(c, "!", m.x, m.y + 7, 22);
            continue;
          }
          circle(c, m.x + 3, m.y + 4, 15, "#8f795b");
          circle(c, m.x, m.y, 14, "#df6350");
          circle(c, m.x - 4, m.y - 5, 4, "#ffe2cd");
          c.strokeStyle = ink;
          c.lineWidth = 2;
          c.stroke();
        }
    }
    if (g.movingWall) {
      const [x, y, w, h] = g.movingWall;
      rect(c, x, y, w, h, "#df6350");
      for (let k = 0; k < h; k += 20) {
        rect(c, x, y + k, w, 5, paper);
      }
      text(c, "↕", x + w / 2, y - 8, 20);
    }
    if (level.target) {
      const [x, y] = level.target;
      c.strokeStyle = ink;
      c.lineWidth = 4;
      c.setLineDash([10, 7]);
      c.strokeRect(x - 65, y - 65, 130, 130);
      c.setLineDash([]);
      text(c, "PACK", x, y - 75, 18);
      for (const b of g.crates) {
        block(c, b.x, b.y);
        text(c, b.delivered ? "OK" : "PUSH", b.x, b.y + 5, 12);
      }
    }
    for (const [x, y, w, h] of level.walls) {
      rect(c, x + 4, y + 5, w, h, "#c5ac82");
      rect(c, x, y, w, h, "#53686d");
      rect(c, x + 4, y + 4, w - 8, 4, "#a9c2c0");
    }
    for (const [x, y] of level.ramps) {
      c.save();
      c.translate(x, y);
      rect(c, -25, -23, 50, 46, "#df9a59");
      c.strokeStyle = ink;
      c.lineWidth = 2;
      c.strokeRect(-25, -23, 50, 46);
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(-12, -12 + i * 12);
        c.lineTo(0, -19 + i * 12);
        c.lineTo(12, -12 + i * 12);
        c.stroke();
      }
      c.restore();
    }
    for (const b of g.blocks) if (b.alive) block(c, b.x, b.y);
    if (g.tutorial) {
      circle(c, 280, 390, 38, g.practiceGate ? "#bed1b4" : "#ffc857");
      text(c, "GO", 280, 397, 22);
      if (!g.practiceBlock) block(c, 420, 390);
    }
    const p = g.p;
    circle(c, p.x + 5, p.y + 7, 23, "#bba279");
    if (aim) {
      c.strokeStyle = "#168c9180";
      c.lineWidth = 2;
      c.setLineDash([5, 6]);
      c.beginPath();
      c.moveTo(p.x, p.y);
      c.lineTo(aim.x, aim.y);
      c.stroke();
      c.setLineDash([]);
      c.strokeRect(aim.x - 7, aim.y - 7, 14, 14);
    }
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.angle);
    if (p.jump > 0 && !this.reduced) c.scale(1.18, 1.18);
    if (p.immune > 0 && Math.floor(p.immune * 12) % 2) c.globalAlpha = 0.5;
    for (const y of [-18, 10])
      for (const x of [-14, 9]) {
        rect(c, x, y, 12, 8, ink);
        rect(c, x + 3, y, 2, 8, "#718081");
      }
    c.fillStyle = g.stats.mass > 1 ? "#ba7736" : "#168c91";
    c.beginPath();
    c.roundRect(-22, -13, 44, 26, 10);
    c.fill();
    c.strokeStyle = ink;
    c.lineWidth = 2;
    c.stroke();
    rect(c, -9, -9, 15, 18, "#fff3d6");
    rect(c, 15, -10, 5, 20, p.dash > 0 ? "#ffc857" : "#e9a747");
    circle(c, -15, 0, 3, "#aac1bf");
    c.restore();
    if (p.jump > 0) text(c, "AIR", p.x, p.y - 30, 12);
    if (p.cooldown > 0) {
      c.strokeStyle = "#203239";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(
        p.x,
        p.y,
        29,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * (1 - p.cooldown / g.stats.cooldown),
      );
      c.stroke();
    }
    if (!this.reduced)
      for (const q of g.particles)
        if (q.life > 0) {
          c.globalAlpha = q.life / 0.4;
          rect(c, q.x, q.y, 5, 5, q.kind === "hit" ? "#df6350" : "#ffc857");
        }
    c.globalAlpha = 1;
    if (g.noticeTime > 0 && !g.tutorial) {
      rect(c, 80, 497, 800, 20, paper);
      text(c, g.notice, 480, 512, 13);
    }
  }
}
