import { createRequire } from "node:module";
import fs from "node:fs/promises";
const require = createRequire(import.meta.url),
  { chromium } = require("playwright");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
const errors = [],
  reports = [],
  out = new URL("./ui/w2/", import.meta.url).pathname;
await fs.mkdir(out, { recursive: true });
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto(process.env.TOY_ARENA_URL || "http://127.0.0.1:4190/");
const snap = () => page.evaluate(() => window.toyArena.snapshot());
const shot = (name) => page.screenshot({ path: out + name + ".png" });
async function click(name) {
  await page.getByRole("button", { name, exact: true }).click();
}
async function steer(x, y, seconds = 9) {
  let held = new Set();
  const until = Date.now() + seconds * 1000;
  while (Date.now() < until) {
    const s = await snap();
    if (s.phase !== "playing") break;
    const dx = x - s.x,
      dy = y - s.y;
    if (Math.hypot(dx, dy) < 17) break;
    const wanted = new Set();
    if (Math.abs(dx) > 10) wanted.add(dx > 0 ? "d" : "a");
    if (Math.abs(dy) > 10) wanted.add(dy > 0 ? "s" : "w");
    for (const k of held) if (!wanted.has(k)) await page.keyboard.up(k);
    for (const k of wanted) if (!held.has(k)) await page.keyboard.down(k);
    held = wanted;
    await page.waitForTimeout(70);
  }
  for (const k of held) await page.keyboard.up(k);
}
async function dash(x, y) {
  await page.mouse.click((x * 800) / 960, (y * 450) / 540);
  await page.waitForTimeout(300);
}
await shot("800-title");
await click("Learn by driving");
await shot("800-tutorial");
await steer(280, 390);
await steer(365, 390);
await dash(420, 390);
await page.waitForFunction(() => window.toyArena.snapshot().practiceBlock);
await click("Start race");
for (let lap = 0; lap < 4; lap++) {
  await steer(280, 390);
  await steer(420, 210);
  await steer(680, 170);
  await steer(800, 330);
  await steer(670, 430);
  if (lap === 1) await shot("800-race-mid");
}
await page.waitForFunction(() => window.toyArena.snapshot().phase === "result");
reports.push({ case: "race-real-input", snapshot: await snap() });
await shot("800-race-result");
await click("Arena");
await click("Arenas");
await page.getByRole("button", { name: /02 \/ Stampede Station/ }).click();
for (let round = 0; round < 2; round++) {
  const blocks = (await snap()).blocks;
  // Route around walls, then mouse-dash each paper toy. No hidden writes.
  for (const b of blocks.sort((a, b) => a.x - b.x)) {
    const s = await snap();
    if ((s.x < 400 && b.x > 400) || (s.x > 400 && b.x < 400))
      await steer(410, 380);
    if (b.x > 650 && b.y > 340) {
      await steer(850, 280);
      await steer(850, 420);
    } else if (b.x < 300 && b.y < 260) {
      await steer(180, 300);
    }
    await steer(b.x - 48, b.y);
    await dash(b.x, b.y);
    await page.waitForTimeout(850);
  }
  await steer(520, 380);
  if (round === 1) await steer(220, 370);
  await steer(round === 0 ? 520 : 220, round === 0 ? 340 : 300);
  await page.waitForTimeout(5300);
  if (round === 0) await shot("800-capture-round2");
}
reports.push({ case: "capture-real-input", snapshot: await snap() });
await shot("800-capture-outcome");
if ((await snap()).phase === "playing") await page.keyboard.press("p");
await click("Arena");
await click("Garage");
await shot("800-garage");
await click("Sandbox test");
await shot("800-sandbox");
await page.keyboard.press("p");
await click("Test parts");
await page.getByRole("button", { name: /^Hauler / }).click();
await page.getByRole("button", { name: /^Spring / }).click();
await click("Resume");
await page.keyboard.press("e");
reports.push({ case: "sandbox-parts", snapshot: await snap() });
await page.keyboard.press("p");
const paused = await snap();
await page.waitForTimeout(600);
if ((await snap()).time !== paused.time) throw Error("Pause advanced");
await click("Arena");
await click("Settings & credits");
await shot("800-settings");
await page.locator("#volume").fill("35");
await click("High contrast: off");
await click("Sound on");
await page.reload();
reports.push({ case: "saved-settings-reload", snapshot: await snap() });
for (const [width, height] of [
  [640, 360],
  [907, 510],
  [1920, 1080],
]) {
  await page.setViewportSize({ width, height });
  await page.reload();
  await shot(`${width}-title`);
  await click("Arenas");
  await shot(`${width}-arenas`);
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Overflow");
}
await browser.close();
await fs.writeFile(
  new URL("./w2-results.json", import.meta.url),
  JSON.stringify(
    {
      reports,
      errors,
      note: "Actual keyboard/mouse automation; not unfamiliar human comprehension.",
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ reports, errors }, null, 2));
