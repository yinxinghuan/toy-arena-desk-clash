import { createRequire } from "node:module";
import fs from "node:fs/promises";
const require = createRequire(import.meta.url),
  { chromium } = require("playwright");
const browser = await chromium.launch({ headless: true }),
  page = await browser.newPage({ viewport: { width: 800, height: 450 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const base = process.env.TOY_ARENA_URL || "http://127.0.0.1:4187/";
await page.goto(base);
await page.getByRole("button", { name: /01 \/ Tape Sprint/ }).click();
const snap = () => page.evaluate(() => window.toyArena.snapshot());
async function steer(x, y) {
  let held = new Set();
  const until = Date.now() + 9000;
  while (Date.now() < until) {
    const s = await snap();
    if (s.phase !== "playing") throw Error("Unexpected pause while driving");
    if (Math.hypot(x - s.x, y - s.y) < 15) break;
    const wanted = new Set();
    if (Math.abs(x - s.x) > 10) wanted.add(x > s.x ? "d" : "a");
    if (Math.abs(y - s.y) > 10) wanted.add(y > s.y ? "s" : "w");
    for (const k of held) if (!wanted.has(k)) await page.keyboard.up(k);
    for (const k of wanted) if (!held.has(k)) await page.keyboard.down(k);
    held = wanted;
    await page.waitForTimeout(70);
  }
  for (const k of held) await page.keyboard.up(k);
}
await steer(130, 110);
await page.waitForTimeout(300);
await steer(680, 110);
await page.waitForTimeout(250);
await steer(680, 170);
await page.waitForFunction(
  () => window.toyArena.snapshot().gateHintRemaining > 0,
);
if (
  !(await page.locator("#objective").textContent()).includes(
    "Wrong order — Next: Gate 1",
  )
)
  throw Error("Wrong gate feedback missing");
const wrongGate = await snap();
await page.screenshot({
  path: new URL("./ui/800x450-wrong-gate-recheck.png", import.meta.url)
    .pathname,
});
// Test a missed-event focus contract by overriding the focus getter only.
// This is explicitly NOT native Chrome/window evidence; no game state is written.
await page.evaluate(() => {
  window.__originalHasFocus = document.hasFocus.bind(document);
  document.hasFocus = () => false;
});
await page.waitForFunction(() => window.toyArena.snapshot().phase === "paused");
const focusLost = await snap();
await page.waitForTimeout(500);
const frozen = await snap();
if (frozen.time !== focusLost.time)
  throw Error("Focus watchdog failed to freeze");
await page.screenshot({
  path: new URL("./ui/800x450-focus-watchdog-recheck.png", import.meta.url)
    .pathname,
});
await page.evaluate(() => {
  document.hasFocus = window.__originalHasFocus;
});
await page.waitForTimeout(200);
if ((await snap()).phase !== "paused") throw Error("Focus return auto-resumed");
await page.getByRole("button", { name: "Resume", exact: true }).click();
await page.waitForFunction(
  () => window.toyArena.snapshot().phase === "playing",
);
await browser.close();
if (errors.length) throw Error(errors.join("\n"));
const report = {
  base,
  bundle: "index-DslnUBtA.js",
  wrongGate,
  focusLost,
  frozen,
  errors,
  note: "Gate route uses normal keyboard input. Focus watchdog check stubs document.hasFocus without blur; it proves the missed-event contract only. Native Chrome regression is a separate coordinator lane.",
};
await fs.writeFile(
  new URL("./focus-gate-results.json", import.meta.url),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
