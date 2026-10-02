import { createRequire } from "node:module";
import fs from "node:fs/promises";
import { LEVELS } from "../content/levels.js";
const require = createRequire(import.meta.url),
  { chromium } = require("playwright");
const browser = await chromium.launch({ headless: true }),
  page = await browser.newPage({ viewport: { width: 800, height: 450 } });
const errors = [],
  reports = [],
  out = new URL(
    process.env.TOY_QA_OUT ||
      (process.env.TOY_QA_FINAL ? "./ui/w2-final/" : "./ui/w2-campaign/"),
    import.meta.url,
  ).pathname;
await fs.mkdir(out, { recursive: true });
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto(process.env.TOY_ARENA_URL || "http://127.0.0.1:4190/");
const snap = () => page.evaluate(() => window.toyArena.snapshot());
const click = (name) => page.getByRole("button", { name, exact: true }).click();
let held = new Set();
async function release() {
  for (const k of held) await page.keyboard.up(k);
  held.clear();
}
async function drive(x, y, s) {
  const wanted = new Set();
  if (Math.abs(x - s.x) > 8) wanted.add(x > s.x ? "d" : "a");
  if (Math.abs(y - s.y) > 8) wanted.add(y > s.y ? "s" : "w");
  for (const k of held) if (!wanted.has(k)) await page.keyboard.up(k);
  for (const k of wanted) if (!held.has(k)) await page.keyboard.down(k);
  held = wanted;
}
async function dash(x, y) {
  await page.mouse.click((x * 800) / 960, (y * 450) / 540);
}
const blocked = (x, y, walls, margin = 21) =>
  walls.some(
    ([a, b, w, h]) =>
      x > a - margin &&
      x < a + w + margin &&
      y > b - margin &&
      y < b + h + margin,
  );
function path(s, tx, ty, walls) {
  const nodes = [];
  for (let y = 120; y <= 460; y += 20)
    for (let x = 80; x <= 880; x += 20)
      if (!blocked(x, y, walls)) nodes.push({ x, y });
  const nearest = (x, y) =>
    nodes.reduce(
      (a, b) =>
        Math.hypot(b.x - x, b.y - y) < Math.hypot(a.x - x, a.y - y) ? b : a,
      nodes[0],
    );
  const start = nearest(s.x, s.y),
    end = nearest(tx, ty),
    key = (n) => `${n.x},${n.y}`,
    map = new Map(nodes.map((n) => [key(n), n])),
    queue = [start],
    prev = new Map([[key(start), null]]);
  for (let i = 0; i < queue.length; i++) {
    const n = queue[i];
    if (key(n) === key(end)) break;
    for (const [dx, dy] of [
      [20, 0],
      [-20, 0],
      [0, 20],
      [0, -20],
    ]) {
      const next = map.get(`${n.x + dx},${n.y + dy}`);
      if (next && !prev.has(key(next))) {
        prev.set(key(next), n);
        queue.push(next);
      }
    }
  }
  if (!prev.has(key(end))) return [{ x: tx, y: ty }];
  let n = end,
    result = [];
  while (n) {
    result.push(n);
    n = prev.get(key(n));
  }
  return result.reverse().slice(1);
}
async function nav(tx, ty, level, seconds = 8, radius = 17) {
  const end = Date.now() + seconds * 1000;
  let route = [],
    lastPlan = 0;
  while (Date.now() < end) {
    const s = await snap();
    if (s.phase !== "playing") break;
    if (Math.hypot(s.x - tx, s.y - ty) < radius) break;
    const walls = [...level.walls, ...(s.movingWall ? [s.movingWall] : [])];
    if (Date.now() - lastPlan > 1200 || !route.length) {
      route = path(s, tx, ty, walls);
      lastPlan = Date.now();
    }
    while (route.length && Math.hypot(s.x - route[0].x, s.y - route[0].y) < 23)
      route.shift();
    const target = route[0] || { x: tx, y: ty };
    await drive(target.x, target.y, s);
    const threat = (s.hazards || []).find(
      (m) => m.warning <= 0 && Math.hypot(m.x - s.x, m.y - s.y) < 95,
    );
    if (threat && s.cooldown === 0) await dash(threat.x, threat.y);
    await page.waitForTimeout(65);
  }
  await release();
}
async function play(index) {
  const level = LEVELS[index];
  await click("Arenas");
  const btn = page.getByRole("button", {
    name: new RegExp(`${String(index + 1).padStart(2, "0")} / ${level.name}`),
  });
  if (await btn.isDisabled()) {
    reports.push({ index, blocked: "Not enough earned stars" });
    return false;
  }
  await btn.click();
  const began = Date.now();
  if (level.kind === "race") {
    while ((await snap()).phase === "playing" && Date.now() - began < 95000) {
      const s = await snap(),
        [x, y] = level.gates[s.gate % level.gates.length];
      await nav(x, y, level, 7, 30);
    }
  } else if (level.kind === "capture") {
    while ((await snap()).phase === "playing" && Date.now() - began < 95000) {
      const s = await snap(),
        alive = s.blocks
          .filter((b) => b.alive)
          .sort(
            (a, b) =>
              Math.hypot(a.x - s.x, a.y - s.y) -
              Math.hypot(b.x - s.x, b.y - s.y),
          );
      const threat = (s.hazards || []).find(
        (m) => m.warning <= 0 && Math.hypot(m.x - s.x, m.y - s.y) < 125,
      );
      if (threat) {
        if (s.abilityCooldown === 0) await page.keyboard.press("e");
        if (s.cooldown === 0) await dash(threat.x, threat.y);
      }
      if (alive.length) {
        const b = alive[0];
        const spots = [
          [b.x - 47, b.y],
          [b.x + 47, b.y],
          [b.x, b.y + 47],
          [b.x, b.y - 47],
        ].filter(
          ([x, y]) =>
            x > 70 &&
            x < 890 &&
            y > 115 &&
            y < 470 &&
            !blocked(x, y, level.walls),
        );
        spots.sort(
          (a, b) =>
            Math.hypot(a[0] - s.x, a[1] - s.y) -
            Math.hypot(b[0] - s.x, b[1] - s.y),
        );
        const [x, y] = spots[0];
        await nav(x, y, level, 6, 16);
        const a = await snap();
        if (a.cooldown > 0) await page.waitForTimeout(a.cooldown * 1000 + 50);
        await dash(b.x, b.y);
        await page.waitForTimeout(350);
      } else {
        const pad = (level.pads || [[520, 300]])[s.round];
        const spots = [
          [pad[0], pad[1]],
          [pad[0], pad[1] + 40],
          [pad[0], pad[1] - 40],
        ].filter(([x, y]) => !blocked(x, y, level.walls));
        await nav(...spots[0], level, 6, 12);
        await page.waitForTimeout(200);
      }
    }
  } else if (level.kind === "survive") {
    while ((await snap()).phase === "playing" && Date.now() - began < 70000) {
      const s = await snap(),
        n = s.nuts
          .filter((n) => n.alive)
          .sort(
            (a, b) =>
              Math.hypot(a.x - s.x, a.y - s.y) -
              Math.hypot(b.x - s.x, b.y - s.y),
          )[0];
      if (n) await nav(n.x, n.y, level, 4, 20);
      else {
        const route = [
            [170, 340],
            [340, 410],
            [580, 410],
            [780, 330],
            [620, 150],
            [330, 145],
          ],
          point = route[Math.floor(s.time / 3) % route.length];
        await nav(...point, level, 1.8, 18);
      }
    }
  } else if (level.kind === "push") {
    while ((await snap()).phase === "playing" && Date.now() - began < 95000) {
      const s = await snap(),
        b = s.crates.find((b) => !b.delivered);
      if (!b) break;
      let [tx, ty] = level.target;
      // Cargo uses a bottom corridor around walls; moving barrier is also bypassed below.
      if (b.x < 560) {
        tx = 570;
        ty = b.y < 400 ? 420 : b.y;
      }
      const d = Math.hypot(tx - b.x, ty - b.y) || 1,
        ux = (tx - b.x) / d,
        uy = (ty - b.y) / d;
      const behind = { x: b.x - ux * 47, y: b.y - uy * 47 };
      await nav(
        Math.max(70, Math.min(890, behind.x)),
        Math.max(115, Math.min(470, behind.y)),
        level,
        2,
        15,
      );
      const a = await snap();
      await drive(b.x + ux * 55, b.y + uy * 55, a);
      await page.waitForTimeout(500);
      await release();
    }
  }
  await release();
  const end = await snap();
  reports.push({
    index,
    name: level.name,
    wallSeconds: (Date.now() - began) / 1000,
    result: {
      phase: end.phase,
      won: end.won,
      time: end.time,
      hits: end.hits,
      gate: end.gate,
      broken: end.broken,
      round: end.round,
      collected: end.collected,
      stars: end.stars[index],
      crates: end.crates,
    },
    note: "Real keyboard/mouse, snapshot reads only",
  });
  console.log(JSON.stringify(reports.at(-1)));
  await page.screenshot({
    path: out + `${String(index + 1).padStart(2, "0")}-outcome.png`,
  });
  if (end.phase === "playing") await page.keyboard.press("p");
  await click("Arena");
  return true;
}
await click("Learn by driving");
await click("Skip");
await page.keyboard.press("p");
await click("Arena");
for (const i of (process.env.TOY_QA_INDICES || "0,1,2,3,4,5,6,7,8,9")
  .split(",")
  .map(Number)) {
  if (i === 7 && process.env.TOY_QA_FINAL) {
    await click("Garage");
    await page.getByRole("button", { name: /^Hauler / }).click();
    await page.getByRole("button", { name: /^Spring / }).click();
    await click("Back");
  }
  if (!(await play(i))) break;
}
await fs.writeFile(
  new URL(
    process.env.TOY_QA_REPORT ||
      (process.env.TOY_QA_FINAL
        ? "./w2-final-results.json"
        : "./w2-campaign-results.json"),
    import.meta.url,
  ),
  JSON.stringify(
    {
      build: await page.locator('script[type="module"]').getAttribute("src"),
      reports,
      errors,
    },
    null,
    2,
  ),
);
await browser.close();
