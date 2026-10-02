import { createRequire } from "node:module";
import fs from "node:fs/promises";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const out = new URL("./ui/", import.meta.url).pathname;
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true }),
  page = await browser.newPage({ viewport: { width: 800, height: 450 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const base = process.env.TOY_ARENA_URL || "http://127.0.0.1:4186/";
const snap = () => page.evaluate(() => window.toyArena.snapshot());
const shot = (name) => page.screenshot({ path: out + `800x450-${name}.png` });
const reports = [];
await page.goto(base);
await shot("title-recheck");
await page
  .getByRole("button", { name: "Learn by driving", exact: true })
  .click();
await shot("tutorial-recheck");
const began = Date.now();
async function steer(x, y, seconds = 8) {
  const until = Date.now() + seconds * 1000;
  let held = new Set();
  while (Date.now() < until) {
    const s = await snap();
    if (s.phase !== "playing") break;
    const dx = x - s.x,
      dy = y - s.y;
    if (Math.hypot(dx, dy) < 16) break;
    const wanted = new Set();
    if (Math.abs(dx) > 10) wanted.add(dx > 0 ? "d" : "a");
    if (Math.abs(dy) > 10) wanted.add(dy > 0 ? "s" : "w");
    for (const k of held) if (!wanted.has(k)) await page.keyboard.up(k);
    for (const k of wanted) if (!held.has(k)) await page.keyboard.down(k);
    held = wanted;
    await page.waitForTimeout(80);
  }
  for (const k of held) await page.keyboard.up(k);
}
async function dash(x, y) {
  await page.mouse.click((x / 960) * 800, (y / 540) * 450);
  await page.waitForTimeout(250);
}
await steer(280, 390);
await steer(365, 390);
await dash(420, 390);
await page.waitForFunction(() => window.toyArena.snapshot().practiceBlock);
await shot("tutorial-ready");
reports.push({
  tutorialSeconds: (Date.now() - began) / 1000,
  snapshot: await snap(),
});
await page.getByRole("button", { name: "Start race", exact: true }).click();
if (await page.locator("#tutorial").isVisible())
  throw Error("Tutorial remains after start");
await steer(280, 390);
await steer(420, 210);
await steer(680, 170);
await shot("race-mid");
await steer(800, 330);
await steer(670, 430);
await page.waitForFunction(() => window.toyArena.snapshot().phase === "result");
await shot("race-win");
reports.push({ case: "race", snapshot: await snap() });
await page.getByRole("button", { name: "Arena", exact: true }).click();
await page.getByRole("button", { name: /02 \/ Stampede Station/ }).click();
for (const [x, y] of [
  [315, 400],
  [245, 160],
  [450, 140],
  [540, 200],
  [630, 150],
  [720, 270],
]) {
  await steer(x - 45, y);
  await dash(x, y);
  await page.waitForTimeout(900);
}
await shot("capture-mid");
await steer(850, 280);
await steer(850, 420);
await dash(800, 400);
await page.waitForTimeout(950);
await steer(550, 410);
await dash(500, 410);
await page.waitForTimeout(950);
await steer(520, 300);
await page.waitForFunction(
  () => window.toyArena.snapshot().phase === "result",
  {},
  { timeout: 8000 },
);
await shot("capture-win");
reports.push({ case: "capture", snapshot: await snap() });
if ((await snap()).stars[1] < 1) throw Error("Capture did not complete");
if ((await snap()).phase !== "result") {
  await page.keyboard.press("p");
  await page.getByRole("button", { name: "Arena", exact: true }).click();
} else await page.getByRole("button", { name: "Arena", exact: true }).click();
await page.getByRole("button", { name: /03 \/ Marble Mayhem/ }).click();
await shot("survival-mid");
await page.keyboard.press("p");
const paused = await snap();
await page.waitForTimeout(700);
if ((await snap()).time !== paused.time) throw Error("Paused timer advanced");
await shot("pause");
await page.getByRole("button", { name: "Resume", exact: true }).click();
const route = [
  [320, 160],
  [600, 145],
  [650, 230],
  [800, 230],
  [850, 300],
  [850, 400],
  [740, 385],
  [430, 410],
  [150, 400],
];
let waypoint = 0,
  dashAt = 0,
  held = new Set(),
  collectedEnough = false;
const safeRoute = [
  [350, 340],
  [480, 430],
  [630, 430],
  [600, 270],
  [420, 160],
  [320, 260],
];
const end = Date.now() + 55000;
while (Date.now() < end) {
  const s = await snap();
  if (s.phase === "result") break;
  if (s.collected >= 4 && !collectedEnough) {
    collectedEnough = true;
    waypoint = 0;
  }
  const activeRoute = collectedEnough ? safeRoute : route;
  let [x, y] = activeRoute[waypoint % activeRoute.length];
  if (Math.hypot(s.x - x, s.y - y) < 25) {
    waypoint++;
    [x, y] = activeRoute[waypoint % activeRoute.length];
  }
  const threat = [...(s.hazards || [])]
    .filter((m) => m.warning <= 0)
    .sort(
      (a, b) =>
        Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y),
    )[0];
  if (
    threat &&
    Math.hypot(threat.x - s.x, threat.y - s.y) < 125 &&
    s.cooldown === 0
  ) {
    await page.mouse.click((threat.x / 960) * 800, (threat.y / 540) * 450);
    dashAt = Date.now();
  } else if (threat && Math.hypot(threat.x - s.x, threat.y - s.y) < 100) {
    const d = Math.hypot(threat.x - s.x, threat.y - s.y) || 1;
    x = Math.max(310, Math.min(640, s.x + ((s.x - threat.x) / d) * 130));
    y = Math.max(220, Math.min(450, s.y + ((s.y - threat.y) / d) * 130));
  }
  const wanted = new Set();
  if (Math.abs(x - s.x) > 10) wanted.add(x > s.x ? "d" : "a");
  if (Math.abs(y - s.y) > 10) wanted.add(y > s.y ? "s" : "w");
  for (const k of held) if (!wanted.has(k)) await page.keyboard.up(k);
  for (const k of wanted) if (!held.has(k)) await page.keyboard.down(k);
  held = wanted;
  if (
    Date.now() - dashAt > 1150 &&
    Math.hypot(s.x - x, s.y - y) > 80 &&
    (!threat || Math.hypot(threat.x - s.x, threat.y - s.y) > 180)
  ) {
    await page.mouse.click((x / 960) * 800, (y / 540) * 450);
    dashAt = Date.now();
  }
  await page.waitForTimeout(90);
}
for (const k of held) await page.keyboard.up(k);
await shot("survival-outcome");
reports.push({ case: "survival", snapshot: await snap() });
if ((await snap()).stars[2] < 1) throw Error("Survival did not complete");
await page.getByRole("button", { name: "Retry", exact: true }).click();
await page.waitForFunction(
  () => window.toyArena.snapshot().phase === "result",
  {},
  { timeout: 55000 },
);
await shot("survival-fail");
reports.push({ case: "survival-failure", snapshot: await snap() });
await page.getByRole("button", { name: "Retry", exact: true }).click();
if ((await snap()).hits !== 0) throw Error("Retry failed");
await page.keyboard.press("m");
await page.reload();
if (!(await snap()).muted) throw Error("Mute was not saved");
reports.push({ case: "save-after-reload", snapshot: await snap() });
for (const [width, height] of [
  [907, 510],
  [1920, 1080],
  [390, 844],
]) {
  await page.setViewportSize({ width, height });
  await page.reload();
  await page.screenshot({ path: out + `${width}x${height}-title.png` });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  if (overflow) throw Error("Horizontal overflow");
}
await page.setViewportSize({ width: 800, height: 450 });
await page.reload();
await shot("title-recheck");
await page
  .getByRole("button", { name: "Learn by driving", exact: true })
  .click();
await shot("tutorial-recheck");
await browser.close();
if (errors.length) throw Error(errors.join("\n"));
await fs.writeFile(
  new URL("./playtest-results.json", import.meta.url),
  JSON.stringify({ reports, errors }, null, 2),
);
console.log(JSON.stringify({ reports, errors }, null, 2));
